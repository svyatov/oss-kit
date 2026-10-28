---
title: Install oss-kit
description: Install the full oss-kit collection or one skill in a supported agent.
---

<p class="doc-kind-label">Guide · public documentation</p>

Every host below reads the current skills from the repository's canonical
`skills/` directory. Only the discovery path changes between hosts.

## Invocation

Only `oss-writing` is available for automatic selection. It supplies writing
guidance during commits, reviews, and documentation work.

The other eight skills require explicit invocation in Claude Code, Codex, and
Cursor. Use `/oss-kit:oss-audit` for the Claude Code plugin, `$oss-audit` in
Codex, or `/oss-audit` in Cursor. Substitute the skill name for another task.

Claude Code and Cursor read `disable-model-invocation` in `SKILL.md`. Codex
reads `policy.allow_implicit_invocation` in `agents/openai.yaml`.
Other hosts can load the skills, but may not enforce these controls.

## Any agent

The open `skills` CLI offers all nine skills under one row you can select in a
single keystroke, then asks which of the agents it finds to install them into:

```bash
npx skills add svyatov/oss-kit
```

The row is there because `.claude-plugin/plugin.json` names every skill
directory.

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

This repository supplies `.codex-plugin/plugin.json` for Codex.
Register the marketplace from the terminal:

```bash
codex plugin marketplace add svyatov/oss-kit
```

Then install the plugin:

```bash
codex plugin add oss-kit@oss-kit
```

If the CLI does not expose `plugin add`, use the client's plugin installation
interface after registering the marketplace.

## Cursor

Reads `.cursor-plugin/plugin.json`. Install through the IDE's Customize panel
or from cursor.com/marketplace. A team admin can use Dashboard, Plugins & MCPs,
Add Marketplace, Import from Repo.

The native catalog at `.cursor-plugin/marketplace.json` also supports Cursor
CLI. With CLI v2026.07.13 or later, register the marketplace from a terminal:

```bash
agent plugin marketplace add https://github.com/svyatov/oss-kit.git
```

Then open `/plugin` in Cursor CLI to select and install `oss-kit`.

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
