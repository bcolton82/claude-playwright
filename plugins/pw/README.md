# pw

A Claude Code plugin that speeds up an SDET's judgment on an unfamiliar codebase without replacing it. Every step pauses for the engineer to approve, edit, or redirect.

## What's inside

| Piece | Invoke | What it does |
| --- | --- | --- |
| `setup` skill | `/pw:setup` | Detects the stack, adds Playwright with a minimal config (webServer, baseURL, traces), proves it with one smoke test |
| `plan` skill | `/pw:plan` | Turns the app or acceptance criteria into a short, risk-ranked plan, saved to `docs/test-plans/<target>.md` for review, then stops for approval |
| `write` skill | `/pw:write` | Writes tests to senior conventions: with a plan, all in one pass and one stability run; without one, one at a time. Extracts page objects and fixtures only when duplication appears |
| `debug` skill | `/pw:debug` | Reproduces under the failing config, reads `error-context.md` and the trace from the terminal (`npx playwright trace`), classifies the cause by its evidence signature, fixes the root cause, proves it under the conditions that broke it |
| `reviewer` agent | "have pw:reviewer review the tests" | Read-only review: flake risk, assertion strength, locators, isolation, plan coverage |
| Anti-pattern hook | automatic | After Claude edits Playwright code (any file importing `@playwright/test`), blocks hard waits, one-shot reads asserted later, `expect(page.url())`, module-level state in specs, legacy queries, `networkidle`, `force: true`, and `.only`; warns on CSS/positional locators, `waitForLoadState()`, serial mode |
| Playwright MCP (`playwright`) | automatic | Lets Claude open the running app and read real roles and labels instead of guessing locators, even before Playwright is installed |
| Playwright test MCP (`playwright-test`) | automatic once the repo has Playwright | Playwright's own `run-test-mcp-server` from the repo's install: `test_run`, `test_list`, `test_debug` (paused at the failure), `generator_setup_page` and `planner_setup_page` with a seed test (both start the config's `webServer`), `browser_generate_locator`. Headless by default; `PW_TEST_MCP_HEADED=1` shows the browser, `PW_TEST_MCP_CONFIG` picks a config |
| Bundled docs | `docs/INDEX.md` | playwright.dev (JS/TS only) at the synced version, so skills look up APIs locally instead of fetching or guessing |

## Updating the bundled docs

```bash
node scripts/sync-docs.mjs --tag v1.65.0          # sparse-clones microsoft/playwright at that tag
node scripts/sync-docs.mjs --src ~/path/to/playwright   # or use an existing checkout
```

The docs are derived from microsoft/playwright `docs/src` (Apache-2.0); see `docs/NOTICE` and `docs/LICENSE`. Skills also read the target repo's installed `node_modules/playwright*/types/*.d.ts` for version-exact signatures.

Probe locators against the live app before writing them (run from the Playwright project folder):

```bash
node scripts/probe-locators.mjs /orders --base http://localhost:4000 --state playwright/.auth/user.json --snapshot "page.getByRole('link', { name: 'New Order' })"
```

The anti-pattern checker also runs by hand:

```bash
node scripts/check-antipatterns.mjs path/to/*.spec.ts
```

Add `// pw-allow <reason>` to a line to accept a flagged pattern on purpose.

## Requirements

- Claude Code
- Node 20 or newer
- `npx` access to `@playwright/mcp` (pinned to 0.0.85 in `.mcp.json`)

## Install

```
/plugin install pw --marketplace bcolton82/claude-playwright
```
