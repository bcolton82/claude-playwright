#!/usr/bin/env node
// Starts Playwright's test-aware MCP server (`playwright run-test-mcp-server`, Playwright 1.56+)
// from the PROJECT's own Playwright install, so tools like test_run, test_debug,
// generator_setup_page and browser_generate_locator match the repo's version and config.
//
// Never downloads Playwright. If the project has none yet, it exits with a message
// (run /pw:setup first; the `playwright` browser MCP server keeps working meanwhile).
//
// Env:
//   PW_TEST_MCP_CONFIG  config file or test dir, passed as -c (default: the project's playwright.config.*)
//   PW_TEST_MCP_HEADED  set to 1 to show the browser (default: headless)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();

let cli;
try {
  const require = createRequire(path.join(cwd, 'package.json'));
  cli = path.join(path.dirname(require.resolve('playwright/package.json')), 'cli.js');
} catch {
  cli = undefined;
}
if (!cli || !existsSync(cli)) {
  process.stderr.write(
    `pw: no Playwright install found from ${cwd}; the playwright-test MCP server is off. ` +
      'Run /pw:setup (or npm i -D @playwright/test), then restart Claude Code or reconnect via /mcp.\n',
  );
  process.exit(1);
}

const args = [cli, 'run-test-mcp-server'];
if (!process.env.PW_TEST_MCP_HEADED) args.push('--headless');
if (process.env.PW_TEST_MCP_CONFIG) args.push('-c', process.env.PW_TEST_MCP_CONFIG);

const child = spawn(process.execPath, args, { cwd, stdio: 'inherit' });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
