# Changelog

## 1.0.0

First public release of the `pw` plugin.

- `/pw:setup`: detects the stack, adds Playwright with a minimal config, and proves it with a smoke test.
- `/pw:plan`: writes a risk-ranked test plan from the codebase to `docs/test-plans/<target>.md` and stops for approval.
- `/pw:write`: writes tests, page objects, and fixtures to the conventions in `skills/write/references/`.
- `/pw:debug`: reproduces a failure, reads `error-context.md` and the trace, fixes the root cause, and verifies with repeated runs.
- `/pw:version`: reports the loaded plugin version and source.
- `pw:reviewer` agent: read-only review for flake risk, assertion strength, locators, isolation, and plan coverage.
- Anti-pattern hook on every edit to Playwright code.
- Playwright MCP and Playwright's test MCP server, using the project's own Playwright install.
- Bundled Playwright docs (JS/TS, v1.65.0) with a sync script.
