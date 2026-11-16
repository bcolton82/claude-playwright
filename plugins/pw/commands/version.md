---
description: Show which pw plugin version this session loaded, and whether its source folder has uncommitted changes
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git:*)
---

- Version: !`node -p "require('${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json').version"`
- Loaded from: `${CLAUDE_PLUGIN_ROOT}`
- Commit: !`git -C "${CLAUDE_PLUGIN_ROOT}" log -1 --format='%h %s (%cr)' 2>/dev/null || echo 'not a git checkout'`
- Branch: !`git -C "${CLAUDE_PLUGIN_ROOT}" status -sb 2>/dev/null | head -1 || echo 'n/a'`
- Uncommitted files: !`git -C "${CLAUDE_PLUGIN_ROOT}" status --porcelain 2>/dev/null | wc -l | tr -d ' '`

Repeat the lines above exactly, with nothing else. This command only reports.
