#!/usr/bin/env node
// Check locators against the live app before writing them into a test.
// Uses the project's own Playwright install (run it from the folder that has @playwright/test).
//
//   node probe-locators.mjs <url-or-path> [options] [locator ...]
//
//   --base <url>        base URL for relative paths (default: $BASE_URL or http://localhost:3000)
//   --state <file>      storageState JSON to start logged in (for example playwright/.auth/user.json)
//   --wait <selector>   wait for this selector before probing (for example "[data-phx-main].phx-connected")
//   --snapshot          print the ARIA snapshot of the page (roles and accessible names)
//   --scope <locator>   with --snapshot, snapshot only this region
//
// Each locator is a JavaScript expression using `page`, for example:
//   "page.getByRole('row').filter({ hasText: 'ORD-1' }).getByRole('link', { name: 'Edit' })"
// Output per locator: match count (strict mode needs exactly 1) and a short description of each match.
import { createRequire } from 'node:module';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };

const base = opt('base') ?? process.env.BASE_URL ?? 'http://localhost:3000';
const state = opt('state');
const waitFor = opt('wait');
const scope = opt('scope');
const snapshot = flag('snapshot');
const [target, ...exprs] = args;
if (!target || target === '--help' || target === '-h') {
  console.error(`Usage: probe-locators.mjs <url-or-path> [options] [locator ...]
  --base <url>        base URL for relative paths (default: $BASE_URL or http://localhost:3000)
  --state <file>      storageState JSON to start logged in
  --wait <selector>   wait for this selector before probing
  --snapshot          print the ARIA snapshot (roles and accessible names)
  --scope <locator>   with --snapshot, snapshot only this region
  locator ...         JavaScript expressions using \`page\`, e.g. "page.getByRole('button', { name: 'Save' })"`);
  process.exit(target ? 0 : 64);
}

let chromium;
try {
  const require = createRequire(path.join(process.cwd(), 'package.json'));
  ({ chromium } = require('@playwright/test'));
} catch {
  console.error('No @playwright/test found from this folder. Run from the Playwright project (for example e2e/).');
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ baseURL: base, ...(state ? { storageState: state } : {}) });
  const page = await context.newPage();
  let res;
  try {
    res = await page.goto(target);
  } catch (e) {
    if (/ERR_CONNECTION_REFUSED|ECONNREFUSED/.test(e.message)) {
      console.error(`Nothing listening on ${base}; start the app or pass --base.`);
      await browser.close();
      process.exit(1);
    }
    throw e;
  }
  console.log(`${res?.status() ?? '?'} ${page.url()}`);
  if (waitFor) await page.locator(waitFor).first().waitFor({ timeout: 15000 }); // pw-allow readiness wait: any match means ready

  const evalLocator = (expr) => new Function('page', `return (${expr});`)(page);

  if (snapshot) {
    const root = scope ? evalLocator(scope) : page.locator('body');
    console.log(await root.ariaSnapshot());
  }

  for (const expr of exprs) {
    let loc;
    try { loc = evalLocator(expr); } catch (e) { console.log(`\nINVALID ${expr}\n  ${e.message}`); continue; }
    let n;
    try { n = await loc.count(); } catch (e) { console.log(`\nERROR   ${expr}\n  ${e.message.split('\n')[0]}`); continue; }
    const verdict = n === 1 ? 'OK     ' : n === 0 ? 'NONE   ' : `MANY(${n})`;
    console.log(`\n${verdict} ${expr}`);
    for (let i = 0; i < Math.min(n, 5); i++) {
      const d = await loc.nth(i).evaluate((el) => {
        const attrs = ['href', 'type', 'name', 'aria-label', 'data-testid', 'id'].map((a) => el.getAttribute(a) && `${a}="${el.getAttribute(a)}"`).filter(Boolean).join(' ');
        const text = (el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return `<${el.tagName.toLowerCase()}${attrs ? ' ' + attrs : ''}> "${text}"${visible ? '' : ' (hidden)'}`;
      });
      console.log(`  ${i + 1}. ${d}`);
    }
  }
} finally {
  await browser.close();
}
