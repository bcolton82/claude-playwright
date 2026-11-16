#!/usr/bin/env node
// Sync the playwright.dev docs (JS/TS only) into plugins/pw/docs so skills can read them locally.
//
// Source: the Markdown under docs/src in microsoft/playwright (Apache-2.0).
//
//   node scripts/sync-docs.mjs --tag v1.65.0                 # sparse-clones the tag into a temp dir
//   node scripts/sync-docs.mjs --src ~/code/playwright  # use an existing checkout (any ref)
//
// Keeps: guide pages with no language suffix or a suffix containing "js"; api/, test-api/,
// test-reporter-api/, electron-api/, mobile-api/. Drops sections marked "* langs:" that exclude js,
// and code fences in python/java/csharp/batch/powershell. Writes docs/INDEX.md, VERSION and NOTICE.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(pluginRoot, 'docs');

let src = opt('src');
const tag = opt('tag');
if (!src && !tag) {
  console.error('Usage: sync-docs.mjs --tag v1.65.0 | --src <playwright checkout>');
  process.exit(64);
}
if (!src) {
  src = mkdtempSync(path.join(tmpdir(), 'pw-docs-'));
  const git = (...a) => execFileSync('git', a, { cwd: src, stdio: 'inherit' });
  execFileSync('git', ['clone', '--depth', '1', '--branch', tag, '--filter=blob:none', '--sparse',
    'https://github.com/microsoft/playwright.git', src], { stdio: 'inherit' });
  git('sparse-checkout', 'set', 'docs/src');
}
const docsSrc = path.join(src, 'docs', 'src');
if (!existsSync(docsSrc)) throw new Error(`No docs/src under ${src}`);

const ref = (() => {
  try {
    return execFileSync('git', ['describe', '--tags', '--always'], { cwd: src }).toString().trim();
  } catch { return 'unknown'; }
})();
const commit = (() => {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: src }).toString().trim(); } catch { return 'unknown'; }
})();

const API_DIRS = ['api', 'test-api', 'test-reporter-api', 'electron-api', 'mobile-api'];
const DROP_FENCES = new Set(['python', 'py', 'java', 'csharp', 'batch', 'powershell']);
const LANG_SUFFIX = /-((?:js|python|java|csharp)(?:-(?:js|python|java|csharp))*)\.md$/;

function keepGuide(file) {
  const m = file.match(LANG_SUFFIX);
  return !m || m[1].split('-').includes('js');
}

// "* langs: js, python" -> ['js','python']; "* langs:" followed by alias lines -> null (all languages).
function langsOf(line) {
  const m = line.match(/^\* langs:\s*(.*)$/);
  if (!m) return undefined;
  const list = m[1].trim();
  return list ? list.split(',').map((s) => s.trim()) : null;
}

function filterMarkdown(text) {
  const lines = text.split('\n');
  const out = [];
  let skipLevel = 0; // when > 0, skipping a section until a heading of this level or higher
  let fence = null; // { drop: boolean, marker: string }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^(\s*)(```+)\s*([\w-]*)/);
    if (fence) {
      if (fenceMatch && fenceMatch[2] === fence.marker && !fenceMatch[3]) {
        if (!fence.drop && !skipLevel) out.push(line);
        fence = null;
        continue;
      }
      if (!fence.drop && !skipLevel) out.push(line);
      continue;
    }
    if (fenceMatch) {
      fence = { drop: DROP_FENCES.has(fenceMatch[3]), marker: fenceMatch[2] };
      if (!fence.drop && !skipLevel) out.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s/);
    if (heading) {
      const level = heading[1].length;
      if (skipLevel && level <= skipLevel) skipLevel = 0;
      if (!skipLevel) {
        // The langs marker sits within the first few lines after the heading.
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const langs = langsOf(lines[j]);
          if (langs === undefined) continue;
          if (langs && !langs.includes('js')) skipLevel = level;
          break;
        }
      }
      if (skipLevel) continue;
      out.push(line);
      continue;
    }
    if (skipLevel) continue;
    if (/^\* langs:/.test(line)) continue; // noise once filtered
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function titleOf(text, file) {
  return text.match(/^title:\s*"?(.+?)"?\s*$/m)?.[1] ?? text.match(/^# (.+)$/m)?.[1] ?? file;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const index = { guides: [], api: [] };
let bytes = 0;
function writeDoc(rel, text, bucket) {
  const version = ref.replace(/^v/, '').replace(/-.*$/, '');
  const filtered = filterMarkdown(text).replaceAll('%%VERSION%%', version);
  const dest = path.join(outDir, rel);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, filtered);
  bytes += filtered.length;
  const headings = [...filtered.matchAll(/^## (.+)$/gm)].map((m) => m[1].replace(/^(method|event|property|async method): /, ''));
  index[bucket].push({ rel, title: titleOf(text, rel), headings });
}

for (const f of readdirSync(docsSrc).sort()) {
  const full = path.join(docsSrc, f);
  if (statSync(full).isFile() && f.endsWith('.md') && keepGuide(f)) writeDoc(f, readFileSync(full, 'utf8'), 'guides');
}
for (const dir of API_DIRS) {
  const d = path.join(docsSrc, dir);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d).sort()) {
    if (f.endsWith('.md') && keepGuide(f)) writeDoc(path.join(dir, f), readFileSync(path.join(d, f), 'utf8'), 'api');
  }
}

const line = ({ rel, title, headings }, max) => {
  const h = headings.slice(0, max).join(' · ');
  return `- \`${rel}\` **${title}**${h ? ` — ${h}${headings.length > max ? ' …' : ''}` : ''}`;
};
writeFileSync(path.join(outDir, 'INDEX.md'), [
  `# Playwright docs (JS/TS), ${ref}`,
  '',
  'Local copy of playwright.dev, filtered to JavaScript/TypeScript. Grep this index for a topic, then Read the file.',
  'API references list members as `## method: Class.name`, `## property: ...`, `## event: ...`. Placeholders like `%%-name-%%` are shared option blocks defined in `api/params.md`.',
  'For the exact signatures of the version a repo has installed, grep its `node_modules/playwright-core/types/types.d.ts` and `node_modules/playwright/types/test.d.ts`.',
  '',
  '## Guides',
  ...index.guides.map((e) => line(e, 12)),
  '',
  '## API reference',
  ...index.api.map((e) => line(e, 400)),
  '',
].join('\n'));

writeFileSync(path.join(outDir, 'VERSION'), `${ref}\n${commit}\n`);
const license = path.join(src, 'LICENSE');
if (existsSync(license)) cpSync(license, path.join(outDir, 'LICENSE'));
writeFileSync(path.join(outDir, 'NOTICE'),
  `These files are derived from the Playwright documentation (docs/src) in https://github.com/microsoft/playwright\n` +
  `at ${ref} (${commit}), Copyright Microsoft Corporation, licensed under the Apache License 2.0 (see LICENSE).\n` +
  `Modified: filtered to JavaScript/TypeScript content by plugins/pw/scripts/sync-docs.mjs.\n`);

console.log(`Synced ${index.guides.length} guides + ${index.api.length} API pages (${(bytes / 1024).toFixed(0)} KB) from ${ref} to ${outDir}`);
