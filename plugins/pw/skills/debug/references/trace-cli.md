# Reading traces and failure artifacts from the terminal (Playwright 1.59+; flags verified on 1.65)

## What a failure leaves in `test-results/<test-dir>/`

| File | Use |
|---|---|
| `error-context.md` | Test name, location, error, and an ARIA snapshot of the page at failure. Read this first. |
| `trace.zip` | Full trace (needs `trace` set to `on`, `retain-on-failure` or `on-first-retry`, or `--trace=on`). |
| `test-failed-1.png` | Screenshot at failure (if `screenshot: 'only-on-failure'`). Read it as an image if layout matters. |
| `.last-run.json` (in `test-results/`) | Which tests failed last run; used by `--last-failed`. |

## `npx playwright trace` (stateful: one opened trace at a time)

`open` extracts a trace; every later command reads the currently opened one. Opening another trace replaces it, so do not inspect two traces in parallel.

```bash
npx playwright trace open <trace.zip>          # metadata: duration, action/request/error counts
npx playwright trace actions                   # tree of actions with ids and timing (test.step names appear here)
npx playwright trace actions --grep "click"    # filter by title (regex)
npx playwright trace actions --errors-only
npx playwright trace action <id>               # params, result, call log, source, snapshot phases
npx playwright trace requests                  # start time (same clock as actions), method, status, url, duration
npx playwright trace requests --grep api --method POST
npx playwright trace requests --failed         # status >= 400
npx playwright trace request <id>              # headers (Cookie, auth, custom headers), body
npx playwright trace console --errors-only     # browser console errors; --stdio for test stdout/stderr
npx playwright trace errors                    # errors with stacks and their actions
npx playwright trace snapshot <id>             # ARIA snapshot of the DOM at that action
npx playwright trace snapshot <id> --phase before
npx playwright trace snapshot <id> -- eval "document.querySelector('[aria-busy]')?.getAttribute('aria-busy')"
npx playwright trace snapshot <id> -- screenshot --filename=at-failure.png
npx playwright trace attachments
npx playwright trace close
```

## Reading the network against the actions

- A request with status `ERR` or no status that started before the failing action was still in flight (and was aborted when the context closed). Classic race signature.
- A request to `.../undefined` means a variable was never set in this worker: test coupling.
- A `302` to `/login` while a `Cookie` header was sent means the server rejected the session (dead session), not a missing file.
- Durations show real latency: compare them with the timeout that fired.

## Other terminal tools

```bash
npx playwright test --list                          # what would run, per project (check config/testMatch)
npx playwright test --reporter=line                 # compact output
npx playwright test --reporter=json > report.json   # machine-readable outcomes (expectedStatus vs status)
DEBUG=pw:api npx playwright test ...                # log every API call (verbose)
DEBUG=pw:browser npx playwright test ...            # browser launch problems
```

`--debug`, `--ui`, `show-trace` and `show-report` open GUIs: suggest them to the engineer, do not run them yourself.
