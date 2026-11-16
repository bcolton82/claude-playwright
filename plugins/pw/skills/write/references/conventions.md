# Playwright conventions (Playwright 1.65)

Existing repo conventions win. Otherwise, follow these. For anything not covered, look it up in the bundled docs (`${CLAUDE_PLUGIN_ROOT}/docs/INDEX.md`) or the repo's installed types (`node_modules/playwright/types/test.d.ts`, `node_modules/playwright-core/types/types.d.ts`) instead of guessing an API.

## Locators

**Ground truth is the rendered accessibility tree, not the source.** Accessible names come from labels, `aria-label`, `aria-labelledby`, visually hidden text, `alt` and `title`, and component libraries render markup you cannot see in the source. When the app is running, snapshot the page (the `playwright-test` or `playwright` MCP `browser_snapshot`, or `error-context.md` from a failed run) and take roles and names from it; `browser_generate_locator` gives the locator Playwright itself would pick for a snapshot element. Read source only to understand behavior, or when the app cannot run.

Priority (Playwright's own order, label moved up for form fields):

1. `page.getByRole('button', { name: 'Place order' })`: buttons, links, headings, checkboxes, rows, dialogs, regions. Add `exact: true` when one name is a prefix of another ("Save" vs "Save draft").
2. `page.getByLabel('Email')`: form controls with a label.
3. `page.getByPlaceholder('Search orders')`: inputs with no label (say in a comment that the missing label is an a11y bug).
4. `page.getByText('Order confirmed')`: non-interactive text.
5. `page.getByAltText('Company logo')`, `page.getByTitle('Issues count')`: images and titled elements.
6. `page.getByTestId('order-total')`: when there is no user-facing handle (never `locator('[data-testid=...]')`; configure `testIdAttribute` if the app uses another attribute).
7. CSS or XPath only as a last resort, with a comment saying why. App-defined signals (`[data-phx-main]`, `body[data-connected]`) are fine as CSS.

**Positional locators are off-limits** (`.nth()`, `.first()`, `.last()`): they pick whichever element renders first, which changes with data, A/B tests and layout. Narrow instead: scope to the owning region or row, `filter({ hasText })`, `filter({ has })`, `.visible()` (1.63+, replaces `:visible`), `exact: true`. Use a positional locator only when order is the behavior under test (the first row after sorting) or nothing unique exists, and mark the line `// pw-allow <reason>`. The hook rejects them otherwise.

- **Strict mode** is a feature: a locator that matches 2+ elements throws on actions. Fix it by scoping to the region that owns the element: `page.getByRole('article', { name: 'Trail Runner' }).getByRole('button', { name: 'Add to cart' })`, or `button.within(region)` (1.64+).
- Scope rows by content: `page.getByRole('row', { name: /SKU-123/ }).getByRole('button', { name: 'Remove' })`.
- Never invent a locator. If a locator matches 0 or 2+ elements on its first run, re-snapshot the page instead of guessing a variant.
- Text assertions: a **string** expected value normalizes whitespace and line breaks; a **RegExp** matches the raw text, so `/Total cents 1500$/` fails on `"Total cents\n    1500"`. Prefer strings (`toHaveText('Total cents 1500')`) or `toContainText`; in a RegExp use `\s+` between words.

## Assertions

- Web-first, auto-retrying: `toBeVisible`, `toBeHidden`, `toHaveText`, `toContainText`, `toHaveValue`, `toHaveURL`, `toHaveCount`, `toHaveAttribute`, `toBeEnabled`/`toBeDisabled`, `toBeChecked`.
- Never `expect(await locator.isVisible()).toBe(true)`, `expect(await locator.textContent())`, `expect(page.url())`, or `const t = await x.textContent(); expect(t)...`. They read once and do not retry.
- Values that settle over time and are not locators: `await expect.poll(() => api.getOrder(orderId).then((order) => order.status)).toBe('shipped')`.
- Accessibility-backed checks prove wiring, not just presence: `toHaveAccessibleName`, `toHaveAccessibleDescription` (error message linked by `aria-describedby`), `toHaveAttribute('aria-invalid', 'true')`, `toBeFocused`. `toHaveAccessibleDescription` also passes when the linked message is hidden: pair it with `toBeVisible()` on the message when "shown" is the requirement.
- Absence: `toHaveCount(0)` means not rendered; `toBeDisabled()` means rendered but inert. Assert the one the spec says.
- Disappearing elements (toasts): assert `toBeVisible()` with the text, then `toBeHidden()`; raise its timeout only by the documented display time.
- Useful failure messages: `expect(response.status(), await response.text()).toBe(201)`, but only when the page stays put. If the action navigates (form submit, redirect), the body is gone once the page leaves: assert `response.status()` alone.
- Compute expected values from the rule and the inputs (integer cents, a `formatCents` helper), don't hand-type derived strings.

## Waiting and readiness

- No `page.waitForTimeout`, no `setTimeout` sleeps, no `waitForLoadState('networkidle')`.
- `waitForLoadState()` resolves immediately if the page already loaded; it does not wait for a navigation a click starts. Use `toHaveURL` / `waitForURL`.
- **Wait for the response the action triggers**, registering before the action:
  ```ts
  const checkoutResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/checkout') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Place order' }).click();
  expect((await checkoutResponse).status()).toBe(201);
  ```
- **App readiness signals.** Actionability (visible, stable, enabled, receives events, not inert) does not cover apps that render before their handlers attach (hydration, LiveView sockets) or that show stale values while recalculating. Look for the app's own signal and wait on it: `await expect(page.locator('body')).toHaveAttribute('data-connected', 'true')`, `await expect(summary).toHaveAttribute('aria-busy', 'false')`, `data-state="ready"`. Put it in the page object's `goto()` or a `waitUntilSettled()` helper. If no signal exists, say so and ask the app team for one.
- **Phoenix LiveView** sets real signals you can wait on: the LiveView container (`[data-phx-main]`) gets the class `phx-connected` once the socket joins (`phx-loading` before that; `phx-error`, `phx-client-error` or `phx-server-error` when it drops; verified against phoenix_live_view 1.2). Before the first interaction: `await expect(page.locator('[data-phx-main]')).toHaveClass(/phx-connected/)`. While an event is in flight the element carries `phx-click-loading`, `phx-submit-loading` or `phx-change-loading`: assert the outcome, or `expect(form).not.toHaveClass(/phx-submit-loading/)`. LiveView navigation (`push_patch`, and `push_navigate` after a save) fires no load event, so `waitForURL` hangs with its default `waitUntil: 'load'`: use `toHaveURL`, or `waitForURL(url, { waitUntil: 'commit' })`. Inputs with `phx-debounce` update the server after the delay: assert the result, never sleep. Validation errors render server-side after `phx-change`.
- **SPA hydration (React/Next/Vue)**: server-rendered markup can be visible before handlers attach. Prefer an app signal (a `data-hydrated` attribute, an enabled button that starts disabled); otherwise assert a state only the hydrated app can produce before acting. Next.js dev mode compiles routes on first hit: raise `webServer.timeout`, not test timeouts.
- Assert transient states (loading, disabled) only when the server reliably holds them long enough; otherwise control timing with a held route (see Mocking).
- Avoid `{ force: true }`. If an element is not actionable, find out why.

## Data and isolation

- Each test creates what it needs, usually through the API, with unique values (`shopper+${Date.now()}-${test.info().workerIndex}@example.com`, or `crypto.randomUUID()`).
- No module-level `let` that one test writes and another reads: workers are separate processes, and `fullyParallel` splits a file across them.
- Never depend on test order. `--shuffle` (1.64+) finds hidden order dependence.
- Never reset shared state mid-run; reset once in global setup. For a truly shared resource, use a test lock (`{ lock: 'user-settings' }`, 1.63+) rather than serial mode.
- Seeding browser storage: `page.addInitScript` runs before every navigation in that page, so it re-seeds on reload. Guard it if the app writes the same key (`if (!localStorage.getItem(key)) localStorage.setItem(key, value)`), or seed once via `storageState`.
- `fill()` respects `maxlength`; an over-long value is truncated, which changes what you are testing.

## Structure

- File per feature or flow: `checkout.spec.ts`, `orders-api.spec.ts`.
- `test.describe` per behavior group; titles read as behavior: `rejects edits once the order is picked`.
- Tags: `test('...', { tag: ['@smoke', '@api'] }, ...)`; filter with `--grep @smoke`.
- `test.step('Pay', async () => ...)` for flows with more than ~3 phases; step names show in reports and traces.
- Page objects expose user intent (`addToCart(product)`, `placeOrder()`) and locators; assertions live in tests, except a reused readiness wait.
- Custom fixtures via `test.extend`: page objects, API clients, seeded data. Worker-scoped (`{ scope: 'worker' }`) for expensive things like auth tokens. Worker fixtures cannot use the test-scoped `baseURL`; read it from a shared env module.
- Code after `await use(value)` is teardown.

## Readability

A spec should read as documentation of the behavior: someone who has never seen the app learns what it promises from the file alone.

- **Names say what a thing is, in the domain's words.** `placeOrderButton`, `checkoutResponse`, `invalidZipCases`, `TOAST_DISPLAY_MS`, not `btn`, `res`, `data`, `c`, `x`. Callback parameters too: `(response) => response.status()`, not `(r) => r.status()`. Booleans read as questions (`isSeeded`), and functions start with a verb (`fillShippingForm`, `countCheckoutPosts`).
- **No magic values.** Name expected data and timings once (`const VALID_ZIP = '10001'`, `const TOAST_DISPLAY_MS = 2_000`). Keep a literal inline only when it is the expected text itself, which reads better than a constant (`toHaveText('Enter a 5-digit ZIP code')`).
- **Arrange, act, assert, separated by one blank line.** Setup and navigation first, then the one action under test, then the assertions. Don't mix actions into the assertion block.
- **Helpers and page-object methods are named by intent** (`placeOrder(page)`, `fieldMessage(page, text)`), are defined once at the top of the file or in a page object, and replace repeated code. If the same `waitForResponse` predicate or locator appears twice, extract it.
- **Data-driven cases are a table** of named fields with a readable `title` (`{ title: 'a 4-digit ZIP', field: 'zip', value: '1234', message: '...' }`), each changing exactly one thing from a valid baseline, with one `test()` per case in a loop. The loop variable is named for what it holds (`for (const invalidField of cases)`), not `c`.
- **Comments explain why, never what.** Write one only for things the code can't say: why a wait or route is there, which rule a number comes from, why an assertion proves the behavior, a known app bug. Don't narrate what the next line does.
- **Comments go on their own line, directly above the code they explain**, never trailing at the end of a line. One comment can cover a block of related lines. The only trailing comments allowed are tool directives (`// pw-allow <reason>`, `// @ts-expect-error`, `// eslint-disable-line`).

```ts
// Bad: trailing comments, and the reader has to work out what they refer to.
await expect(input).toHaveAccessibleDescription(c.message); // error is wired to this field
expect(posts.count).toBe(0); // validation is synchronous, so a request would already have been sent

// Good: the reason sits above the line it explains.
// The error must be wired to this field (aria-describedby), not just shown near it.
await expect(input).toHaveAccessibleDescription(invalidField.message);

// Validation is synchronous, so a request would already have been sent by now.
expect(checkoutPosts.count).toBe(0);
```

## Auth

- Log in once in a setup project (`testMatch: /.*\.setup\.ts/`), wait for proof of login (a signed-in heading or URL) before `page.context().storageState({ path })`, and make the browser project depend on it.
- `storageState` captures cookies, localStorage and (with `indexedDB: true`) IndexedDB; not sessionStorage.
- Anonymous tests in an authenticated project: `test.use({ storageState: { cookies: [], origins: [] } })`.
- One state file per role; gitignore the `.auth` folder.
- `page.request` shares the page's cookies live. The `request` fixture starts from the project's `storageState` (so it is signed in within an authenticated project) but doesn't see cookies the page sets later. Opt out with `test.use({ storageState: { cookies: [], origins: [] } })`.
- API tests: get a token once per worker in a worker-scoped fixture.

## API tests

- `request` fixture (or `playwright.request.newContext({ baseURL, extraHTTPHeaders })`).
- Status first (with the body in the message), then shape and key values, then invariants the type system cannot check (`total === subtotal + fee`).
- Negative paths: 400 with field details, 401 (no header, bad token, wrong scheme), 404, 409 conflicts. After a rejected write, read back and prove nothing changed.
- Runtime shape checks: the repo's schema library if it has one, otherwise a small hand-rolled type guard.
- 404 vs 403 for someone else's resource is a deliberate choice (do not leak existence); assert what the spec says.

## Mocking (`page.route`)

- Register routes before `page.goto`.
- Globs match the whole URL: `*` excludes `/`, `**` includes it, `?` is a literal `?`. A URL with a query needs `'**/api/delivery-estimate?*'`; or use a RegExp or a predicate.
- Patch real responses to keep the contract honest: `const response = await route.fetch(); await route.fulfill({ response, json: { ...(await response.json()), estimatedDate: '2026-12-24' } })`.
- Errors: `route.fulfill({ status: 500 })`, `route.abort()`.
- Hold a request open without timers (assert the loading state, then release):
  ```ts
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/delivery-estimate?*', async (route) => {
    await held;
    await route.continue();
  });
  // ... assert loading state ...
  release();
  ```
- Assert a request was NOT sent: count matching requests with `page.on('request', ...)` and expect 0 after the UI has settled.
- Say in the title or a comment that the response is mocked. Mocks drift from the real API; keep one real-API test for the same flow.
- Time: `page.clock.setFixedTime(...)` for "today", `page.clock.install()` + `runFor`/`fastForward` for timers. Never wait real time.

## Dialogs, frames, files

- Native `alert`/`confirm`/`prompt` dialogs are auto-dismissed unless you register a handler before the action: `page.once('dialog', (dialog) => dialog.accept())`. Assert `dialog.message()` in the handler.
- Frames: `page.frameLocator('iframe[title="Payment"]')` or `locator.contentFrame()`.
- Downloads: `const download = page.waitForEvent('download'); await click; await (await download).path()`. Uploads: `locator.setInputFiles(path)`.

## Known bugs

- Keep the assertion for the **correct** behavior and declare the test as expected to fail with an issue annotation:
  ```ts
  test.fail('refunds the protection fee on cancel', { annotation: { type: 'issue', description: 'https://tracker/BUG-123' } }, async ({ request }) => { ... });
  ```
  When the bug is fixed the test reports "expected to fail, but passed", prompting removal. Never edit the expectation to match the bug. (`test.fixme` skips instead of running; use it when the test cannot run at all.)
- A `test.fail` test passes on **any** failure, so make the failure point unambiguous: assert the preconditions first (sign-in succeeded, data created) and give the bug assertion a message (`await expect(page, 'off-site redirect').toHaveURL('/portal')`). Write it as `test.fail` from the start when the bug is already known (a plan's Suspected bug, a traced rule); if the bug isn't real, the run says "expected to fail, but passed".
- To check where an expected failure failed: the line and list reporters show only "passed", so add the JSON reporter to that run (`--reporter=line,json` with `PLAYWRIGHT_JSON_OUTPUT_NAME=<file>`) and confirm the error carries the bug assertion's message. Don't remove the annotation to see the error.
- Use control cases to narrow a bug (with vs. without the feature, boundary values).

## Flaky tests

- Reproduce first: `--repeat-each=20 --workers=1`, then with more workers, then `--shuffle`.
- Read `error-context.md` and the trace (`npx playwright trace ...`, see the debug skill) before changing code.
- Fix the cause (a missing wait on a condition, shared data, a race). Never add retries or sleeps to hide it. Quarantine with a tag and a ticket if a fix must wait.

## More

- CI, sharding and reports: `references/ci.md`.
- Visual comparisons and ARIA snapshots: `references/visual.md`.
