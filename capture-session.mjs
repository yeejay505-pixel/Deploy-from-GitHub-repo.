import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import process from 'node:process';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();

console.log('\nOpening DXBinteract in a fresh Playwright browser...');
await page.goto('https://dxbinteract.com/dubai-property-prices', { waitUntil: 'domcontentloaded' });

console.log('\n1) Log in to DXBinteract in the opened browser window.');
console.log('2) Navigate to Property History if needed and confirm you are fully signed in.');
console.log('3) Return to this terminal and press ENTER.\n');

await rl.question('Press ENTER after login is complete: ');

const state = await context.storageState();
const json = JSON.stringify(state);
const b64 = Buffer.from(json, 'utf8').toString('base64');

await fs.writeFile('dxb-storage-state.json', JSON.stringify(state, null, 2), 'utf8');
await fs.writeFile('dxb-storage-state.b64.txt', b64, 'utf8');

console.log('\nSaved:');
console.log('  dxb-storage-state.json');
console.log('  dxb-storage-state.b64.txt');
console.log('\nIMPORTANT: Treat both files as secrets. Do not commit them to GitHub or paste them into chat.');
console.log('Copy the entire contents of dxb-storage-state.b64.txt into Railway variable DXB_STORAGE_STATE_B64.\n');

await browser.close();
rl.close();
