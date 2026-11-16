#!/usr/bin/env node
// Flags common Playwright anti-patterns in test files.
//
// CLI:  node check-antipatterns.mjs <file> [file...]   exits 1 if anything is found
// Hook: node check-antipatterns.mjs --hook             reads Claude Code hook JSON on stdin;
//       on findings, prints them to stderr and exits 2 so Claude sees them and can fix them.
import { readFileSync, existsSync } from 'node:fs';

const ONE_SHOT = /\.(isVisible|isHidden|isEnabled|isDisabled|isChecked|isEditable|textContent|innerText|innerHTML|inputValue|getAttribute|count|allTextContents|allInnerTexts)\s*\(/;
const SPEC = /\.(spec|test|setup)\.[cm]?[jt]sx?$/;
// Blank out string and template literal contents so '//' inside URLs or text is not read as a comment.
const stripStrings = (l) =>
  l
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, "''")
    // Regex literals: a '/' after an operator, bracket, comma or keyword starts one.
    .replace(/(^|[=(,:!&|?{};[]|\breturn)\s*\/(?![/*])(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+\/[a-z]*/g, '$1 RE');
// A '//' comment after code on the same line. Tool directives must stay on their line, so they are allowed.
const hasTrailingComment = (l) => {
  if (l.startsWith("#!")) return false;
  const m = stripStrings(l).match(/\S\s*\/\/(.*)$/);
  return !!m && !/^\s*(pw-allow|@ts-|eslint-|prettier-ignore|istanbul|c8 )/.test(m[1]);
};

// Each rule: re (RegExp) or test(line) => boolean. warn: true = reported, but never blocks the hook.
// specOnly: only in spec/test/setup files (not page objects or fixtures).
const RULES = [
  { id: 'hard-wait', re: /\bwaitForTimeout\s*\(/, msg: 'Hard wait. Wait on a condition (web-first assertion, waitForResponse, toBeEnabled, an app readiness signal).' },
  { id: 'sleep', re: /new Promise\s*\(\s*\(?\s*\w*\s*\)?\s*=>\s*setTimeout/, msg: 'Sleep via setTimeout. Wait on a condition instead.' },
  { id: 'one-shot-assert', test: (l) => /expect\s*\(\s*await\b/.test(l) && ONE_SHOT.test(l), msg: 'One-shot read inside expect does not retry. Use expect(locator).toBeVisible()/toHaveText()/toHaveValue()/toHaveAttribute()/toHaveCount().' },
  { id: 'one-shot-url', re: /expect\s*\(\s*page\.url\(\s*\)/, msg: 'page.url() is read once. Use await expect(page).toHaveURL(...), which retries.' },
  { id: 'module-state', specOnly: true, re: /^(let|var)\s+[\w{[]/, msg: 'Module-level mutable state in a spec. Tests that read what another test wrote break under parallel workers (separate processes). Each test creates its own data.' },
  { id: 'legacy-query', re: /\bpage\.\$\$?\s*\(/, msg: 'page.$ / page.$$ are legacy element handles. Use locators.' },
  { id: 'wait-for-selector', re: /\.waitForSelector\s*\(/, msg: 'waitForSelector is rarely needed. Assert on a locator instead.' },
  { id: 'networkidle', re: /networkidle/, msg: "'networkidle' is unreliable. Wait for the specific response or UI state." },
  { id: 'force', re: /force\s*:\s*true/, msg: 'force: true hides actionability problems. Find out why the element is not actionable.' },
  { id: 'only', re: /\b(test|describe)\.only\s*\(|\btest\.describe\.only\s*\(/, msg: 'Leftover .only will skip the rest of the suite.' },
  { id: 'xpath', re: /locator\s*\(\s*['"`](\/\/|xpath=)/, msg: 'XPath locator. Prefer getByRole/getByLabel/getByTestId.' },
  { id: 'load-state', warn: true, re: /waitForLoadState\s*\(\s*(['"`](load|domcontentloaded)['"`])?\s*\)/, msg: 'waitForLoadState() resolves at once if the current page already loaded; it does not wait for a navigation a click starts. Use toHaveURL/waitForURL or a web-first assertion.' },
  { id: 'url-read', warn: true, test: (l) => /\bpage\.url\(\s*\)/.test(l) && !/expect\s*\(\s*page\.url/.test(l), msg: 'page.url() is a one-time read. Assert toHaveURL first so the navigation has happened.' },
  { id: 'one-shot-read', warn: true, test: (l) => /=\s*await\b/.test(l) && ONE_SHOT.test(l) && !/expect\s*\(/.test(l), msg: 'One-shot read stored in a variable. Fine for computing values, but assert with web-first assertions.' },
  { id: 'serial', warn: true, re: /mode\s*:\s*['"`]serial['"`]|describe\.serial\s*\(/, msg: 'Serial mode couples tests and kills parallelism. Prefer independent tests; justify it in a comment if truly needed.' },
  { id: 'testid-css', warn: true, re: /locator\s*\(\s*['"`][^'"`]*\[data-(testid|test-id|test|qa|cy)\b/, msg: 'Test id via CSS. Use getByTestId() (configure testIdAttribute if the attribute is not data-testid).' },
  { id: 'css-locator', warn: true, re: /locator\s*\(\s*['"`][^'"`]*(\.[a-zA-Z][\w-]*|#[a-zA-Z][\w-]*|:nth-child|>>|\[(?!data-(testid|test-id|test|qa|cy)\b)[\w-]+)/, msg: 'CSS locator tied to structure or styling. Prefer role, label, or test id; if CSS is necessary, add a comment why.' },
  { id: 'positional', re: /\.(nth\(\s*-?\d+\s*\)|first\(\)|last\(\))/, msg: 'Positional locator (.nth/.first/.last) acts on whichever element renders first. Scope to the owning region or row, filter({ hasText }), or exact: true. If order is the behavior under test, add "// pw-allow <reason>".' },
  { id: 'trailing-comment', warn: true, test: hasTrailingComment, msg: 'Comment at the end of a line. Put it on its own line directly above the code it explains (one comment can cover a block).' },
  { id: 'fixed-sleep-timeout', warn: true, re: /timeout\s*:\s*([6-9]\d{4}|\d{6,})/, msg: 'Very long timeout. Fine for a slow server start; suspicious inside a test.' },
];

const CODE = /\.[cm]?[jt]sx?$/;
// Playwright code = a spec/setup file by name, or any JS/TS file that imports @playwright/test
// (page objects, fixtures, helpers), wherever it lives.
function isPlaywrightFile(p, text) {
  if (!CODE.test(p) || /node_modules|\.d\.ts$/.test(p)) return false;
  return SPEC.test(p) || /from\s+['"]@playwright\/test['"]|require\(\s*['"]@playwright\/test['"]\s*\)/.test(text);
}

function scan(file) {
  const findings = [];
  const text = readFileSync(file, 'utf8');
  if (!isPlaywrightFile(file, text)) return findings;
  const spec = SPEC.test(file);
  const lines = text.split('\n');
  const oneShotVars = new Set(); // names assigned from a one-shot read, e.g. const total = await x.textContent()
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    if (/pw-allow/.test(line)) return; // explicit opt-out: // pw-allow <reason>
    for (const r of RULES) {
      if (r.specOnly && !spec) continue;
      if (r.re ? r.re.test(line) : r.test(line)) findings.push({ file, line: i + 1, rule: r.id, warn: !!r.warn, msg: r.msg, code: trimmed.slice(0, 100) });
    }
    const assigned = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*await\b/);
    if (assigned && ONE_SHOT.test(line)) oneShotVars.add(assigned[1]);
    const asserted = line.match(/expect\s*\(\s*(\w+)\s*[,)]/);
    if (asserted && oneShotVars.has(asserted[1]) && !/expect\.poll/.test(line)) {
      findings.push({ file, line: i + 1, rule: 'one-shot-assert', warn: false,
        msg: `"${asserted[1]}" was read once (no retry) and is asserted here. Assert on the locator instead: expect(locator).toHaveText()/toBeVisible()/....`, code: trimmed.slice(0, 100) });
    }
  });
  return findings;
}

const format = (f) => `${f.file}:${f.line}  [${f.warn ? 'warn' : 'error'}: ${f.rule}] ${f.msg}\n    > ${f.code}`;

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

if (process.argv.includes('--hook')) {
  let input = {};
  try { input = JSON.parse(await readStdin()); } catch { process.exit(0); }
  const ti = input.tool_input || {};
  const files = [ti.file_path, ti.path].filter(Boolean);
  const targets = files.filter((f) => existsSync(f));
  // In the hook, only block on clear errors; style warnings are left to the reviewer.
  const findings = targets.flatMap(scan).filter((f) => !f.warn);
  if (findings.length) {
    process.stderr.write(
      `Playwright anti-pattern check found ${findings.length} issue(s). Fix them, or add "// pw-allow <reason>" if intentional:\n` +
        findings.map(format).join('\n') + '\n',
    );
    process.exit(2);
  }
  process.exit(0);
} else {
  const files = process.argv.slice(2).filter((f) => !f.startsWith('--'));
  if (!files.length) {
    console.error('Usage: check-antipatterns.mjs <file> [file...]');
    process.exit(64);
  }
  const findings = files.filter(existsSync).flatMap(scan);
  const errors = findings.filter((f) => !f.warn);
  if (findings.length) {
    console.log(findings.map(format).join('\n'));
    console.log(`\n${errors.length} error(s), ${findings.length - errors.length} warning(s) in ${new Set(findings.map((f) => f.file)).size} file(s).`);
    process.exit(errors.length ? 1 : 0);
  }
  console.log('No anti-patterns found.');
}
