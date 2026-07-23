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

Reads `.cursor-plugin/plugin.json`. Install the plugin from the repository URL,
or sync `skills/` into `.cursor/skills/` in your own project.

## Kimi Code

Reads `.kimi-plugin/plugin.json`:

```
/plugins install https://github.com/svyatov/oss-kit
```

## OpenCode

Reads `.opencode/skills`, a symlink to `skills/`. Add the repository to the
`plugin` array in your `opencode.json`.

## Gemini CLI

Installs the skills directory directly, with no manifest:

```bash
gemini skills install https://github.com/svyatov/oss-kit.git --path skills
```

## Antigravity CLI

```bash
agy plugin install https://github.com/svyatov/oss-kit.git
```

## Every other agent

The skills are plain Markdown with YAML frontmatter, so any agent that reads
instruction files can use them. Copy `skills/` where your agent looks, or use
the `skills` CLI above.
