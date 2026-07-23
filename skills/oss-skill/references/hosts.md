# Where each host looks for skills

This file records what each host reads, verified against that host's own documentation on the date noted in each section. It does not say which hosts a project should support. That is the project's decision, and `STANDARD.md` states no rule about it.

## The `skills` CLI (`npx skills add`)

Source: the `antfu/skills-cli` README, fetched from `raw.githubusercontent.com/antfu/skills-cli/main/README.md`.

Running `npx skills add <owner>/<repo>` looks inside the source repository for skills in, in order: the repository root (if it holds a `SKILL.md` directly), `skills/`, `skills/.curated/`, `skills/.experimental/`, `skills/.system/`, and a long list of agent-specific directories including `.agents/skills/`, `.agent/skills/`, and `.claude/skills/`. If none of these hold a skill, the CLI falls back to a recursive search of the repository.

`--skill <name>` (short form `-s`) installs only the named skill or skills from the source instead of every skill found. `--list` prints what is available without installing anything.

On the receiving side, the CLI writes into a per-agent skills folder, project scope by default or global scope with the `-g` flag. The path is not one pattern applied across agents: Claude Code gets `.claude/skills/` (project) and `~/.claude/skills/` (global), Amp and Kimi Code CLI share `.agents/skills/` (project) and `~/.config/agents/skills/` (global), Antigravity gets `.agent/skills/` (project) and `~/.gemini/antigravity/global_skills/` (global), and GitHub Copilot gets `.github/skills/` (project) and `~/.copilot/skills/` (global). The README's `Supported Agents` table carries the full per-agent list; read it rather than assuming a pattern for an agent not named here. Installation can create a symlink from each agent's folder to one canonical copy, or an independent copy per agent, chosen interactively.

Both `.claude/skills/` and `.agents/skills/` are among the source-side directories the CLI searches, and both are also write targets on the receiving side, for Claude Code and for Amp/Kimi Code CLI respectively.

Verified 2026-07-23 against the `main` branch of `antfu/skills-cli`.

## Claude Code

Source: `code.claude.com/docs/en/skills.md` and `code.claude.com/docs/en/plugins-reference.md`.

Outside the plugin system, Claude Code reads skills from a personal directory at `~/.claude/skills/<skill-name>/SKILL.md`, available in every project, and a project directory at `.claude/skills/<skill-name>/SKILL.md`, checked into that repository. Project skills load from the starting directory and every parent up to the repository root, and also from a nested `.claude/skills/` below the current working directory when Claude touches files there.

For a plugin, the manifest is `.claude-plugin/plugin.json`, and `name` is its only required field. Claude Code scans the plugin's own `skills/` directory by default, expecting `skills/<name>/SKILL.md` per skill; a `skills` field in `plugin.json` (a string or array of paths) adds further directories to that scan rather than replacing it. The one exception is a marketplace entry whose `source` resolves to the marketplace root: there, declaring subdirectories in `skills` replaces the default `skills/` scan instead of adding to it. A plugin with no `skills/` directory and no `skills` field falls back to loading a single `SKILL.md` at the plugin root, named by its frontmatter `name` field or, failing that, the plugin's install directory name.

A plugin marketplace is `.claude-plugin/marketplace.json` at a repository root, with required top-level fields `name`, `owner`, and `plugins`; each entry in `plugins` needs at least a `name` and a `source` telling Claude Code where to fetch that plugin from.

Any folder under a skills directory that itself contains `.claude-plugin/plugin.json` loads automatically as a plugin named `<name>@skills-dir`, with no marketplace and no install step.

Outside these tiers, Claude Code also reads an enterprise tier: skills placed in the managed policy directory that an administrator deploys through managed settings apply to every user in the organization, and when a skill name collides across tiers, enterprise overrides personal and personal overrides project. That gives four tiers in total: personal, project, plugin, and enterprise.

Claude Code scans `.claude/skills/`, not `.agents/skills/`.

Verified 2026-07-23 against the current `code.claude.com` documentation.

## Codex

Source: `developers.openai.com/codex/skills`, which redirects to `learn.chatgpt.com/docs/build-skills.md`.

Codex reads skills from repository, user, admin, and system locations. For repositories it scans `.agents/skills/` in the current working directory, in the parent directory above it, and at the repository root, when run inside a git repository. At the user level it reads `~/.agents/skills/`. At the machine or container level it reads `/etc/codex/skills/`. It also ships a set of its own skills, bundled with Codex by OpenAI. Codex follows a symlinked skill folder to its target when scanning any of these locations. Each skill is a directory holding a `SKILL.md`.

Separately, `~/.codex/config.toml` can carry `[[skills.config]]` entries with `path` and `enabled` keys. This is documented as the way to disable a discovered skill without deleting it, not as a way to declare a new discovery path.

Codex scans `.agents/skills/`, not `.claude/skills/`.

Verified 2026-07-23.

## Cursor

Source: `cursor.com/help/customization/skills`.

Cursor loads skills automatically from `.cursor/skills/` and `.agents/skills/` in the project (including nested directories such as `apps/web/.cursor/skills/` in a monorepo), and from `~/.cursor/skills/` and `~/.agents/skills/` for skills available across all projects. It also reads `.claude/skills/` and `.codex/skills/`, and their `~/`-rooted equivalents, for compatibility with skills placed for those other hosts. There is no manifest file: discovery is directory scanning, and each skill is a directory holding a `SKILL.md`.

Cursor scans both `.claude/skills/` and `.agents/skills/`.

Verified 2026-07-23.

## Gemini CLI

Source: `geminicli.com/docs/cli/skills/` and `geminicli.com/docs/extensions/reference/`.

Outside extensions, Gemini CLI reads a user directory, `~/.gemini/skills/` (aliased by `~/.agents/skills/`), and a workspace directory, `.gemini/skills/` (aliased by `.agents/skills/`). Within the same tier, `.agents/skills/` takes precedence over `.gemini/skills/`. Precedence across tiers, lowest to highest, is built-in, extension, user, workspace.

An extension's manifest is `gemini-extension.json` at the extension root. It has no field that names a skills path; an extension bundles skills by convention, in a `skills/` directory at the extension root, and Gemini CLI discovers them there automatically.

Gemini CLI scans `.agents/skills/` (as its alias for `.gemini/skills/`), not `.claude/skills/`.

Verified 2026-07-23.

## Kimi Code CLI

Source: `www.kimi.com/code/docs/en/kimi-code-cli/customization/skills.html`.

Kimi Code CLI scans four tiers, most specific first: project (`.kimi-code/skills/` and `.agents/skills/`), user (`$KIMI_CODE_HOME/skills/`, defaulting to `~/.kimi-code/skills/`, and `~/.agents/skills/`), extra directories, and built-in skills bundled with the CLI. Extra directories are not a fixed path: they are declared as a list under the `extra_skill_dirs` key at the top level of `config.toml`. A skill is either a directory holding `SKILL.md` or a flat `.md` file.

Kimi Code CLI scans `.agents/skills/`, not `.claude/skills/`.

Verified 2026-07-23.

## Keeping this current

Every claim above carries the date it was verified. A host changing its loader after that date makes the row wrong, not merely stale: re-verify against that host's own documentation before trusting a section, rather than assuming the passage of time alone is the problem.
