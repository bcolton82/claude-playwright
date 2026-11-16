#!/usr/bin/env node
// Prints a JSON summary of a repo: what it is, how to get it running, and how to add Playwright.
// Usage: node detect-stack.mjs [repoDir]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.argv[2] || '.';
const has = (p) => existsSync(join(root, p));
const read = (p) => { try { return readFileSync(join(root, p), 'utf8'); } catch { return null; } };
const readJson = (p) => { try { return JSON.parse(read(p)); } catch { return null; } };
const onPath = (bin) => spawnSync('sh', ['-c', `command -v ${bin}`], { encoding: 'utf8' }).status === 0;
// Run version checks outside the repo and without a pipe: tools like `elixir` crash (and drop an
// erl_crash.dump in the cwd) when a reader such as `head` closes the pipe early.
const version = (cmd) => {
  const r = spawnSync('sh', ['-c', `${cmd} 2>/dev/null`], { encoding: 'utf8', cwd: tmpdir(), timeout: 15000 });
  return r.status === 0 ? r.stdout.trim().split('\n').filter(Boolean).pop() || null : null;
};

// ---------- JS package analysis (root and sub-packages) ----------
function analyzePackage(dir) {
  const pkg = readJson(join(dir, 'package.json'));
  if (!pkg) return null;
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const scripts = pkg.scripts || {};
  const frameworks = [];
  const fw = (name, cond) => { if (cond) frameworks.push(name); };
  fw('next', deps.next); fw('vite', deps.vite); fw('react', deps.react); fw('vue', deps.vue);
  fw('nuxt', deps.nuxt); fw('angular', deps['@angular/core']); fw('svelte', deps.svelte || deps['@sveltejs/kit']);
  fw('astro', deps.astro); fw('remix', deps['@remix-run/react'] || deps['react-router']);
  fw('express', deps.express); fw('fastify', deps.fastify); fw('hono', deps.hono); fw('nestjs', deps['@nestjs/core']);
  fw('graphql', deps.graphql || deps['@apollo/server'] || deps['@apollo/client']);
  fw('prisma', deps.prisma || deps['@prisma/client']); fw('drizzle', deps['drizzle-orm']);
  fw('shopify-app', Object.keys(deps).some((d) => d.startsWith('@shopify/')));
  fw('storybook', Object.keys(deps).some((d) => d.startsWith('@storybook/')));
  const startScript = ['dev', 'start', 'serve', 'preview'].find((s) => scripts[s]);
  const scriptText = startScript ? scripts[startScript] : '';
  let portGuess = Number(scriptText.match(/(?:--port[ =]|PORT=|-p\s?)(\d{2,5})/)?.[1]) || null;
  const viteCfg = ['vite.config.ts', 'vite.config.js', 'vite.config.mts'].map((f) => read(join(dir, f))).find(Boolean);
  if (!portGuess && viteCfg) portGuess = Number(viteCfg.match(/port\s*:\s*(\d{2,5})/)?.[1]) || null;
  if (!portGuess) {
    if (frameworks.includes('next') || frameworks.includes('remix') || frameworks.includes('nuxt')) portGuess = 3000;
    else if (frameworks.includes('vite') || frameworks.includes('svelte')) portGuess = 5173;
    else if (frameworks.includes('astro')) portGuess = 4321;
    else if (frameworks.includes('angular')) portGuess = 4200;
  }
  if (!portGuess) {
    const fileMatch = scriptText.match(/\b(?:node|tsx|ts-node|bun)\s+([\w./-]+\.[cm]?[jt]s)/);
    for (const f of [fileMatch?.[1], 'server.js', 'server.ts', 'src/server.ts', 'src/index.ts', 'src/main.ts', 'index.js', 'app.js'].filter(Boolean)) {
      const src = read(join(dir, f));
      const m = src?.match(/PORT\s*(?:\|\||\?\?)\s*['"]?(\d{2,5})|\.listen\(\s*(\d{2,5})/);
      if (m) { portGuess = Number(m[1] || m[2]); break; }
    }
  }
  return {
    dir: dir || '.',
    name: pkg.name ?? null,
    frameworks,
    scripts: Object.fromEntries(Object.entries(scripts).filter(([k]) => /^(dev|start|serve|preview|build|setup|seed|db|migrate|test|e2e|lint|typecheck)/.test(k))),
    startScript: startScript ? { name: startScript, command: scriptText } : null,
    portGuess,
    playwright: deps['@playwright/test'] ?? null,
    testRunners: ['@playwright/test', 'jest', 'vitest', 'mocha', 'cypress', 'supertest', '@pact-foundation/pact', 'msw'].filter((d) => deps[d]),
    typescript: existsSync(join(root, dir, 'tsconfig.json')) || Boolean(deps.typescript),
    workspaces: pkg.workspaces ?? null,
    packageManagerField: pkg.packageManager ?? null,
    engines: pkg.engines ?? null,
  };
}

const rootPkg = analyzePackage('');
const subPackages = [];
const candidates = new Set(['frontend', 'backend', 'client', 'server', 'web', 'api', 'app', 'ui', 'assets', 'e2e', 'tests/e2e']);
for (const parent of ['apps', 'packages', 'services']) {
  if (!has(parent)) continue;
  for (const e of readdirSync(join(root, parent), { withFileTypes: true })) if (e.isDirectory()) candidates.add(`${parent}/${e.name}`);
}
for (const d of candidates) { if (has(join(d, 'package.json'))) { const p = analyzePackage(d); if (p) subPackages.push(p); } }

const monorepo = Boolean(rootPkg?.workspaces) || ['pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'lerna.json'].some(has) || subPackages.length > 1;

const lockfile = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lockb') || has('bun.lock') ? 'bun' : has('package-lock.json') ? 'npm' : null;
const packageManager = lockfile ?? rootPkg?.packageManagerField?.split('@')[0] ?? (rootPkg ? 'npm (no lockfile)' : null);

// ---------- Non-JS stacks ----------
const stacks = [];
const mix = read('mix.exs');
if (mix) {
  // Ignore commented-out lines (generated dev.exs has a commented https example on port 4001).
  const uncomment = (t) => (t || '').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const devExs = uncomment(read('config/dev.exs')) + '\n' + uncomment(read('config/runtime.exs'));
  const db = /:postgrex|postgrex/.test(mix) ? 'postgres' : /ecto_sqlite3/.test(mix) ? 'sqlite' : /myxql/.test(mix) ? 'mysql' : null;
  stacks.push({
    stack: 'elixir/phoenix',
    liveView: /:phoenix_live_view/.test(mix),
    database: db,
    // Prefer the PORT env default, then the dev endpoint's http port; ignore url/https ports (443, 4001).
    portGuess: Number(devExs.match(/get_env\("PORT"\)\s*\|\|\s*"(\d{2,5})"/)?.[1] || devExs.match(/http:\s*\[[^\]]*?port:\s*(\d{2,5})/)?.[1]) || 4000,
    setup: /\bsetup:\s*\[/.test(mix) ? 'mix setup' : db ? 'mix deps.get && mix ecto.setup' : 'mix deps.get',
    start: 'mix phx.server',
    healthHint: 'Phoenix has no default health route; use the root URL or a known page as webServer.url.',
    jsAssets: has('assets/package.json'),
  });
}
if (has('Gemfile')) stacks.push({ stack: has('config/routes.rb') ? 'rails' : 'ruby', setup: has('bin/setup') ? 'bin/setup' : 'bundle install', start: has('bin/dev') ? 'bin/dev' : 'bin/rails server', portGuess: 3000 });
if (has('manage.py')) stacks.push({ stack: 'django', setup: 'pip install -r requirements.txt && python manage.py migrate', start: 'python manage.py runserver', portGuess: 8000 });
if (has('pyproject.toml') || has('requirements.txt')) if (!has('manage.py')) stacks.push({ stack: 'python', hint: 'check README for the run command (uvicorn/flask/fastapi)' });
if (has('go.mod')) stacks.push({ stack: 'go', start: 'go run .' });

// ---------- How to get it running ----------
const compose = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'].find(has);
let composeServices = [];
if (compose) {
  const text = read(compose);
  const block = text.split(/^services:\s*$/m)[1] || '';
  composeServices = [...block.matchAll(/^ {2}([\w.-]+):\s*$/gm)].map((m) => m[1]);
}
const toolVersions = {};
for (const f of ['.tool-versions', '.nvmrc', '.node-version', 'mise.toml', '.mise.toml', '.ruby-version', '.python-version']) {
  const t = read(f); if (t) toolVersions[f] = t.trim().split('\n').slice(0, 6).join('; ');
}
const makeTargets = (() => {
  const mk = read('Makefile'); if (!mk) return [];
  return [...mk.matchAll(/^([a-zA-Z][\w-]*):/gm)].map((m) => m[1]).filter((t) => /setup|install|dev|run|start|serve|seed|db|test|e2e|up/.test(t));
})();
const scriptsDir = ['bin/setup', 'bin/dev', 'bin/server', 'scripts/setup.sh', 'scripts/dev.sh', 'Procfile', 'Procfile.dev', 'justfile'].filter(has);
const readme = ['README.md', 'readme.md', 'README'].find(has) || null;
const readmeCommands = readme
  ? [...new Set([...(read(readme).matchAll(/^\s*\$?\s*((?:npm|npx|pnpm|yarn|bun|mix|docker|docker-compose|make|bin\/|cp|createdb|psql|bundle|rails|python|pip|uv|go)\b[^\n`]*)/gm))].map((m) => m[1].trim()))].slice(0, 25)
  : [];
const envExample = ['.env.example', '.env.sample', '.env.template', '.env.local.example'].filter(has);

// ---------- Toolchain on this machine ----------
const needs = new Set(['node']);
if (packageManager?.startsWith('pnpm')) needs.add('pnpm');
if (packageManager?.startsWith('yarn')) needs.add('yarn');
if (packageManager?.startsWith('bun')) needs.add('bun');
if (compose || has('Dockerfile')) needs.add('docker');
if (mix) { needs.add('mix'); needs.add('elixir'); }
// A Postgres from docker compose needs docker, not a local psql.
if (stacks.some((s) => s.database === 'postgres') && !composeServices.some((s) => /postgres|db/.test(s))) needs.add('psql');
if (has('Gemfile')) needs.add('bundle');
if (has('manage.py') || has('pyproject.toml')) needs.add('python3');
const toolchain = Object.fromEntries([...needs].map((b) => [b, onPath(b) ? (version(`${b} --version`) || 'present') : 'MISSING']));

// ---------- Tests, API specs, CI ----------
const apiSpecs = [];
const foundConfigs = [];
const testFiles = []; // *.spec.* / *.test.* / *.setup.* (Playwright, Jest, Vitest alike)
const walk = (dir, depth) => {
  if (depth > 3) return;
  let entries = [];
  try { entries = readdirSync(join(root, dir), { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (['node_modules', '.git', 'dist', 'build', '_build', 'deps', '.next', 'vendor'].includes(e.name)) continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) walk(rel, depth + 1);
    else if (/^(openapi|swagger)[^/]*\.(ya?ml|json)$/i.test(e.name) || /\.graphql$/.test(e.name)) apiSpecs.push(rel);
    else if (/^playwright(\.[\w-]+)?\.config\.[cm]?[jt]s$/.test(e.name)) foundConfigs.push(rel);
    else if (/\.(spec|test|setup)\.[cm]?[jt]sx?$/.test(e.name)) testFiles.push(rel);
  }
};
walk('', 0);
// Deeper pass for test files only (feature folders often nest 3-4 levels).
const walkTests = (dir, depth) => {
  if (depth > 5) return;
  let entries = [];
  try { entries = readdirSync(join(root, dir), { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (['node_modules', '.git', 'dist', 'build', '_build', 'deps', '.next', 'vendor', 'test-results', 'playwright-report'].includes(e.name)) continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) walkTests(rel, depth + 1);
    else if (depth > 3 && /\.(spec|test|setup)\.[cm]?[jt]sx?$/.test(e.name)) testFiles.push(rel);
  }
};
walkTests('', 0);

// What is actually installed (node_modules), next to what package.json declares.
const installedPlaywright = (() => {
  for (const d of ['', ...subPackages.map((p) => p.dir)]) {
    const pj = readJson(join(d, 'node_modules', '@playwright', 'test', 'package.json'));
    if (pj?.version) return { dir: d || '.', version: pj.version };
  }
  return null;
})();
// Every playwright*.config.* within 3 levels (main, CI, drills, per-app configs in monorepos).
const playwrightConfigs = [...new Set(foundConfigs)].sort((a, b) => a.split('/').length - b.split('/').length);

const out = {
  repo: root,
  summary: {
    js: rootPkg ? { ...rootPkg, dir: '.' } : null,
    subPackages,
    monorepo,
    otherStacks: stacks,
    packageManager,
  },
  run: {
    toolchain,
    toolVersions,
    envExample,
    envPresent: ['.env', '.env.local', '.env.development'].filter(has),
    compose: compose ? { file: compose, services: composeServices } : null,
    makeTargets,
    scripts: scriptsDir,
    readmeCommands,
  },
  playwright: {
    installed: Boolean(rootPkg?.playwright || subPackages.some((p) => p.playwright)),
    declaredVersion: rootPkg?.playwright ?? subPackages.find((p) => p.playwright)?.playwright ?? null,
    installedVersion: installedPlaywright?.version ?? null,
    nodeModulesPresent: has('node_modules') || subPackages.some((p) => has(join(p.dir, 'node_modules'))),
    configs: playwrightConfigs,
  },
  existingTests: {
    // testDir of every Playwright config (relative to the repo), then where test files actually live.
    playwrightTestDirs: [...new Set(playwrightConfigs.flatMap((cfg) => {
      const base = cfg.includes('/') ? cfg.slice(0, cfg.lastIndexOf('/')) : '';
      return [...(read(cfg) || '').matchAll(/testDir\s*:\s*['"`]([^'"`]+)['"`]/g)]
        .map((m) => join(base, m[1]).replace(/^\.\//, '') || '.');
    }))],
    filesByTopDir: Object.fromEntries(Object.entries(testFiles.reduce((acc, f) => {
      const top = f.includes('/') ? f.split('/')[0] : '.';
      acc[top] = (acc[top] || 0) + 1; return acc;
    }, {})).sort((a, b) => b[1] - a[1])),
    totalFiles: testFiles.length,
    dirs: ['tests', 'test', 'e2e', '__tests__', 'spec', 'cypress', 'tests/e2e', 'test/e2e'].filter(has),
    runners: [...new Set([...(rootPkg?.testRunners || []), ...subPackages.flatMap((p) => p.testRunners)])],
  },
  apiSpecs: apiSpecs.slice(0, 20),
  ci: ['.github/workflows', '.gitlab-ci.yml', '.circleci', 'buildkite', '.buildkite'].filter(has),
  readme,
  warnings: [
    ...Object.entries(toolchain).filter(([, v]) => v === 'MISSING').map(([b]) => `${b} is not installed but this repo needs it`),
    ...(envExample.length && !['.env', '.env.local'].some(has) ? [`copy ${envExample[0]} to .env (and read it for required secrets)`] : []),
    ...((rootPkg?.playwright || subPackages.some((p) => p.playwright)) && !installedPlaywright ? ['Playwright is declared but not installed: run the lockfile install (npm ci / pnpm install --frozen-lockfile), not npm i -D'] : []),
    ...(packageManager && /pnpm|yarn/.test(packageManager) && toolchain[packageManager.split(' ')[0]] === 'MISSING' ? ['enable it with `corepack enable` (ships with Node), or npm i -g'] : []),
  ],
};

console.log(JSON.stringify(out, null, 2));
