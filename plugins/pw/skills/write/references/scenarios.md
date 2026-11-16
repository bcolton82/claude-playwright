# Scenario cookbook: patterns demo sites and real apps throw at you (Playwright 1.65)

Each entry: the trap, then the idiomatic answer. Full docs: `${CLAUDE_PLUGIN_ROOT}/docs/<page>` named in brackets.

## Pages, tabs, frames

- **New tab / popup** (`target="_blank"`, `window.open`) [pages.md]:
  ```ts
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Open in new window' }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/\/windows\/new/);
  ```
  For pages opened by anything in the context: `context.waitForEvent('page')`.
- **iframes** [frames.md]: `page.frameLocator('#payment').getByLabel('Card number')`, or `page.locator('iframe[title="Payment"]').contentFrame()`. Nested frames chain. Cross-origin frames work the same.
- **Shadow DOM** [locators.md]: role, text, label and CSS locators pierce open shadow roots by default; XPath does not; closed shadow roots are not reachable.
- **Native dialogs** [dialogs.md]: auto-dismissed unless you register `page.once('dialog', (dialog) => dialog.accept('typed text'))` before the action. `beforeunload` needs `page.close({ runBeforeUnload: true })`.

## Inputs

- **Custom dropdowns / comboboxes** (not `<select>`): click the combobox, then `page.getByRole('option', { name: 'Florida' }).click()`. Native `<select>`: `selectOption('FL')` or `selectOption({ label: 'Florida' })`.
- **Checkboxes / radios**: `check()` / `uncheck()` (asserts the state changed), `toBeChecked()`.
- **Typing that triggers per-key handlers** (autocomplete, masks): `pressSequentially('Mia', { delay: 50 })`, then pick from the listbox. Otherwise `fill()`.
- **Keyboard**: `page.keyboard.press('Control+A')`; `locator.press('Enter')`. Use `ControlOrMeta` for cross-platform shortcuts.
- **Date pickers**: fill the underlying input if it accepts typed dates; otherwise navigate the calendar by role (`getByRole('button', { name: 'Next month' })`, `getByRole('gridcell', { name: '24' })`). Pin "today" with `page.clock.setFixedTime(...)`.
- **File upload** [input.md]: `await page.getByLabel('Upload').setInputFiles('fixtures/file.pdf')`; in-memory `{ name, mimeType, buffer }`; no input element: `page.waitForEvent('filechooser')` then `chooser.setFiles(...)`.
- **Download** [downloads.md]: `const downloadEvent = page.waitForEvent('download'); await click; const download = await downloadEvent; expect(download.suggestedFilename()).toBe('report.csv'); await download.saveAs(testInfo.outputPath(download.suggestedFilename()))`.
- **Drag and drop** [input.md]: `await source.dragTo(target)`; for custom DnD libraries that need intermediate moves: `hover()`, `mouse.down()`, `hover()` the target (twice), `mouse.up()`.
- **Hover menus**: `await menu.hover(); await page.getByRole('menuitem', { name: 'Profile' }).click()`.
- **Clipboard**: needs `permissions: ['clipboard-read', 'clipboard-write']` (Chromium) and then `page.evaluate(() => navigator.clipboard.readText())`.

## Content that moves

- **Dynamic loading / spinners**: assert the end state (`toBeVisible`, `toHaveText`), optionally `toBeHidden()` on the spinner. No sleeps.
- **Infinite scroll / virtualized lists**: scroll the last item into view (`locator.last().scrollIntoViewIfNeeded()`) or `page.mouse.wheel(0, 2000)`, then `expect(rows).toHaveCount(n)` or `expect.poll(() => rows.count()).toBeGreaterThan(20)`. Virtualized lists only render visible rows: assert by content, not by count of all rows.
- **Tables**: row by content `page.getByRole('row', { name: /Jordan Rivera/ })`, then the cell; a column: `page.getByRole('cell').nth(2).within(page.getByRole('row'))` (1.64+) with `toHaveText([...])`. Sorting: read `allTextContents()` after the sort assertion settles and compare with a sorted copy, or assert the expected array with `toHaveText([...])`.
- **Pagination**: assert the page indicator, then the row content; never rely on fixed row positions across pages.
- **Animations / transitions**: actions wait for stable elements; for screenshots use `animations: 'disabled'`.
- **Toasts / snackbars**: assert text with `toBeVisible`, then `toBeHidden`.

## Browser environment

- **HTTP Basic auth**: `use: { httpCredentials: { username, password } }` (not credentials in the URL).
- **Geolocation / permissions** [emulation.md]: `use: { geolocation: { latitude: 26.14, longitude: -81.79 }, permissions: ['geolocation'] }`, or `context.grantPermissions([...])` and `context.setGeolocation(...)`.
- **Locale / timezone**: `use: { locale: 'de-DE', timezoneId: 'Europe/Berlin' }`. Assert formatted dates and currency in that locale.
- **Mobile**: `...devices['iPhone 15']` (viewport, `isMobile`, `hasTouch`, user agent) in a project; `tap()` for touch. Responsive menus: assert the hamburger shows instead of the nav.
- **Color scheme / reduced motion**: `use: { colorScheme: 'dark' }`, `page.emulateMedia({ reducedMotion: 'reduce' })`.
- **Offline**: `context.setOffline(true)`.

## Network

- **WebSockets** [mock.md]: `page.routeWebSocket('wss://example.com/ws', ws => { ws.onMessage(m => ws.send('pong')); })`; inspect with `page.on('websocket', ...)`.
- **HAR replay** [mock.md]: `page.routeFromHAR('hars/api.har', { url: '**/api/**', update: false })`; record once with `update: true`.
- **GraphQL**: one endpoint, so match on the operation: `page.route('**/graphql', route => route.request().postDataJSON().operationName === 'GetCart' ? route.fulfill({ json }) : route.fallback())`.
- **Third-party noise** (analytics, chat widgets) that slows or breaks tests: `page.route(/googletagmanager|intercom/, (route) => route.abort())` with a comment.
- **Auth headers for all requests**: `use: { extraHTTPHeaders: { Authorization: ... } }`.

## Users and roles

- **Multiple users in one test** (chat, approvals): two contexts, each with its own `storageState`:
  ```ts
  const admin = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
  const user = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  ```
  Close them at the end (or wrap in a fixture).
- **Role-based projects**: one setup per role, projects with `use.storageState` and `testMatch`.
- **Login forms on demo sites** (saucedemo-style): use the setup project + storageState once login works; test the login form itself in its own spec, including locked-out and wrong-password users.
- **Email / OTP / magic link**: read the code from the app's test mailbox API or a mail-catcher (Mailpit, MailHog) via `request`; never from a real inbox.
- **CAPTCHA / bot protection**: not automatable by design. Ask for a test-environment bypass key or a disabled flag; say so in the plan.

## Accessibility

- **axe scan** [accessibility-testing-js.md]: `npm i -D @axe-core/playwright`, then
  ```ts
  import AxeBuilder from '@axe-core/playwright';
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
  ```
  Scope with `.include('#main')`; known issues with `.disableRules([...])` and a ticket.
- **Keyboard path**: Tab through a flow with `page.keyboard.press('Tab')` and `toBeFocused()`.
- **ARIA snapshot** of a component: `toMatchAriaSnapshot` (see `visual.md`).

## When the target is a hosted demo site (no local app)

- No `webServer`; set `baseURL` to the site (from an env var), and keep `workers` modest so you do not hammer a shared demo.
- The data is shared with everyone else using the site: never assume an empty state; create uniquely named data, or assert on what you created only.
- Expect real-world latency; keep the default timeouts and wait on conditions. Do not raise timeouts globally.
- Third-party scripts and ads are common: block them by route if they cause flake, and say so.
