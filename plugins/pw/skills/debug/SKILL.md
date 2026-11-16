---
name: debug
description: Diagnose a failing or flaky Playwright test from evidence (error, error-context, trace, repeated runs) and fix the root cause. Use when a Playwright test fails, times out, passes locally but fails in CI, or passes and fails intermittently.
---

# Debug a failing or flaky Playwright test

Evidence first, edits second. Show each step in one line so the engineer can follow and steer: **observe → classify → hypothesize → test the hypothesis → fix the cause → verify under the conditions that broke it.**

Never use GUI tools yourself (`show-trace`, `--ui`, `--debug`, `show-report`): you cannot see them. Everything below works from the terminal. Suggest the GUI to the engineer if they want to look along.

## 1. Reproduce under the same conditions

Batch independent reads (config, spec, error-context, trace commands) in one turn or one Bash call, never one file per turn.

If the repo's `CLAUDE.md` (or `AGENTS.md`) has a `## Testing` section, read it first: it says how the app starts, which configs and projects exist, and which readiness signals tests depend on.


Find out how the failing test is actually run before running it: `package.json` scripts, every `playwright*.config.ts` (a `-c` config may differ from the default), the project name, and CI env (`process.env.CI` branches). Run it the same way, with traces:

```bash
npx playwright test <file> -g "<title>" [-c <config>] [--project=<name>] --trace=on --reporter=line
npx playwright test <file> -g "<title>" --repeat-each=20 --workers=1   # flaky alone?  (timing/logic)
npx playwright test <file> --repeat-each=5                              # flaky only in parallel?  (shared state)
npx playwright test --last-failed                                       # rerun just what failed
```

Record the failure rate and which mode fails. Fails alone too = timing or logic. Passes alone or with `--workers=1` but fails in parallel = shared data or state between tests.

Reproduce a collision or reset on an isolated server (another `PORT`, `reuseExistingServer` off for that run). Never POST to reset endpoints or otherwise mutate a server or data other sessions use.

## 2. Read the evidence, in this order

1. **The whole terminal error**, not just the first line. It includes the numbered list of matches for a strict-mode violation, the call log (what the action was waiting for: "not enabled", "not visible", "not stable"), expected vs received, and the timeout value.
2. **`test-results/<test-dir>/error-context.md`**: the page's ARIA snapshot at the moment of failure. Check what page you are actually on and what the user would see.
3. **The trace**, from the command line (full reference: `references/trace-cli.md` in this skill's folder):
   ```bash
   npx playwright trace open test-results/<test-dir>/trace.zip
   npx playwright trace actions --errors-only     # the failing action and its id
   npx playwright trace action <id>               # params, call log, source line, snapshot phases
   npx playwright trace requests                  # status "ERR" or none = still in flight / aborted at teardown
   npx playwright trace snapshot <id> --phase before
   npx playwright trace console --errors-only
   npx playwright trace close
   ```
   Correlate the network timeline with the action timeline: was a request still pending when the test asserted? Did a request go to `undefined` or get a 401/302?
4. **A live, paused page** (when the `playwright-test` MCP server is connected): `test_list` for the test id, then `test_debug` runs that one test and pauses at the failure. Inspect with `browser_snapshot`, `browser_network_requests`, `browser_console_messages`, `browser_evaluate`, `browser_get_config` (the resolved config, including project `use` and timeouts). Resume with `browser_resume`. It runs one test with default workers, so it cannot reproduce parallel-only failures: use the CLI comparison in step 1 for those.
5. **The config** for any number in the error that is not a Playwright default (defaults: test 30 s, expect 5 s, action and navigation unlimited). Search project-level `use` blocks too.

## 3. Classify (say which, and why)

| Evidence signature | Likely cause | Fix where it lives | Reject (symptom fixes) |
|---|---|---|---|
| `strict mode violation ... resolved to N elements` | Ambiguous locator, often a new component with the same accessible name | Scope to the region that owns the element (`getByRole('article', { name }).getByRole('button', ...)`) | `.first()` / `.nth()`: may silently act on the wrong element |
| `expect(received).toBe(true)` on `isVisible()`/`textContent()`/`page.url()`; trace shows a request still pending | Race: one-shot read before the app settled | Register `page.waitForResponse(...)` before the triggering action, await after; assert with web-first assertions (`toBeVisible`, `toHaveURL`, `toHaveText`) | sleeps, `waitForLoadState()` (returns immediately if the page is already loaded) |
| Click "succeeds" but nothing happens; element visible and enabled | App not ready (hydration, socket, handlers not attached) | Wait for the app's readiness signal (`data-connected`, `aria-busy="false"`, `data-state="ready"`), ask the app team for one if none exists | sleeps, `force: true`, retries |
| `Timeout Nms exceeded` on an action; call log says "element is not enabled" | Locator is fine; the element is waiting on something slow. Identify **which** timeout (action, navigation, expect, test, webServer) and where N is set | If the wait is legitimate and the configured timeout is shorter than real latency, the config is the bug: raise it there (above the slowest legitimate wait, with a comment), so every test in that profile is fixed. Optionally also wait explicitly on the readiness state so a regression fails with a clear message. A test-only workaround leaves the trap for the next test | raising the test timeout blindly, retries |
| Passes alone or with `--workers=1`, fails in parallel; values like `undefined` in URLs | Coupling: module-level `let` set by another test, fixed emails/ids, order dependence, `beforeAll` shared data, a mid-run reset | Each test creates its own data via the API with unique values; never share state between tests. Workers are separate processes: module variables are not shared | `mode: 'serial'`, `--workers=1`: encodes the coupling, kills parallelism |
| Lands on `/login`, or 401 with `storageState` | Saved session missing (ENOENT) **or** present but rejected. Check the trace: was the cookie sent? Then follow the setup projects' `dependencies` order: a later setup that resets data or logs out invalidates the session; so does another invocation's `globalSetup` reset on a shared server (a concurrent run, `--no-deps`, an IDE run with setup projects unticked: the VS Code extension runs only the projects checked in its list); also expiry, wrong domain/baseURL, sessionStorage not captured. Replaying the saved cookie against the API gives 401 when rejected | Fix the setup order or remove the mid-run reset; wait for proof of login before saving state | logging in inside each test |
| `ENOENT` on `test-results/.playwright-artifacts-*` (traces, network) while the assertions passed | Another run in the same checkout cleaned the shared output folder: an environment collision, not a test failure | Rerun with its own `--output=test-results/<name>` | changing the test |
| Works locally, fails in CI | Config profile differs: `process.env.CI` branches, `extraHTTPHeaders`, timeouts, workers, retries, baseURL, OS (screenshot baselines) | Change the config, with a comment saying why | `test.skip` in CI |
| App returns a wrong value against the spec | Real bug | Keep the correct assertion; `test.fail()` with an issue annotation and a bug report | editing the expectation to match the bug |

The evidence for the cause must include at least one fact read from an artifact (the error text, `error-context.md`, a trace request or snapshot), not only a run comparison. If a fact is inferred rather than observed, check it in the trace before claiming it.

Before editing anything, state: "I think it is A. If so, I expect to see B (in the trace / running alone / with one worker)." Then run the cheapest check that confirms or kills it.

## 4. Fix the cause

- Fix it where it lives: the test, the fixture, the setup project, or the config.
- When the cause is how the run was started (IDE project selection, a concurrent run, `--no-deps`), the fix is to the run setup: no test-code change unless the engineer asks.
- Never fix flake with retries, bigger timeouts, `waitForTimeout`, `force: true`, `.first()`, or serial mode. If a timeout really must change, name the real-world latency it accommodates.
- Do not change application code to make a test pass. If the app is wrong or lacks a readiness signal, say so.
- Say out loud what you are not doing and why ("not `.first()`, because the cross-sell renders above the product").

## 5. Prove it under the conditions that broke it

- Same config and project (`-c`, `--project`), same worker count as CI.
- Timing bug: `--repeat-each=20`. Parallel bug: `--repeat-each=5` with several workers. CI-only bug: the CI profile (`CI=1` or the CI config).
- Show the pass count.

## 6. Report in 4 lines

```
Cause:    <one sentence>
Evidence: <the error line, trace fact, or run comparison that proved it>
Fix:      <what changed and where>
Verified: <command and result>; follow-up: <lint rule, fixture, config comment, or app ticket>
```

Then list, in one line each, other smells you noticed in the same files but did not change (fixed emails, shared accounts, positional locators), so the engineer can decide.
