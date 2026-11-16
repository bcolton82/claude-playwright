---
name: setup
description: Add Playwright Test (TypeScript) to an unfamiliar repository, or check an existing setup. Use when the user has just cloned a repo and wants to start writing Playwright tests against it, or asks to set up, configure, or bootstrap Playwright.
---

# Playwright setup for an unfamiliar repo

Goal: a working, minimal Playwright setup in under 10 minutes that the engineer fully understands. Every step is shown and explained in one line so the engineer can follow and steer it. Never hide work.

## 1. Look before touching anything

Run the detector and read its output:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/detect-stack.mjs" .
```

Then read the repo's own README, `package.json` scripts, and any existing test folders. Summarize for the engineer in 5 lines or fewer:

- What the app is and how it starts (command, port). If the target is a hosted site (a URL, no app code in the repo), there is no `webServer`: set `baseURL` from an env var with the URL as default, and note that data on a shared demo site is not ours to reset.
- Package manager (from the lockfile). Use that one, never mix.
- Whether Playwright is already configured (`playwright.configs` in the detector output). If it is, follow **1c** instead of steps 2 to 4: adopt the existing setup, never reinstall or overwrite it.
- What tests already exist (unit, API, E2E) and how they run.
- Anything surprising (monorepo, auth, env vars, seed data, Docker).

Stop and confirm the plan with the engineer before installing anything.

## 1b. Get the app running first (cloned repos)

Playwright is useless until the app runs. Use the detector's `run` and `warnings` sections:

1. **Toolchain.** For each `MISSING` tool, tell the engineer the install command (`brew install elixir`, `corepack enable` for pnpm/yarn, Docker Desktop or OrbStack for `docker`) and wait. Do not install system tools yourself. Match `toolVersions` when a version manager is present.
2. **Env.** Copy `.env.example` to `.env`; read it and ask for any real secrets. Never invent API keys; if a third-party key is required, ask whether the app has a test mode or mock.
3. **Services.** `docker compose up -d <db services>` when there is a compose file; wait until the DB accepts connections.
4. **Setup and seed** with the repo's own commands, in this order of trust: README commands, `make`/`bin/setup` targets, package scripts (`setup`, `db:migrate`, `seed`), stack defaults (`mix setup`, `bin/setup`, `prisma migrate dev`).
5. **Start it by hand once** and load the page (or `curl -sf <url>`) before writing any config. Note the URL, the port, and how long startup takes.

If a step fails, read the error before retrying anything.

## 1c. Playwright already configured: adopt it, layer on top

The repo's setup is the contract. Change as little as possible and say why for every change.

1. **Install exactly what the lockfile says.** If `node_modules` is missing, use the repo's lockfile install (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --frozen-lockfile`). Never `npm i -D @playwright/test` or `npm init playwright` here: that bumps the version and rewrites the lockfile. Never upgrade Playwright unasked; if it is old, say so as a follow-up.
2. **Note the installed version** (`npx playwright --version`, or the detector's `installedVersion`). The bundled docs are for the latest release: before using any API, check it exists in that version (grep `node_modules/playwright/types/test.d.ts` and `node_modules/playwright-core/types/types.d.ts`, or `docs/release-notes-js.md` for when it was added).
3. **Browsers for that version:** `npx playwright install chromium` (or the browsers the projects you will run use). It downloads the build matching the installed version and changes no repo files.
4. **Map the existing setup** from every config (there may be several, for example a CI or a drills config) and the files they point to. Report it in 8 lines or fewer:
   - `testDir` / `testMatch`, projects and their `dependencies` (setup or auth projects), `storageState` paths;
   - `baseURL`, `webServer` (command, port, `reuseExistingServer`), env loading (`dotenv`, `.env` files), `globalSetup`;
   - the custom `test` (a `test.extend` fixtures file that specs import instead of `@playwright/test`), page objects, API clients, test data helpers;
   - naming, tags, `testIdAttribute`, timeouts, reporters, `fullyParallel` and workers.
   `npx playwright test --list [-c <config>]` shows what each project actually runs.
5. **Baseline before changing anything.** Run the existing suite once the way the repo runs it (its npm script, or the main project), and report pass / fail / flaky / skipped counts. Pre-existing failures and flakes are not yours: list them and offer `/pw:debug`, but do not fix them unasked.
6. **Layer on.** New tests go in the existing `testDir` and naming scheme, import the repo's custom `test`, and reuse its fixtures, page objects and helpers. Add to the config only when needed (for example a new project or a `setup` dependency), as a minimal diff explained line by line. Never replace the config or rewrite existing tests unasked.
7. If the existing config is broken (wrong port, dead `webServer` command, missing auth setup), propose the smallest fix and ask before applying it.

Then do steps 5 (MCP), 7 (`## Testing` doc) and 8 (final report): skip steps 2 to 4, and skip step 6 unless no package script runs Playwright yet. If the config is not at the repo root, the engineer can point the test MCP at it with `PW_TEST_MCP_CONFIG=<path>`.

## 2. Install (only if Playwright is missing)

Use the repo's package manager:

```bash
npm i -D @playwright/test        # or pnpm add -D / yarn add -D
npx playwright install chromium  # one browser keeps it fast
```

Do not run `npm init playwright`. It scaffolds example files that have to be deleted, which wastes time and clutters the diff.

## 3. Config

Start from `templates/playwright.config.ts` in the write skill (`${CLAUDE_PLUGIN_ROOT}/skills/write/templates/playwright.config.ts`). Adapt it:

- `webServer.command` and `url` from the detected start script and port. Point `url` at a health endpoint if the app has one.
- `baseURL` so tests use relative paths.
- `testDir` in a folder that does not collide with existing unit tests (for example `e2e/` or `tests/e2e/`).
- **Where Playwright lives.** JS repo: the root package (or the web app's package in a monorepo, using the workspace's package manager, for example `pnpm add -D @playwright/test --filter web`). Non-JS repo (Phoenix, Rails, Django, Go): a standalone `e2e/` package with its own `package.json`, and `webServer: { command: 'mix phx.server', cwd: '..', url: 'http://localhost:4000', timeout: 120_000 }` (compiling the first time is slow).
- **Several services** (API + web): `webServer` accepts an array; give each a `name` and its own `url`.
- **Phoenix with Ecto:** tests share one dev database, so create unique data per test (mention `Phoenix.Ecto.SQL.Sandbox` for full isolation; don't wire it up unasked).
- One `chromium` project, plus a `setup` project only if the app needs login.

Explain each non-default line in one sentence.

## 4. Prove it works

Write one smoke test that loads the main page and asserts one meaningful, user-visible thing with a role-based locator. Run it:

```bash
npx playwright test --project=chromium
```

Green smoke test = setup done. If it fails, read the error and trace before changing anything. Common causes: wrong port, app needs env vars, server slow to start (raise `webServer.timeout`).

## 5. Turn on the test-aware MCP server

The plugin's `playwright-test` MCP server (Playwright's `run-test-mcp-server`) starts only once the repo has Playwright installed. After installing, tell the engineer to reconnect it with `/mcp` (or restart Claude Code). If the app needs shared setup before most tests (login, seeded data), add a one-test seed file, such as `e2e/seed.spec.ts`, that does that setup with the project's fixtures. The write skill uses it to open pages in the same state as a test.

## 6. Add scripts

Only when no existing package script already runs Playwright (check for `playwright test` in any script, including ones scoped with `--project` or `-c`): add `"test:e2e": "playwright test"` and `"test:e2e:ui": "playwright test --ui"`. Never add duplicates; a bare `playwright test` in a multi-project config may also run projects the repo deliberately keeps out of its normal run. When adding your own project to an existing config, scope your scripts to it (`playwright test --project=<yours>`). In a standalone `e2e/` package (or any package without TypeScript), also `npm i -D typescript` and add `"typecheck": "tsc --noEmit"`: without the `typescript` package, `npx tsc` runs an unrelated npm package that type-checks nothing.

## 7. Offer a `## Testing` section in CLAUDE.md

Everything learned above (how the app runs, how the tests run) should not live only in chat. Offer to record it in the repo's `CLAUDE.md` (or `AGENTS.md` if the repo uses that instead) under a `## Testing` heading:

- If the file is missing, propose creating it with only this section. If it exists without `## Testing`, propose appending the section at the end. If `## Testing` already exists, propose edits to that section only. Never change anything outside the section.
- Show the exact diff and write it only after the engineer approves. If they decline, include the same facts in the final report instead.
- Keep it under about 25 lines, facts only:

```markdown
## Testing

- App: `<setup cmd>`, start with `<start cmd>` at <URL> (health: <url>); reset/seed: <endpoint or cmd>; env: <.env keys needed>
- Playwright <version>, config(s): `<file>` (projects: <name> -> <deps>, ...); `<other config>` for <purpose>
- Run: `<npm script or command>` (<what it runs>); one test: `npx playwright test <file> -g "<title>"`
- Conventions: import `test` from `<fixtures file>`; page objects in `<dir>`; API helpers in `<dir>`; `testIdAttribute: <attr>`
- Auth: setup project `<name>` writes `<storageState path>` (gitignored)
- Readiness and hazards: <signals tests must wait on, for example `[data-phx-main].phx-connected`, `aria-busy`>
- Known failures at setup time: <list, or none>
```

## 8. Final report (every run, fresh or adopted)

Hand control back once the smoke test or the baseline run is green (or setup is blocked), ending with exactly this block, nothing after it except a question if one is pending:

```
Status:         working | blocked (<why, and what the engineer must do>)
App:            <start cmd>, <URL>, health: <check used>
Config:         <file(s)>; projects: <name -> deps, ...>; baseURL: <url>; webServer: <cmd> (reuse locally: yes/no)
Conventions:    <custom test import, fixtures, page objects, testIdAttribute> | none yet
Existing tests: <N tests / M files per project>; baseline: <passed/failed/flaky/skipped> | none
Changed:        <files created or modified, one line each> | none
Testing doc:    CLAUDE.md ## Testing <written | declined | not offered (why)>
Next:           /pw:plan <suggested target>
```

## Rules

- Batch independent reads: several files in one turn (parallel reads) or one Bash call, never one file per turn.
- Smallest change that works. No ESLint plugins, no extra reporters, no Docker unless asked.
- Don't modify application code to make tests pass. If the app needs a test hook, say so and ask.
