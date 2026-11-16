# Visual comparisons and ARIA snapshots

Docs: `docs/test-snapshots-js.md`, `docs/aria-snapshots.md`, `docs/screenshots.md` (under `${CLAUDE_PLUGIN_ROOT}`).

## Screenshot assertions (`toHaveScreenshot`)

Visual tests complement functional assertions; they never replace them. Assert the data first, then capture.

```ts
test('cart summary with protection', async ({ page }) => {
  // 1. Arrange deterministic data (seed via API/storage, mock dates with page.clock).
  // 2. Settle: assert the real values, and wait for the app's "settled" signal.
  await expect(page.getByTestId('cart-total')).toHaveText('$123.60');
  await expect(page.getByRole('region', { name: 'Order summary' })).toHaveAttribute('aria-busy', 'false');
  // 3. Capture.
  await expect(page.getByRole('main')).toHaveScreenshot('cart-main.png', {
    mask: [page.getByTestId('delivery-date')],   // dynamic content you do not want to pin
  });
  await expect(page.getByRole('region', { name: 'Order summary' })).toHaveScreenshot('cart-summary.png');
});
```

- Config: `expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.01 } }`, a fixed `viewport`. `caret: 'hide'` is the default. Use `stylePath` to hide volatile regions with CSS across all screenshots.
- `toHaveScreenshot` retries until two consecutive captures match, then compares with the baseline. It is a web-first assertion.
- Thresholds (`maxDiffPixels`, `maxDiffPixelRatio`, `threshold`) are set deliberately and small; raising them to hide a diff defeats the test.
- Prefer element screenshots of the region under test over full pages: fewer unrelated diffs.

## Baselines and platforms

- Baseline names carry the project and platform: `cart-main-chromium-linux.png`. A macOS baseline never matches Linux CI (fonts, antialiasing).
- Generate and update baselines in the same environment CI uses: the official Docker image `mcr.microsoft.com/playwright:v<version>-noble` (exact `@playwright/test` version), or a CI job.
  ```bash
  docker run --rm --network host -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.65.0-noble \
    npx playwright test path/to/visual.spec.ts --update-snapshots
  ```
- Commit Linux baselines only and skip elsewhere if needed: `test.skip(process.platform !== 'linux', 'Baselines are Linux-only')`. Or customize `snapshotPathTemplate` to drop `{platform}` if you only ever run in Docker.
- Update through a reviewed PR (`--update-snapshots`, which defaults to `changed`), with the HTML report's diff view as evidence. `--update-snapshots=missing` (1.64+) creates missing baselines and passes.

## ARIA snapshots (`toMatchAriaSnapshot`)

Structure-level snapshots of the accessibility tree: robust to styling changes, catch missing labels and roles, and work across platforms.

```ts
await expect(page.getByRole('navigation', { name: 'Main' })).toMatchAriaSnapshot(`
  - link "Demo Shop"
  - link /Cart \\(\\d+\\)/
  - link "Brand portal"
`);
```

Generate the first version with `--update-snapshots`, or from `error-context.md` / the MCP browser snapshot, then trim to what matters. Regexes keep dynamic text flexible.
