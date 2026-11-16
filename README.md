# claude-playwright

A Claude Code plugin marketplace with one plugin, `pw`: Playwright Test (TypeScript) from an unfamiliar repo to a well-structured, passing suite. It sets Playwright up, writes risk-ranked test plans from the actual codebase, writes tests, page objects and fixtures to senior conventions, debugs flakes from evidence, and reviews test code for anti-patterns.

It is built to speed up an engineer's judgment, not replace it: every step stops for the engineer to approve, edit, or redirect.

## Requirements

- [Claude Code](https://code.claude.com/docs/en/overview)
- Node.js 20 or newer
- A project to test (Playwright is added by `/pw:setup` if it isn't there yet)

## Install

```bash
claude plugin marketplace add bcolton82/claude-playwright
claude plugin install pw@claude-playwright
```

Restart Claude Code, then check: `claude plugin details pw@claude-playwright`.

To install from a local clone instead, pass its path: `claude plugin marketplace add ~/code/claude-playwright`.

## Commands

| Command | What it does |
| --- | --- |
| `/pw:setup` | Detects the stack, adds Playwright with a minimal config (webServer, baseURL, traces), proves it with one smoke test |
| `/pw:plan` | Turns the app, a feature, or acceptance criteria into a short, risk-ranked test plan, saved to `docs/test-plans/<target>.md` for review, then stops for approval |
| `/pw:write` | With a plan, writes all tests in one pass with one stability run; without one, one at a time. Extracts page objects and fixtures only when duplication appears |
| `/pw:debug` | Reproduces a failure, reads the trace, classifies the cause, fixes the root cause, proves it with repeated runs |
| `pw:reviewer` agent | Read-only review: flake risk, assertion strength, locators, isolation, plan coverage |

Also included: a hook that flags hard waits, one-shot assertions, brittle locators and stray `.only` after every test edit, and the Playwright MCP server so Claude can read real roles and labels from the running app.

See [plugins/pw/README.md](plugins/pw/README.md) for details.

## Disable

```bash
claude plugin disable pw@claude-playwright
```

## License and attribution

The plugin is released under the [MIT License](LICENSE).

`plugins/pw/docs` contains documentation derived from [microsoft/playwright](https://github.com/microsoft/playwright), Copyright Microsoft Corporation, licensed under the Apache License 2.0. See [plugins/pw/docs/LICENSE](plugins/pw/docs/LICENSE) and [plugins/pw/docs/NOTICE](plugins/pw/docs/NOTICE) for the source version and the changes made.

This project is not affiliated with or endorsed by Microsoft, the Playwright project, or Anthropic.
