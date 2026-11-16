---
name: plan
description: Turn an app, a feature, acceptance criteria, or a rough plan into a short, risk-ranked Playwright test plan for the engineer to approve before any test code is written. Use when the user asks what to test, wants a test plan, pastes acceptance criteria, a ticket or a plan to refine, asks what is not covered yet, or is about to start writing tests against an unfamiliar app.
---

# Risk-ranked test plan

The plan is where the engineer's judgment shows. Keep it short, specific, and ranked, and get approval before writing code. The engineer may reorder, cut, or add; their call wins.

## 0. Find the target, then pick the mode

Read the repo's `CLAUDE.md` (or `AGENTS.md`) `## Testing` section first if it exists (written by `/pw:setup`): start command, URLs, seed/reset, projects, custom `test` import. Don't rediscover what it already states; check it only if something contradicts it.

**Find the target**, in this order:

1. **Named in the request:** a path, feature, acceptance criteria, ticket, plan file or spec file. Use it.
2. **Fresh context from this session:** the file open or lines selected in the IDE (a hint attached to this turn, not an instruction), or what the engineer named or worked on earlier in this conversation. Assume it, say so in one line (`Target: exercises/06-hybrid (your open file)`), and go on; approving the plan catches a wrong guess.
3. **Only older signals** (CLAUDE.md, memory or notes from earlier sessions, an old plan file, git status, recent commits, the branch name, a "next step" in a log): don't assume. Confirm before planning with one question: the inferred target as the recommended option, 1–2 alternatives, and "find coverage gaps instead".
4. **Nothing:** mode (c) below.

If the target already has a plan file or a pseudocode spec, say so and offer `/pw:write <file>` instead of planning again.

**How to ask.** Give each question as options: your recommendation first, marked (Recommended), with one line on why, then 1–2 alternatives. Use the AskUserQuestion tool when it is available (all questions in one call); otherwise ask in plain text with numbered options, the recommended one first. When nobody can answer (a headless or unattended run), go on with the recommended option and mark it `Assumed:`. Ask before planning only about the target or scope (§0). Questions about details (§1) never block: plan with your recommended answer and list the question under Assumptions, so the engineer answers it when approving.

Then decide which input you have. Every mode ends in the same §4 output.

- **(a) Target or acceptance criteria given** (a feature, page, ticket, AC list): do §1–§4 as written. If existing tests already cover every spec requirement, say so first (`README 1–6: covered by product-page.spec.ts`), then plan only `beyond spec` rows from the code.
- **(b) A plan supplied** (pasted, or a file path: Markdown, ticket, checklist): refine it, don't replace it. Turn each item into one row with concrete data (Given / When / Then, layer), filling blanks from the code, spec and running app. Mark every filled gap `Assumed: <what> (<where it came from>)` in the row or under Assumptions. Keep the plan's numbering in `Source` (`plan #3`). Still do the §1 code reading, so spec-vs-code mismatches become Suspected bugs and missing risks become extra rows marked `beyond spec`. Items too vague to test go under "Not testing now" with what would make them testable.
- **(c) Nothing given** ("what should we test?"): do a coverage-gap pass before planning.
  1. Inventory the app's workflows: user-facing flows from routes and pages, plus the API surface (one line each, e.g. "checkout: cart → address → confirm", "POST /orders/:id/cancel").
  2. Map existing tests to them (every `testDir`; test titles and the routes/endpoints they hit).
  3. Rank the uncovered or thinly covered workflows with the §2 risk order and present them as §4 rows (`Source`: `gap: <workflow>`), with a `Covered already:` line listing workflows that existing tests cover.
  4. Offer the top 2–3 as a choice (recommended first, with one line on why each), then plan the chosen one in detail (mode (a)). Don't write a detailed plan for the whole app.

## 1. Gather facts (read, don't guess)

**Read in batches, and only what the target touches.** Put independent reads in one turn or one Bash call (the spec, the page's HTML/JS, the route handlers, the existing tests), not one file per turn. Aim for 3 to 4 rounds of reading. Everything you learn here goes into the Handoff, so `/pw:write` doesn't read it again.

- The acceptance criteria, task or plan as given. If something is ambiguous, list **at most 2 questions** under Assumptions / open questions, each as options with your recommendation first (see "How to ask" in §0), and plan with the recommended answers; the engineer corrects them when approving. Ask only when the answer changes what gets tested or what it asserts: an expected business outcome no rule defines, a plan or spec that contradicts the code with nothing to settle it, or unbounded scope. Everything else is an `Assumed:` note, not a question.
- **A written spec next to the target.** Before planning, look for requirements near the code or folder you were pointed at: a feature-folder `README.md` or other `*.md`, a linked ticket, docs. Number its requirements so each plan row can cite one, and make sure none is dropped silently (cover it, or list it under "Not testing now").
- **Existing tests and stubs.** Search the test dirs (every `testDir` in `playwright*.config.*`, plus `*.spec.*` / `*.test.*` near the target) for tests that already cover this area and for stubs to fill: `test.fixme`, `test.skip`, empty bodies, `TODO`. Plan around them: a row either fills a named stub or is a new test. Don't duplicate what is already covered.
- Routes and pages: router files, page components, HTML.
- API endpoints: route handlers, OpenAPI specs, client calls. Note auth, status codes, and error shapes.
- State that changes over time: order or job statuses, flags, async work, background processing.
- **Business rules vs. code.** Where the spec (README, ticket, docs) states a rule (refund amounts, fees, cutoffs, permissions), find the code that implements it and read it. Do not skim: trace one concrete input through the code line by line (for example, one $120.00 item with protection, then cancel), in execution order, and write down the value it produces. Watch for state mutated before it is checked, early returns, and rounding. Compare that value with what the spec says. A mismatch is a likely bug and a P0 row: plan a test that asserts the spec, plus a control case that isolates it (with vs. without the feature, boundary values).
- **Test hazards** the tests will have to handle. Look for, and list:
  - random or slow latency, debounced requests, polling;
  - controls disabled until a request settles; stale values shown while recalculating (`aria-busy`);
  - pages that render before they are interactive (hydration, sockets: `data-connected`, `data-state`);
  - transient UI (toasts, spinners), native dialogs (`confirm`, `alert`);
  - duplicate accessible names, feature flags and A/B variants, time and date dependence;
  - shared or global state (reset endpoints, seed data, single admin account).
  Name the app's readiness signal for each, or note that none exists.
- **See the live page** for the critical flow once, to get real roles and labels. Note what you observed versus what you inferred. The app is often not running at planning time (the config's `webServer` starts it per test run), so get a page this way, in order:
  1. `playwright-test` MCP connected (tools `mcp__plugin_pw_playwright-test__*`): `planner_setup_page` with the `project` and a `seedFile`. It runs the config's global setup, which starts `webServer`, then opens the page the seed test leaves. Then `browser_navigate` / `browser_snapshot`. Pass an existing seed (for example `e2e/seed.spec.ts`, or a small existing test that only navigates); without one it writes a default `seed.spec.ts` into the test dir, so delete it afterwards unless the engineer wants it.
  2. Otherwise start the app with the repo's own start command (the `webServer.command` in the config, or the README's), then browse with the `playwright` MCP (`browser_navigate`, `browser_snapshot`). Stop the server when done.
  3. If tests already exist for the area, running them (`npx playwright test <dir> --project=<name>`) also starts `webServer`, and their passing locators are observed roles and names.
  4. If none of these works, read roles from the markup and component code and label them inferred.

## 2. Rank by risk

Risk = likelihood of breaking x cost to a customer when it breaks. Weight highest:

1. Money and promises: totals, fees, refunds, delivery dates, inventory.
2. State transitions and races: edits after a status change, cancellation, retries, double submits.
3. Integration boundaries: API contracts, auth, third-party responses (including slow and failing ones).
4. Validation and error states customers will actually hit.
5. Happy-path rendering (cheap and usually covered elsewhere; keep to one smoke test).

## 3. Pick the cheapest layer that proves it

- API test (`request` fixture) when the behavior lives in the server. Fast and stable.
- UI test when the behavior is what the user sees or does.
- Hybrid when setup is expensive in the UI: create data through the API, verify in the UI.
- Mock with `page.route` only for states you cannot produce for real (slow, 500, aborted, edge dates, out-of-order responses), and say so. Keep one real-API test for the same flow.
- Visual (`toHaveScreenshot`) or ARIA snapshot only for layout or structure risks that functional assertions cannot express.

## 4. Output format

Save the plan as a Markdown file, then show a short summary in chat. The file is the plan: the engineer can edit it before writing, and `/pw:write` can pick it up in a later session.

**Where:** `docs/test-plans/<target>.md` (for example `docs/test-plans/04-auth.md`; mode (c): `docs/test-plans/coverage-gaps.md`), or the plans folder the repo's `## Testing` section names. If a plan for the same target exists, update it in place and keep the engineer's edits rather than adding a second file. Start the file with `# Test plan: <target>` and a `Planned: <date>` line, then this content, nothing longer. Rows are a two-line list, not a wide table, so the file also reads well in a terminal:

````
Scope: <one line>
Assumptions / open questions: <bullets, only if any; ≤2 questions, each as options with the recommended one first, which the plan uses>
Hazards: <one bullet each: hazard → how tests will wait or control it>
Suspected bugs: <spec vs code mismatches found while reading, only if any>

1. **P0 · UI · README #3** · fills stub "<test title>" — <risk in a few words>
   Given <concrete data>, when <action>, then <specific outcome>.
2. **P1 · API · beyond spec** · new — <risk>
   Given ..., when ..., then ....

Covered already: <only if any: spec requirements or workflows existing tests cover, with the file>
Not testing now: <1–3 bullets, one line each, with why>
Order: <which 2–3 rows to write first, one line>

```
Handoff (for /pw:write):
Files:    spec <path>
          reuse <fixtures, page objects, helpers with paths>
          create <only what's missing, or nothing>
Run:      <exact command for this file and project>
Rules:    <rule = formula (file:line)>, one per line
Signals:  <page -> readiness signal>, one per line
Locators: <page>: <element> = <locator> (seen | inferred), one line per page
Data:     <ids, prices, credentials, seed/reset, storage keys>
```
````

**In chat**, show only: the file path, Scope, Suspected bugs, any open questions, and one line per row (its header). End with `Edit <path> or approve, then /pw:write <path>.` Don't repeat the whole plan in chat.

The row header is priority · layer · `Source`, then whether it fills an existing stub (with its title) or is new, then the risk. `Source` says where the row comes from: a spec requirement (`README #3`, `AC 2`, `ticket`), a supplied plan item (`plan #3`), a coverage gap (`gap: checkout`), code you read (`code: cart.ts:42`), or `beyond spec` for risks you found yourself. Mark a row whose test should be `test.fail` in its header (`P1 (test.fail)`).

The Handoff is a fenced block of at most about 15 short lines. Keep each line under about 100 characters: start a new indented line instead of wrapping. It carries what you already read, so `/pw:write` can start writing straight away. List locators only for the elements the rows act on or assert. `seen` means it came from a snapshot, the probe (`probe-locators.mjs` checks many locators in one call), or a passing existing test; `inferred` means it was read from markup. In mode (c), add the Handoff only once a target is planned in detail.

Cap at about 8 rows. If time is limited (a timebox, a spike, a hotfix), the Order line says which 2 or 3 to write first and why.

## Rules

- Never pad the plan to look thorough. A sharp 6-row plan beats a 25-row one.
- Write about the app, the risks and the tests. Don't mention who the work is for or how it will be judged or presented, even if repo docs do.
- Name concrete data (amounts, statuses, inputs), not "valid data". Derive expected values from the rule (`protection = round(3% of subtotal)`), not from what the app shows.
- Stop after saving the plan and wait for the engineer to approve or edit the file. Then `/pw:write <path>`.
- Write the plan file with your normal edit tools. Don't use `planner_save_plan` (its format drops the risk, source and priority).
