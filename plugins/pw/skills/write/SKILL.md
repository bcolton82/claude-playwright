---
name: write
description: Write Playwright Test (TypeScript) tests to senior conventions from an approved plan (including a saved plan file), a specific scenario, or pseudocode in a spec file: with a plan, all tests in one pass and one stability run; without one, one test at a time. Use when the user asks to write, add, or implement Playwright tests, page objects, fixtures, API tests, network mocks, visual or accessibility checks, or a CI workflow for Playwright, or points it at a spec file of pseudocode or comments to turn into working tests.
---

# Write Playwright tests

With an approved plan, a Handoff or pseudocode, use the fast path: all tests in one pass, one stability run, fixes in one batch. Without one, or when the engineer asks, work one test at a time so they can review and steer each one.

## Before the first test

- Batch independent reads: several files in one turn (parallel reads) or one Bash call, never one file per turn.
- If the repo's `CLAUDE.md` (or `AGENTS.md`) has a `## Testing` section, read it first and use it as the source for how the app and tests run, instead of rediscovering. If something in it turns out to be wrong, say so and propose the correction.
- Read `references/conventions.md` (in this skill's folder). Also read `references/scenarios.md` when the page has tabs, frames, uploads/downloads, drag and drop, custom widgets, infinite lists, emulation, websockets, multiple users or accessibility checks; `references/ci.md` for CI workflows and sharding; `references/visual.md` for screenshot or ARIA snapshot tests.
- Read the repo's Playwright config(s), existing fixtures and page objects, and `package.json` scripts. Existing repo conventions win over these references, including language: write JavaScript if the suite is JavaScript.
- Note the installed Playwright version (`npx playwright --version`). Do not use APIs newer than it.
- **Look things up, don't guess.** For any API or option you are not certain of, grep the bundled docs index `${CLAUDE_PLUGIN_ROOT}/docs/INDEX.md` and read the page, or grep the repo's installed types (`node_modules/playwright/types/test.d.ts`, `node_modules/playwright-core/types/types.d.ts`) for the exact signature. Avoid web fetches for Playwright docs.

**Test-aware browser tools.** When the `playwright-test` MCP server is connected (tools named `mcp__plugin_pw_playwright-test__*`), use it to see the app as a test sees it:
- `generator_setup_page` with a `seedFile` (a single test that does the shared setup: fixtures, login, seeded data; create one such as `e2e/seed.spec.ts` if none exists) and `project` opens a page in that exact state.
- `browser_snapshot` / `browser_find` for real roles and names, `browser_generate_locator` for the locator Playwright itself would pick.
- `generator_read_log` returns the recorded steps as code. Treat it as a draft: rewrite to these conventions (API setup, readiness waits, fixtures, rule-derived expectations) before saving with your normal edit tools.
- `test_list` / `test_run` (locations, projects) for quick runs. Use the CLI when you need `-g`, `--workers`, `--repeat-each` or another config.

Templates for the config, fixtures, a page object and an API client are in `templates/`. Copy and adapt them; do not paste them wholesale if the repo already has its own patterns.

## Working from a plan someone else wrote

**A plan file from `/pw:plan`** (`docs/test-plans/*.md`, or the folder `## Testing` names) is the approved plan. Read it fresh at the start: the engineer may have edited it, and their edits win over anything earlier in the conversation; deleted rows are out of scope. It already has concrete rows and a Handoff, so skip steps 1–2 below and go to the fast path. A `.md` path is a plan; a spec file is pseudocode (next section).

Other plans may be pasted text, a file path (Markdown, a ticket, a spreadsheet export), or a generic checklist ("verify checkout works"). Before the first test:

1. **Turn each item into a concrete scenario**: Given / When / Then with real data, the layer (API, UI, hybrid), and the outcome it asserts. Fill blanks from the code, README, spec and running app, not from guesses.
2. **Show the interpretation as a two-line list, the same shape as plan's rows** (no wide tables; it is read in a terminal): `N. **plan #N · <layer>** — <key assertion>`, then the Given/When/Then line indented below. Mark every gap you filled as **Assumed:** with where the assumption came from ("Assumed: valid card is not required; checkout has no payment step (checkout.js)").
3. **Ask only what changes the test, at most 2 questions, batched in one message, before writing anything.** Then write every item that does not depend on the answers. Ask only when:
   - the expected business outcome is undefined and the code could be wrong (the plan says "refunds work" but no rule says how much is refunded); never treat the app's current behavior as the expected result when it is the thing under test;
   - the plan contradicts the code and nothing else (README, spec, ticket) settles which is right: ask whether the plan is current; default to treating the plan as the spec and marking the test `test.fail` with a bug note;
   - the item is unbounded ("test the portal") and you would otherwise pick scope the engineer may not want.
   Offer a default with each question ("I'll assume X unless you say otherwise").
   **Features that do not exist at all** (no code path, no route, no mention in the spec): do not write a failing test for them. Report "not implemented" and ask whether it is planned; a `test.fail` for an unbuilt feature is noise, not a bug report. A bug is a rule that is stated somewhere and violated by code that exists.
4. **If nothing needs asking, proceed** with the stated assumptions; do not stall for approval of obvious choices. Keep the plan's numbering in test titles or a comment (`// Plan 3: refunds`) so coverage maps back.
5. Items too vague to test (for example "make sure it's fast") get named as not covered, with what would make them testable.

## Turning pseudocode in a spec file into tests

When pointed at a file (`/pw:write e2e/purchase.spec.ts`) that holds pseudocode, usually comments and sometimes half-written code, the pseudocode is the engineer's intent, not exact instructions. Implement what it means in the best way these conventions allow, even where its mechanics are wrong.

1. **Read it as a plan.** Each `test` line is a test with that title, and each indented line is a step. Turn steps into concrete actions and assertions with real data, as in the plan section above: product names → their IDs and prices in the app or shared test data, "verify total" → an expected value derived from the pricing rule in the code, not read from the screen.
2. **Keep the author's shape, fix the mechanics.** Keep their file, test titles and order, step order, and named products, quantities and fields. Correct anything that wouldn't work or isn't idiomatic, and don't ask about it:
   - `page` is a fixture, not an import: `import { test, expect } from './fixtures'` or `'@playwright/test'`.
   - "Build X page object → inject as fixtures": reuse existing page objects and fixtures if the repo has them. Otherwise create them where the repo keeps them (from `templates/`) and point the spec's import at the fixtures file.
   - A step done through the UI that is only setup, not what the test is about, may move to the API or storage if that's the repo's pattern. Keep it in the UI when the step is the behavior (a "full purchase workflow" test goes through the product, cart and checkout pages).
   - Vague checks ("verify confirmation") become specific assertions on what the app promises (order number format, status, totals, the confirmation heading).
   - Mechanics that break the conventions (a sleep "to wait for the cart", `nth(1)`, `textContent()` then `toBe`) become the idiomatic version of the same intent (a readiness wait, a scoped locator, a web-first assertion).
   - **Expected values are the exception: don't silently "fix" them, and don't copy them blindly.** If the pseudocode's number or message contradicts a stated rule (spec, README, ticket) or the code, treat it like a plan/code contradiction from the plan section: assert the spec value, mark `test.fail` with a note if the app is wrong, or ask (with a default) when nothing settles which is right.
3. **Use `test.step` for the steps** when a test has 3 or more, titled with the author's wording, cleaned up (`'Add Trail Runner Sneaker x1 and Canvas Tote x2 from the product page'`). The report and trace then read like their pseudocode.
4. **Replace the pseudocode; don't keep it.** Each pseudocode comment is replaced by its code (or becomes a `test.step` title). Keep a comment only where it says why, per the Readability rules. Leave pseudocode for tests you haven't implemented yet in place, so the file shows what's still to do. For `test.fixme` / `test.skip` stubs, remove the `fixme` / `skip` only on the stubs you implement, and leave the others untouched.
5. **Report the interpretation** before the first run, in 1 line per deviation: `Pseudocode: "<their line>" → <what you did instead> (<why>)`. Fill gaps with `Assumed:` notes, and ask only under the same rule as for plans (at most 2 questions, each with a default). Then follow the fast path. Repeat them on the `Deviations:` line of the final summary so they survive past the first message.

## Fast path (default when a plan, a Handoff block or pseudocode exists)

1. **Read once.** A plan's `Handoff (for /pw:write):` block replaces re-reading the app: read `references/conventions.md` and only the files it lists. Trust `seen` locators; probe only `inferred` and new ones, in one probe call. Without a Handoff, read the spec, the pages the tests touch and the existing fixtures and page objects in one batch.
2. **Write all files in one pass:** every test, plus any fixture, page object or helper they share. Rows marked `test.fail` are written that way from the start (`references/conventions.md`, Known bugs).
3. **First run is the stability run:** the whole file, run the repo's way, with `--repeat-each=3`. In the same turn, run the type check and the checker in one Bash call, and launch `pw:reviewer` on the changed files in the background (`run_in_background: true`).
4. **Fix in one batch:** read the evidence for every failure first (debug skill), fix them all together with the reviewer's findings (app bugs become `test.fail`, never a bent assertion), then rerun once the same way, with the type check and checker. That rerun is the stability result: don't add a separate `--repeat-each=5` run.

Use the one-at-a-time loop below when there is no plan, or when the engineer asks for it.

## Loop for each test

1. **State intent in one line**: what risk this test covers and at which layer.
2. **Find real locators and app signals.** If the app is running, snapshot each page the test touches first (the MCP tools above, or the `playwright` MCP's `browser_navigate` then `browser_snapshot`) and take roles and accessible names from the snapshot. Without MCP, the probe does the same from the terminal, using the project's Playwright and login state:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/probe-locators.mjs" /orders --base http://localhost:4000 --state playwright/.auth/user.json \
     --wait "[data-phx-main].phx-connected" --snapshot --scope "page.getByRole('main')" \
     "page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'ORD-1', exact: true }) }).getByRole('link', { name: 'Edit' })"
   ```
   It prints the ARIA snapshot and, for each locator, the match count (strict mode needs exactly 1) and what it matched. Probe every new locator before it goes into a test. Read the markup or components for behavior, or when the app cannot run. Follow the locator rules in `references/conventions.md`. Never invent a locator you have not seen. While reading, look for:
   - readiness signals (`data-connected`, `aria-busy`, `data-state`, a spinner role) and what enables or disables controls;
   - duplicate accessible names on the page (strict-mode risk; scope to a region);
   - the requests each action triggers, debounces, and native dialogs;
   - input constraints (`maxlength`, `pattern`, `type`) that change what `fill()` does.
3. **Arrange data the fast way.** Use the API or a fixture for setup, not long UI click-paths. Make data unique per test so tests run in parallel. Never share state between tests through module variables.
4. **Write the test** using web-first assertions. Register `waitForResponse` before the action that triggers it. Compute expected values from the rule, not from what the app currently shows.
5. **Run only that test**, the way the repo runs it (its config and project): `npx playwright test path/to/file.spec.ts -g "<title>" --reporter=line`.
6. **If it fails**, read the error, `error-context.md` and the trace (see the debug skill) before editing. Decide whether the test or the app is wrong. If the app is wrong, say so plainly, keep the correct assertion, and propose `test.fail(title, { annotation: { type: 'issue', description } }, body)` with a short bug report (steps, expected, actual, suspected area). Never bend the assertion to match the bug.
7. **Report back** in 2 to 3 lines: what it proves, and anything worth discussing. Save the full picture for the final summary.

## When to extract abstractions

- Page object: once a page is used by 2 or more tests, or a flow has more than ~5 interactions. Put the page's readiness wait in its `goto()`.
- Fixture: for setup that more than one test needs (authenticated API client, seeded data, page objects). Worker scope for auth tokens.
- Do not build a framework up front. Extract as duplication appears and say why.

## Before handing back

Always run the reviewer agent (`pw:reviewer`) on the files you changed (the fast path already launched it in the background), and the checker:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/check-antipatterns.mjs" <files>
```

Fix every `trailing-comment` warning by moving the comment onto its own line above the code, and reread each file against the Readability rules in `references/conventions.md`: names, arrange/act/assert grouping, no magic values, comments that say why. These are warnings because older files may follow another style. Apply them to code you wrote or changed, not to untouched lines.

Run the repo's type check (`npm run typecheck`, or `npx tsc --noEmit` only when `typescript` is installed) and report its real output; never claim types pass without running it.

In the one-at-a-time loop, then run the whole new suite once with the repo's normal worker count, and `--repeat-each=5` on anything timing-sensitive (async content, debounces, mocks that hold requests).

## Final summary (end of every run)

Write about the tests and the app, not about who the work is for or how it will be judged or presented, even if repo docs do. End with exactly this block, nothing after it except pending questions (at most 2, each with a default). When working from a plan file, also append the same block to the end of that file under `## Results (<date>)`, so a later session can see which rows are done. Only append: never edit the plan's own rows, whoever wrote them:

```
Tests:      <title> -> passed | expected-fail (bug) | failed, one per line
Files:      <created or modified, one line each>
Typecheck:  <the command and its real result> | not available (why)
Stability:  --repeat-each=<N> (<workers>): <passed>/<total>
Reviewer:   <findings fixed, findings left with reason> | not run (why)
Bugs found: <test.fail titles with one-line cause and code location> | none
Deviations: <Pseudocode/plan line -> what was done instead (why), one per line> | none
Coverage:   plan rows done <list> / remaining <list> / not testable <list>
```

