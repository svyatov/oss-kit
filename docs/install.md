# Install oss-kit

Every host below reads the same nine skills from the `skills/` directory of this
repository. Nothing is harness-specific except how the host finds that
directory.

## Any agent

The open `skills` CLI installs into every agent it supports:

```bash
npx skills add svyatov/oss-kit
```

One skill at a time:

```bash
npx skills add svyatov/oss-kit --skill oss-readme
```

Kimi Code CLI, OpenCode, and Antigravity have no manifest of ours to read.
Each of them finds skills by scanning a directory in your project, such as
`.agents/skills/` or `.claude/skills/`, and this command is what puts the
skills there.

## Claude Code, GitHub Copilot CLI, and VS Code

All three read `.claude-plugin/plugin.json`, whose `skills` field defaults to
`skills/`.

In Claude Code or Copilot CLI:

```
/plugin marketplace add svyatov/oss-kit
/plugin install oss-kit@oss-kit
```

In VS Code, run `Chat: Install Plugin From Source` and enter
`https://github.com/svyatov/oss-kit`.

## Codex CLI

Reads `.codex-plugin/plugin.json`. Codex CLI 0.122 or later:

```bash
codex plugin marketplace add svyatov/oss-kit
```

## Cursor

Reads `.cursor-plugin/plugin.json`. Cursor has no CLI or slash command for
installing a plugin. Install it through the Customize panel inside Cursor, or
from cursor.com/marketplace. A team admin can add it from the Dashboard,
under Plugins, Add Marketplace, Import from Repo.

## Kimi Code

Kimi Code CLI has no manifest of ours. It finds skills by scanning
`.agents/skills/` and `.claude/skills/`, so the `skills` CLI at the top of
this page is the install path.

## OpenCode

Scans `.opencode/skills/`, `.claude/skills/`, and `.agents/skills/`. The
`skills` CLI above is the install path.

## Gemini CLI

Installs the skills directory directly, with no manifest:

```bash
gemini skills install https://github.com/svyatov/oss-kit.git --path skills
```

## Antigravity

Scans `.agents/skills/` by default. The `skills` CLI above is the install
path.

## Every other agent

The skills are plain Markdown with YAML frontmatter, so any agent that reads
instruction files can use them. Copy `skills/` where your agent looks, or use
the `skills` CLI above.
