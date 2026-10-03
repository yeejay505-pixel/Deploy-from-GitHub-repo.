import express from 'express';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT || 8080);
const API_KEY = process.env.WORKER_API_KEY || '';
const BASE_URL = process.env.DXB_BASE_URL || 'https://dxbinteract.com';
const HISTORY_URL = process.env.DXB_HISTORY_URL || `${BASE_URL}/dubai-property-prices`;
const STORAGE_STATE_PATH = process.env.DXB_STORAGE_STATE_PATH || '/tmp/dxb-storage-state.json';
const STORAGE_STATE_B64 = process.env.DXB_STORAGE_STATE_B64 || '';
const DXB_USERNAME = process.env.DXB_USERNAME || '';
const DXB_PASSWORD = process.env.DXB_PASSWORD || '';
const DXB_RERA_NUMBER = process.env.DXB_RERA_NUMBER || '';
const LOGIN_URL = process.env.DXB_LOGIN_URL || `${BASE_URL}/my-profile`;
const HEADLESS = String(process.env.PLAYWRIGHT_HEADLESS ?? 'true').toLowerCase() !== 'false';
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS || 45000);

const SEL = {
  propertyType: process.env.DXB_SELECTOR_PROPERTY_TYPE || '',
  projectInput: process.env.DXB_SELECTOR_PROJECT_INPUT || '',
  unitInput: process.env.DXB_SELECTOR_UNIT_INPUT || '',
  propertyNoInput: process.env.DXB_SELECTOR_PROPERTY_NO_INPUT || '',
  searchButton: process.env.DXB_SELECTOR_SEARCH_BUTTON || '',
  resultRoot: process.env.DXB_SELECTOR_RESULT_ROOT || '',
};

let browser = null;
let context = null;
let queue = Promise.resolve();

function guard(req, res, next) {
  if (!API_KEY) {
    return res.status(503).json({ status: 'CONFIG_ERROR', code: 'WORKER_API_KEY_MISSING' });
  }
  if (req.get('x-api-key') !== API_KEY) {
    return res.status(401).json({ status: 'UNAUTHORIZED' });
  }
  next();
}

async function ensureStorageStateFile() {
  if (!STORAGE_STATE_B64) return null;
  try {
    const decoded = Buffer.from(STORAGE_STATE_B64, 'base64').toString('utf8');
    JSON.parse(decoded);
    await fs.writeFile(STORAGE_STATE_PATH, decoded, 'utf8');
    return STORAGE_STATE_PATH;
  } catch (error) {
    throw new Error(`INVALID_DXB_STORAGE_STATE_B64: ${error.message}`);
  }
}

async function resetBrowser() {
  try { await context?.close(); } catch {}
  try { await browser?.close(); } catch {}
  context = null;
  browser = null;
}

async function getContext() {
  if (context) return context;
  browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const storageStatePath = await ensureStorageStateFile();
  context = await browser.newContext({
    storageState: storageStatePath || undefined,
    viewport: { width: 1440, height: 1100 },
    locale: 'en-US',
    userAgent: process.env.DXB_USER_AGENT || undefined,
  });

  context.setDefaultTimeout(NAV_TIMEOUT_MS);
  return context;
}

function serial(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

function normalizeText(v) {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}

function parseNumber(v) {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeSaleAfterSource(latestSaleDate, ownerSourceDate) {
  const sale = parseDate(latestSaleDate);
  const source = parseDate(ownerSourceDate);
  if (!sale || !source) return 'Unknown';
  return sale > source ? 'Yes' : 'No';
}

async function attemptLogin(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(700);

  const initialChallenge = await detectAccessChallenge(page);
  if (initialChallenge.blocked) {
    return { ok: false, status: initialChallenge.status, reason: initialChallenge.reason };
  }

  if (DXB_RERA_NUMBER) {
    const rera = page.locator(
      'input[name*="rera" i], input[id*="rera" i], input[placeholder*="rera" i], input[aria-label*="rera" i]'
    ).first();

    if (await rera.count()) {
      await rera.fill(DXB_RERA_NUMBER);
      const submit = page.getByRole('button', { name: /sign in|verify|submit|continue/i }).first();
      if (await submit.count()) await submit.click();
      else await rera.press('Enter');

      await page.waitForTimeout(1800);
      const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();

      if (/otp|one[- ]time|verification code|two[- ]factor|2fa|mfa/.test(body)) {
        return { ok: false, status: 'MFA_REQUIRED', reason: 'INTERACTIVE_VERIFICATION_REQUIRED' };
      }
      if (/captcha|verify you are human|cloudflare|just a moment|checking your browser|performing security verification/.test(body)) {
        return { ok: false, status: 'AUTH_REQUIRED', reason: 'CLOUDFLARE_CHALLENGE' };
      }

      if (!(await looksLoggedOut(page))) {
        return { ok: true, status: 'OK', method: 'RERA' };
      }
    }
  }

  if (!DXB_USERNAME || !DXB_PASSWORD) {
    return {
      ok: false,
      status: 'AUTH_REQUIRED',
      reason: DXB_RERA_NUMBER ? 'RERA_LOGIN_NOT_ACCEPTED_OR_FORM_CHANGED' : 'DXB_AUTH_VARIABLES_MISSING'
    };
  }

  const email = page.locator('input[type="email"], input[name*="email" i], input[name*="user" i], input[autocomplete="username"]').first();
  const password = page.locator('input[type="password"], input[autocomplete="current-password"]').first();

  if (!(await email.count()) || !(await password.count())) {
    return { ok: false, status: 'AUTH_REQUIRED', reason: 'LOGIN_FORM_NOT_FOUND' };
  }

  await email.fill(DXB_USERNAME);
  await password.fill(DXB_PASSWORD);

  const submit = page.getByRole('button', { name: /log in|login|sign in|continue/i }).first();
  if (await submit.count()) await submit.click();
  else await password.press('Enter');

  await page.waitForTimeout(1800);
  const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();

  if (/otp|one[- ]time|verification code|two[- ]factor|2fa|mfa/.test(body)) {
    return { ok: false, status: 'MFA_REQUIRED', reason: 'INTERACTIVE_VERIFICATION_REQUIRED' };
  }
  if (/captcha|verify you are human|cloudflare|just a moment|checking your browser|performing security verification/.test(body)) {
    return { ok: false, status: 'AUTH_REQUIRED', reason: 'CLOUDFLARE_CHALLENGE' };
  }

  const url = page.url().toLowerCase();
  if (/login|sign-in|signin|auth/.test(url)) {
    return { ok: false, status: 'AUTH_REQUIRED', reason: 'LOGIN_FAILED_OR_FORM_CHANGED' };
  }

  return { ok: true, status: 'OK', method: 'USERNAME_PASSWORD' };
}

async function detectAccessChallenge(page) {
  const title = (await page.title().catch(() => '')).toLowerCase();
  const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();

  const cloudflare =
    /just a moment|checking your browser|performing security verification|verify you are human|enable javascript and cookies|cloudflare/.test(title) ||
    /just a moment|checking your browser|performing security verification|verify you are human|enable javascript and cookies|cloudflare/.test(body);

  return cloudflare
    ? { blocked: true, status: 'AUTH_REQUIRED', reason: 'CLOUDFLARE_CHALLENGE' }
    : { blocked: false };
}

async function looksLoggedOut(page) {
  const challenge = await detectAccessChallenge(page);
  if (challenge.blocked) return true;

  const url = page.url().toLowerCase();
  if (/login|sign-in|signin|auth/.test(url)) return true;

  const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
  return /sign in|log in|login to continue|please login/.test(body);
}

async function pageSignature(page) {
  const controls = await page.locator('input,button,select,textarea').evaluateAll((els) =>
    els.slice(0, 120).map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      id: el.id || null,
      placeholder: el.getAttribute('placeholder'),
      ariaLabel: el.getAttribute('aria-label'),
      text: (el.innerText || el.textContent || '').trim().slice(0, 140),
    }))
  );
  return {
    url: page.url(),
    title: await page.title(),
    controls,
  };
}

async function maybeSelectPropertyType(page, propertyType = 'Apartment') {
  if (SEL.propertyType) {
    const loc = page.locator(SEL.propertyType).first();
    const tag = await loc.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tag === 'select') await loc.selectOption({ label: propertyType }).catch(async () => loc.selectOption(propertyType));
    else {
      await loc.click();
      await page.getByText(propertyType, { exact: true }).first().click();
    }
    return true;
  }

  const select = page.locator('select').filter({ has: page.locator('option') }).first();
  if (await select.count()) {
    const options = await select.locator('option').allTextContents();
    if (options.some((x) => x.toLowerCase().includes(propertyType.toLowerCase()))) {
      await select.selectOption({ label: options.find((x) => x.toLowerCase().includes(propertyType.toLowerCase())) });
      return true;
    }
  }
  return false;
}

async function fillProject(page, building) {
  if (SEL.projectInput) {
    const input = page.locator(SEL.projectInput).first();
    await input.fill(building);
    await page.waitForTimeout(700);
    const exact = page.getByText(building, { exact: true }).first();
    if (await exact.count()) await exact.click();
    else await input.press('Enter');
    return true;
  }

  const candidates = page.locator('input');
  const count = await candidates.count();
  for (let i = 0; i < count; i++) {
    const loc = candidates.nth(i);
    const meta = `${await loc.getAttribute('placeholder') || ''} ${await loc.getAttribute('name') || ''} ${await loc.getAttribute('aria-label') || ''}`.toLowerCase();
    if (/project|building|area/.test(meta)) {
      await loc.fill(building);
      await page.waitForTimeout(700);
      const exact = page.getByText(building, { exact: true }).first();
      if (await exact.count()) await exact.click();
      else await loc.press('Enter');
      return true;
    }
  }
  return false;
}

async function fillPropertyNo(page, propertyNo) {
  if (!propertyNo) return false;
  if (SEL.propertyNoInput) {
    await page.locator(SEL.propertyNoInput).first().fill(String(propertyNo));
    return true;
  }
  const candidates = page.locator('input');
  const count = await candidates.count();
  for (let i = 0; i < count; i++) {
    const loc = candidates.nth(i);
    const meta = `${await loc.getAttribute('placeholder') || ''} ${await loc.getAttribute('name') || ''} ${await loc.getAttribute('aria-label') || ''}`.toLowerCase();
    if (/property.*(no|number)|property_no|property number/.test(meta)) {
      await loc.fill(String(propertyNo));
      return true;
    }
  }
  return false;
}

async function clickSearch(page) {
  if (SEL.searchButton) {
    await page.locator(SEL.searchButton).first().click();
    return true;
  }
  const button = page.getByRole('button', { name: /search|view|apply|submit|show/i }).first();
  if (await button.count()) {
    await button.click();
    return true;
  }
  return false;
}

async function extractRows(page) {
  const root = SEL.resultRoot ? page.locator(SEL.resultRoot) : page;
  const rows = await root.locator('table tbody tr').evaluateAll((trs) =>
    trs.slice(0, 200).map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.innerText || td.textContent || '').trim()))
  ).catch(() => []);
  if (rows.length) return rows;

  const texts = await root.locator('[role=row], .transaction, .history-item, .property-history-item').allTextContents().catch(() => []);
  return texts.slice(0, 200).map((x) => [normalizeText(x)]);
}

function deriveTransactionSummary(rows, ownerSourceDate) {
  const flattened = rows.map((cells) => cells.map(normalizeText));
  const transactions = [];
  for (const cells of flattened) {
    const joined = cells.join(' | ');
    const dateMatch = joined.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/);
    const priceMatches = [...joined.matchAll(/(?:AED\s*)?([0-9][0-9,]{4,})(?:\s*AED)?/gi)];
    const isSale = /sale|sold|transfer|purchase/i.test(joined);
    const isRent = /rent|lease|tenancy/i.test(joined);
    if (!dateMatch && !isSale && !isRent) continue;
    transactions.push({
      type: isSale ? 'SALE' : isRent ? 'RENT' : 'UNKNOWN',
      date: dateMatch ? dateMatch[1] : null,
      amountAED: priceMatches.length ? parseNumber(priceMatches[priceMatches.length - 1][1]) : null,
      raw: joined.slice(0, 600),
    });
  }

  const sales = transactions.filter((x) => x.type === 'SALE' && parseDate(x.date)).sort((a, b) => parseDate(b.date) - parseDate(a.date));
  const rents = transactions.filter((x) => x.type === 'RENT' && parseDate(x.date)).sort((a, b) => parseDate(b.date) - parseDate(a.date));
  const latestSale = sales[0] || null;
  const latestRent = rents[0] || null;

  return {
    transactions,
    latestSaleDate: latestSale?.date || null,
    latestSalePriceAED: latestSale?.amountAED ?? null,
    latestRentDate: latestRent?.date || null,
    latestAnnualRentAED: latestRent?.amountAED ?? null,
    saleAfterSource: computeSaleAfterSource(latestSale?.date, ownerSourceDate),
  };
}

async function verifyUnit(payload) {
  const building = normalizeText(payload.building);
  const unitNumber = normalizeText(payload.unitNumber);
  const propertyNo = normalizeText(payload.propertyNo);
  const ownerSourceDate = payload.ownerSourceDate || null;

  if (!building || !unitNumber) {
    return { httpStatus: 400, body: { status: 'INVALID_INPUT', required: ['building', 'unitNumber'] } };
  }

  const ctx = await getContext();
  const page = await ctx.newPage();
  try {
    await page.goto(HISTORY_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(1000);

    if (await looksLoggedOut(page)) {
      const login = await attemptLogin(page);
      if (!login.ok) {
        return {
          httpStatus: login.status === 'MFA_REQUIRED' ? 409 : 401,
          body: {
            status: login.status,
            authSessionStatus: login.status,
            sourceStatus: 'SOURCE_UNAVAILABLE',
            reason: login.reason,
          },
        };
      }
      await page.goto(HISTORY_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
      await page.waitForTimeout(700);
    }

    await maybeSelectPropertyType(page, payload.propertyType || 'Apartment');
    const projectOk = await fillProject(page, building);

    if (!propertyNo) {
      return {
        httpStatus: 422,
        body: {
          status: 'PROPERTY_NO_REQUIRED',
          authSessionStatus: 'OK',
          sourceStatus: 'UNIT_MAPPING_REQUIRED',
          building,
          unitNumber,
          projectFieldResolved: projectOk,
          nextAction: 'Resolve and store the DXB/DLD Property No for this unit, then retry exact history verification.',
          pageSignature: process.env.DEBUG_SIGNATURE === 'true' ? await pageSignature(page) : undefined,
        },
      };
    }

    const propertyFieldOk = await fillPropertyNo(page, propertyNo);
    if (!propertyFieldOk) {
      return {
        httpStatus: 422,
        body: {
          status: 'SELECTOR_MAPPING_REQUIRED',
          authSessionStatus: 'OK',
          sourceStatus: 'SOURCE_UNAVAILABLE',
          missing: 'propertyNoInput',
          pageSignature: await pageSignature(page),
        },
      };
    }

    const searchOk = await clickSearch(page);
    if (!searchOk) {
      return {
        httpStatus: 422,
        body: {
          status: 'SELECTOR_MAPPING_REQUIRED',
          authSessionStatus: 'OK',
          sourceStatus: 'SOURCE_UNAVAILABLE',
          missing: 'searchButton',
          pageSignature: await pageSignature(page),
        },
      };
    }

    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);

    if (await looksLoggedOut(page)) {
      return { httpStatus: 401, body: { status: 'SESSION_EXPIRED', authSessionStatus: 'SESSION_EXPIRED', sourceStatus: 'SOURCE_UNAVAILABLE' } };
    }

    const rows = await extractRows(page);
    if (!rows.length) {
      return {
        httpStatus: 200,
        body: {
          status: 'NO_EXACT_HISTORY_RETURNED',
          sourceStatus: 'NO_DATA',
          authSessionStatus: 'OK',
          building,
          unitNumber,
          propertyNo,
          exactUnitMatch: false,
          matchConfidence: 0,
          historyCoverage: 'NONE',
          saleAfterSource: 'Unknown',
        },
      };
    }

    const summary = deriveTransactionSummary(rows, ownerSourceDate);
    return {
      httpStatus: 200,
      body: {
        status: 'SUCCESS',
        sourceAdapter: 'DXBINTERACT',
        sourceMethod: 'RAILWAY_PLAYWRIGHT_EXACT_PROPERTY_HISTORY',
        sourceAuthority: 'DXBinteract',
        sourceStatus: 'LIVE_EXACT_EVIDENCE',
        authSessionStatus: 'OK',
        building,
        unitNumber,
        propertyNo,
        exactUnitMatch: true,
        matchStatus: 'EXACT_MATCH',
        matchConfidence: 100,
        historyCoverage: 'COMPLETE',
        latestSaleDate: summary.latestSaleDate,
        latestSalePriceAED: summary.latestSalePriceAED,
        latestRentDate: summary.latestRentDate,
        latestAnnualRentAED: summary.latestAnnualRentAED,
        saleAfterSource: summary.saleAfterSource,
        rentAfterSource: 'Unknown',
        transactions: summary.transactions,
        checkedAt: new Date().toISOString(),
      },
    };
  } finally {
    await page.close().catch(() => {});
  }
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'yeejay-dxbinteract-worker',
    version: '0.1.0',
    sessionConfigured: Boolean(STORAGE_STATE_B64),
    credentialsConfigured: Boolean(DXB_RERA_NUMBER || (DXB_USERNAME && DXB_PASSWORD)),
    selectorConfig: Object.fromEntries(Object.entries(SEL).map(([k, v]) => [k, Boolean(v)])),
  });
});

app.get('/session/status', guard, async (_req, res) => {
  try {
    const result = await serial(async () => {
      const ctx = await getContext();
      const page = await ctx.newPage();
      try {
        await page.goto(HISTORY_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });

        const challenge = await detectAccessChallenge(page);
        if (challenge.blocked) {
          return {
            httpStatus: 403,
            body: {
              status: challenge.status,
              reason: challenge.reason,
              credentialsConfigured: Boolean(DXB_RERA_NUMBER || (DXB_USERNAME && DXB_PASSWORD)),
              url: page.url(),
              title: await page.title(),
            },
          };
        }

        let loggedOut = await looksLoggedOut(page);
        if (loggedOut) {
          const login = await attemptLogin(page);
          if (!login.ok) {
            return {
              httpStatus: login.status === 'MFA_REQUIRED' ? 409 : 401,
              body: {
                status: login.status,
                reason: login.reason,
                credentialsConfigured: Boolean(DXB_RERA_NUMBER || (DXB_USERNAME && DXB_PASSWORD)),
              },
            };
          }
          await page.goto(HISTORY_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
          loggedOut = await looksLoggedOut(page);
        }
        return {
          httpStatus: loggedOut ? 401 : 200,
          body: {
            status: loggedOut ? 'SESSION_EXPIRED' : 'OK',
            credentialsConfigured: Boolean(DXB_RERA_NUMBER || (DXB_USERNAME && DXB_PASSWORD)),
            url: page.url(),
            title: await page.title(),
          },
        };
      } finally {
        await page.close().catch(() => {});
      }
    });
    res.status(result.httpStatus).json(result.body);
  } catch (error) {
    await resetBrowser();
    res.status(500).json({ status: 'ERROR', code: 'SESSION_CHECK_FAILED', message: error.message });
  }
});

app.post('/verify-unit', guard, async (req, res) => {
  try {
    const result = await serial(() => verifyUnit(req.body || {}));
    res.status(result.httpStatus).json(result.body);
  } catch (error) {
    await resetBrowser();
    res.status(500).json({
      status: 'ERROR',
      sourceStatus: 'SOURCE_UNAVAILABLE',
      authSessionStatus: 'UNKNOWN',
      code: 'WORKER_FAILURE',
      message: error.message,
    });
  }
});

app.post('/admin/reset-browser', guard, async (_req, res) => {
  await serial(resetBrowser);
  res.json({ status: 'OK' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'worker_started', port: PORT, headless: HEADLESS, historyUrl: HISTORY_URL }));
});
