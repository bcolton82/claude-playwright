# CI for Playwright (GitHub Actions first; same ideas elsewhere)

Docs: `docs/ci.md`, `docs/ci-intro.md`, `docs/test-sharding-js.md`, `docs/test-reporters-js.md`, `docs/docker.md` (under `${CLAUDE_PLUGIN_ROOT}`).

## Config switches on `CI`

```ts
const isCI = !!process.env.CI;
export default defineConfig({
  fullyParallel: true,                 // test-level distribution, so shards are even
  forbidOnly: isCI,                    // a stray test.only fails the run instead of silently skipping
  retries: isCI ? 2 : 0,               // retries surface flakes as "flaky", they don't fix them
  workers: isCI ? 2 : undefined,       // match the runner's cores; measure before raising
  reporter: isCI ? [['blob'], ['github']] : [['list'], ['html', { open: 'never' }]],
  use: { trace: isCI ? 'on-first-retry' : 'retain-on-failure' },
  webServer: { command: 'npm start', url: 'http://localhost:3000/health', reuseExistingServer: !isCI },
});
```

## Sharded workflow

```yaml
name: Playwright
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false               # let every shard finish so the merged report is complete
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - name: Cache browsers
        id: pw-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - run: npx playwright install --with-deps chromium
        if: steps.pw-cache.outputs.cache-hit != 'true'
      - run: npx playwright install-deps chromium
        if: steps.pw-cache.outputs.cache-hit == 'true'
      - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v5
        if: ${{ !cancelled() }}        # upload on failure too, but not when the run was cancelled
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1
      - uses: actions/upload-artifact@v5
        if: failure()                  # traces and screenshots only when this shard failed
        with:
          name: test-results-${{ matrix.shardIndex }}
          path: test-results
          retention-days: 7

  merge-reports:
    if: ${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - uses: actions/download-artifact@v5
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true
      - run: npx playwright merge-reports --reporter html ./all-blob-reports
      - uses: actions/upload-artifact@v5
        with:
          name: html-report--attempt-${{ github.run_attempt }}
          path: playwright-report
          retention-days: 14
```

Key the browser cache on the exact Playwright version if the lockfile changes often; the browser build is tied to it.

## Decisions to explain

- `if: ${{ !cancelled() }}` vs `failure()` vs `always()`: `always()` also runs after a manual cancel; `!cancelled()` is usually what you want for reports, `failure()` for debug artifacts.
- Sharding splits across machines; workers split within one. `fullyParallel` makes shards even (otherwise whole files are the unit).
- Smoke first: a job running `--grep @smoke` that the full matrix `needs`, for fast feedback.
- Against a deployed preview: set `baseURL` from an env var and drop `webServer`.
- Secrets via `${{ secrets.X }}` into env; never into traces (`trace` captures request headers, so prefer `retain-on-failure` and short retention).
- 1.65: a sharded run fails with "No tests found" if no shard has tests; pass `--pass-with-no-tests` if a filter can legitimately select nothing.
- `--only-changed=origin/main` runs tests affected by the diff (fast PR signal; not a replacement for the full run).
- Other reporters: `junit` for CI test tabs, `failures` (1.65) for terse logs, `html` with `onlyFailures: true` (1.65) for small artifacts.

## Docker

Run in the official image for consistent fonts and rendering, especially for screenshots: `mcr.microsoft.com/playwright:v<version>-noble`, where `<version>` matches `@playwright/test` exactly.
