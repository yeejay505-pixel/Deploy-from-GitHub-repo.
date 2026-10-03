import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';

const ENV_FILE = new URL('./.env.local', import.meta.url);

async function loadLocalEnv() {
  try {
    const txt = await fs.readFile(ENV_FILE, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

await loadLocalEnv();

const BRIDGE_URL = (process.env.DXB_BRIDGE_URL || 'https://dxbinteract-worker-production.up.railway.app').replace(/\/$/, '');
const AGENT_KEY = process.env.DXB_LOCAL_AGENT_KEY || '';
const CDP_URL = process.env.CHROME_CDP_URL || 'http://127.0.0.1:9222';
const AGENT_ID = process.env.DXB_AGENT_ID || `mac-${os.hostname()}`;
const POLL_MS = Number(process.env.DXB_POLL_MS || 3000);
const HISTORY_URL = process.env.DXB_HISTORY_URL || 'https://dxbinteract.com/dubai-property-prices';

if (!AGENT_KEY) {
  console.error('Missing DXB_LOCAL_AGENT_KEY. Put it in .env.local; do not paste it into chat.');
  process.exit(1);
}

let browser;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function api(path, options = {}) {
  const res = await fetch(BRIDGE_URL + path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-agent-key': AGENT_KEY,
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) return null;
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }

  if (!res.ok) {
    const err = new Error(`Bridge HTTP ${res.status}`);
    err.body = body;
    throw err;
  }
  return body;
}

async function connectChrome() {
  if (browser?.isConnected()) return browser;
  browser = await chromium.connectOverCDP(CDP_URL);
  return browser;
}

async function getPage({ openIfMissing = true } = {}) {
  const b = await connectChrome();
  const contexts = b.contexts();
  if (!contexts.length) throw new Error('NO_CHROME_CONTEXT');

  const pages = contexts.flatMap((c) => c.pages());
  let page = pages.find((p) => {
    try { return new URL(p.url()).hostname.endsWith('dxbinteract.com'); } catch { return false; }
  });

  if (!page && openIfMissing) {
    page = await contexts[0].newPage();
    await page.goto(HISTORY_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
  if (!page) throw new Error('DXB_PAGE_NOT_FOUND');
  return page;
}

async function detectState(page) {
  const title = await page.title().catch(() => '');
  const url = page.url();
  const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 20000);
  const low = (title + '\n' + body).toLowerCase();

  if (/just a moment|checking your browser|verify you are human|performing security verification|cloudflare/.test(low)) {
    return { status: 'AUTH_REQUIRED', reason: 'CLOUDFLARE_CHALLENGE', title, url };
  }
  if (/sign in|log in|login to continue|please login/.test(low) || /login|sign-in|signin|auth/.test(url.toLowerCase())) {
    return { status: 'AUTH_REQUIRED', reason: 'DXB_LOGIN_REQUIRED', title, url };
  }
  return { status: 'OK', title, url };
}

async function discovery(page) {
  const state = await detectState(page);
  const controls = await page.locator('input,button,select,textarea,[role="button"],[role="combobox"]').evaluateAll((els) =>
    els.slice(0, 180).map((el, index) => ({
      index,
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      id: el.id || null,
      placeholder: el.getAttribute('placeholder'),
      ariaLabel: el.getAttribute('aria-label'),
      role: el.getAttribute('role'),
      text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180),
      visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
    }))
  ).catch(() => []);

  const headings = await page.locator('h1,h2,h3,label').allTextContents().catch(() => []);
  return {
    ...state,
    controls,
    headings: headings.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 80),
  };
}

async function maybeChooseApartment(page) {
  const selectCount = await page.locator('select').count();
  for (let i = 0; i < selectCount; i++) {
    const sel = page.locator('select').nth(i);
    const options = await sel.locator('option').allTextContents().catch(() => []);
    const opt = options.find((x) => /apartment/i.test(x));
    if (opt) {
      await sel.selectOption({ label: opt }).catch(() => {});
      return { ok: true, method: 'select' };
    }
  }

  const apartment = page.getByText(/apartment/i).filter({ visible: true }).first();
  if (await apartment.count()) {
    await apartment.click().catch(() => {});
    return { ok: true, method: 'text' };
  }
  return { ok: false };
}

async function findInput(page, regex) {
  const inputs = page.locator('input');
  const count = await inputs.count();
  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const meta = [
      await input.getAttribute('placeholder'),
      await input.getAttribute('name'),
      await input.getAttribute('id'),
      await input.getAttribute('aria-label')
    ].filter(Boolean).join(' ');
    if (regex.test(meta)) return input;
  }
  return null;
}

async function fillSmart(input, value, page) {
  await input.fill(String(value));
  await page.waitForTimeout(700);

  const exact = page.getByText(String(value), { exact: true }).first();
  if (await exact.count()) {
    await exact.click().catch(() => {});
  } else {
    await input.press('ArrowDown').catch(() => {});
    await input.press('Enter').catch(() => {});
  }
}

async function clickSearch(page) {
  const button = page.getByRole('button', { name: /search|view|show|apply|submit/i }).first();
  if (await button.count()) {
    await button.click();
    return true;
  }
  const generic = page.locator('button,input[type="submit"]').filter({ hasText: /search|view|show|apply/i }).first();
  if (await generic.count()) {
    await generic.click();
    return true;
  }
  return false;
}

async function extractRows(page) {
  const rows = await page.locator('table tbody tr').evaluateAll((trs) =>
    trs.slice(0, 250).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => (td.innerText || td.textContent || '').replace(/\s+/g, ' ').trim())
    )
  ).catch(() => []);

  if (rows.length) return rows;

  const candidates = await page.locator('[role="row"], .transaction, .history-item, .property-history-item').allTextContents().catch(() => []);
  return candidates.map((x) => [x.replace(/\s+/g, ' ').trim()]).filter((x) => x[0]).slice(0, 250);
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

function summarizeRows(rows, ownerSourceDate) {
  const transactions = [];
  for (const cells of rows) {
    const joined = cells.join(' | ');
    const dateMatch = joined.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/);
    const priceMatches = [...joined.matchAll(/(?:AED\s*)?([0-9][0-9,]{4,})(?:\s*AED)?/gi)];
    const isSale = /sale|sold|transfer|purchase/i.test(joined);
    const isRent = /rent|lease|tenancy/i.test(joined);
    if (!dateMatch && !isSale && !isRent) continue;
    transactions.push({
      type: isSale ? 'SALE' : isRent ? 'RENT' : 'UNKNOWN',
      date: dateMatch ? dateMatch[1] : null,
      amountAED: priceMatches.length ? parseNumber(priceMatches.at(-1)[1]) : null,
      raw: joined.slice(0, 700),
    });
  }

  const sales = transactions.filter((x) => x.type === 'SALE' && parseDate(x.date))
    .sort((a,b) => parseDate(b.date) - parseDate(a.date));
  const rents = transactions.filter((x) => x.type === 'RENT' && parseDate(x.date))
    .sort((a,b) => parseDate(b.date) - parseDate(a.date));

  const latestSale = sales[0] || null;
  const latestRent = rents[0] || null;
  const saleDate = parseDate(latestSale?.date);
  const sourceDate = parseDate(ownerSourceDate);
  const saleAfterSource = saleDate && sourceDate ? (saleDate > sourceDate ? 'Yes' : 'No') : 'Unknown';

  return {
    transactions,
    latestSaleDate: latestSale?.date || null,
    latestSalePriceAED: latestSale?.amountAED ?? null,
    latestRentDate: latestRent?.date || null,
    latestAnnualRentAED: latestRent?.amountAED ?? null,
    saleAfterSource,
  };
}

async function runVerify(payload) {
  const page = await getPage();
  const state = await detectState(page);
  if (state.status !== 'OK') return { ...state, sourceStatus: 'SOURCE_UNAVAILABLE' };

  if (!/dubai-property-prices/i.test(page.url())) {
    await page.goto(HISTORY_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(600);
  }

  const state2 = await detectState(page);
  if (state2.status !== 'OK') return { ...state2, sourceStatus: 'SOURCE_UNAVAILABLE' };

  const building = String(payload.building || '').trim();
  const unitNumber = String(payload.unitNumber || '').trim();
  const propertyNo = String(payload.propertyNo || '').trim();
  if (!building || !unitNumber) return { status: 'INVALID_INPUT', required: ['building','unitNumber'] };

  await maybeChooseApartment(page);

  const projectInput = await findInput(page, /project|building|area/i);
  if (!projectInput) {
    return { status: 'SELECTOR_MAPPING_REQUIRED', missing: 'project/building input', discovery: await discovery(page) };
  }
  await fillSmart(projectInput, building, page);

  const propertyNoInput = await findInput(page, /property.*(no|number)|property_no/i);
  const unitInput = await findInput(page, /unit.*(no|number)|unit_no/i);

  if (propertyNo && propertyNoInput) {
    await fillSmart(propertyNoInput, propertyNo, page);
  } else if (unitInput) {
    await fillSmart(unitInput, unitNumber, page);
  } else if (!propertyNo) {
    return {
      status: 'PROPERTY_MAPPING_REQUIRED',
      sourceStatus: 'UNIT_MAPPING_REQUIRED',
      building,
      unitNumber,
      discovery: await discovery(page),
    };
  } else {
    return { status: 'SELECTOR_MAPPING_REQUIRED', missing: 'property number input', discovery: await discovery(page) };
  }

  if (!(await clickSearch(page))) {
    return { status: 'SELECTOR_MAPPING_REQUIRED', missing: 'search button', discovery: await discovery(page) };
  }

  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(900);

  const postState = await detectState(page);
  if (postState.status !== 'OK') return { ...postState, sourceStatus: 'SOURCE_UNAVAILABLE' };

  const rows = await extractRows(page);
  if (!rows.length) {
    return {
      status: 'NO_EXACT_HISTORY_RETURNED',
      sourceStatus: 'NO_DATA',
      exactUnitMatch: false,
      matchConfidence: 0,
      historyCoverage: 'NONE',
      building,
      unitNumber,
      propertyNo: propertyNo || null,
    };
  }

  const pageText = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const exactSignal = propertyNo
    ? pageText.includes(propertyNo)
    : new RegExp(`\\b${unitNumber.replace(/[.*+?^$\{\}()|[\\]\\\\]/g, '\\$&')}\\b`).test(pageText);

  if (!exactSignal) {
    return {
      status: 'AMBIGUOUS_RESULT',
      sourceStatus: 'COMPARABLE_ONLY',
      exactUnitMatch: false,
      matchConfidence: 0,
      building,
      unitNumber,
      propertyNo: propertyNo || null,
      rows: rows.slice(0, 25),
    };
  }

  const summary = summarizeRows(rows, payload.ownerSourceDate || null);
  return {
    status: 'SUCCESS',
    sourceAdapter: 'DXBINTERACT',
    sourceMethod: 'LOCAL_CHROME_EXACT_PROPERTY_HISTORY',
    sourceAuthority: 'DXBinteract — authorized local Chrome session',
    sourceStatus: 'LIVE_EXACT_EVIDENCE',
    authSessionStatus: 'OK',
    building,
    unitNumber,
    propertyNo: propertyNo || null,
    exactUnitMatch: true,
    matchStatus: 'EXACT_MATCH',
    matchConfidence: 100,
    historyCoverage: 'COMPLETE',
    ...summary,
    checkedAt: new Date().toISOString(),
  };
}

async function executeJob(job) {
  if (job.action === 'DISCOVER') {
    const page = await getPage();
    return await discovery(page);
  }
  if (job.action === 'SESSION_CHECK') {
    const page = await getPage();
    return await detectState(page);
  }
  if (job.action === 'VERIFY_UNIT') {
    return await runVerify(job.payload || {});
  }
  return { status: 'INVALID_ACTION', action: job.action };
}

async function report(jobId, ok, result, error = null) {
  await api('/agent/result', {
    method: 'POST',
    body: JSON.stringify({ jobId, ok, result, error }),
  });
}

console.log(`[DXB local agent] starting as ${AGENT_ID}`);
console.log(`[DXB local agent] bridge: ${BRIDGE_URL}`);
console.log(`[DXB local agent] Chrome CDP: ${CDP_URL}`);

while (true) {
  try {
    const job = await api('/agent/lease', {
      method: 'POST',
      body: JSON.stringify({ agentId: AGENT_ID }),
    });

    if (!job) {
      await sleep(POLL_MS);
      continue;
    }

    console.log(`[DXB local agent] leased ${job.id} (${job.action})`);
    try {
      const result = await executeJob(job);
      await report(job.id, true, result);
      console.log(`[DXB local agent] completed ${job.id}: ${result.status || 'OK'}`);
    } catch (error) {
      await report(job.id, false, null, {
        code: error?.message || 'LOCAL_AGENT_ERROR',
        message: String(error?.message || error),
      }).catch(() => {});
      console.error(`[DXB local agent] failed ${job.id}:`, error?.message || error);
      if (/ECONNREFUSED|connectOverCDP|NO_CHROME_CONTEXT/.test(String(error?.message || error))) {
        browser = null;
      }
    }
  } catch (error) {
    console.error('[DXB local agent] bridge error:', error?.body || error?.message || error);
    await sleep(Math.max(POLL_MS, 5000));
  }
}
