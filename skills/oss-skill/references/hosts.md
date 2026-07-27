# Where each host looks for skills

This file records what each host reads, verified against that host's own documentation on the date noted in each section. It does not say which hosts a project should support. That is the project's decision, and `STANDARD.md` states no rule about it.

## The `skills` CLI (`npx skills add`)

Source: the `vercel-labs/skills` README at `github.com/vercel-labs/skills`.

Running `npx skills add <owner>/<repo>` checks the repository root, `skills/`, the curated and experimental collections below it, and the supported clients' skill directories, including `.agents/skills/` and `.claude/skills/`. It walks the normal flat layout and one extra catalog level. Use `--full-depth` to discover skills elsewhere rather than depending on an undocumented repository shape.

`--skill <name>` (short form `-s`) installs only the named skill or skills from the source instead of every skill found. `--list` prints what is available without installing anything.

The receiving path is client-specific. Current examples are `.claude/skills/` for Claude Code and `.agents/skills/` for Codex, Cursor, Gemini CLI, GitHub Copilot, Kimi Code CLI, and the universal target. Global paths differ by client, so read the CLI's current `Supported Agents` table instead of deriving one. Interactive installation uses one canonical copy with client symlinks by default; `--copy` requests independent copies.

Both `.claude/skills/` and `.agents/skills/` are among the source-side directories the CLI searches, and both are also write targets on the receiving side, for Claude Code and for Amp/Kimi Code CLI respectively.

Verified 2026-07-24 against the `main` branch of `vercel-labs/skills`.

## Antigravity

Source: `antigravity.google/docs/skills` and `antigravity.google/docs/cli/plugins`.

Antigravity scans `<workspace>/.agents/skills/` for project skills, the current default, and keeps `<workspace>/.agent/skills/` working for backward compatibility. At the user level it reads `~/.gemini/config/skills/`.

Antigravity's CLI is `agy`. `agy plugin install` accepts a local filesystem path only; there is no documented git-URL form, so a repository has no command-line install path through Antigravity's plugin system.

Antigravity scans `.agents/skills/`, not `.claude/skills/`.

Verified 2026-07-23.

## Claude Code

Source: `code.claude.com/docs/en/skills.md` and `code.claude.com/docs/en/plugins-reference.md`.

Outside the plugin system, Claude Code reads skills from a personal directory at `~/.claude/skills/<skill-name>/SKILL.md`, available in every project, and a project directory at `.claude/skills/<skill-name>/SKILL.md`, checked into that repository. Project skills load from the starting directory and every parent up to the repository root, and also from a nested `.claude/skills/` below the current working directory when Claude touches files there.

For a plugin, the manifest is `.claude-plugin/plugin.json`, and `name` is its only required field. Claude Code scans the plugin's own `skills/` directory by default, expecting `skills/<name>/SKILL.md` per skill; a `skills` field in `plugin.json` (a string or array of paths) adds further directories to that scan rather than replacing it. The one exception is a marketplace entry whose `source` resolves to the marketplace root: there, declaring subdirectories in `skills` replaces the default `skills/` scan instead of adding to it. A plugin with no `skills/` directory and no `skills` field falls back to loading a single `SKILL.md` at the plugin root, named by its frontmatter `name` field or, failing that, the plugin's install directory name.

A plugin marketplace is `.claude-plugin/marketplace.json` at a repository root, with required top-level fields `name`, `owner`, and `plugins`; each entry in `plugins` needs at least a `name` and a `source` telling Claude Code where to fetch that plugin from.

Any folder under a skills directory that itself contains `.claude-plugin/plugin.json` loads automatically as a plugin named `<name>@skills-dir`, with no marketplace and no install step.

Outside these tiers, Claude Code also documents an enterprise tier that applies to every user in an organization and takes precedence: when a skill name collides across tiers, enterprise overrides personal and personal overrides project. The skills documentation's own location table sends this tier to "see managed settings" instead of naming a path, and the managed settings documentation in turn names filesystem paths for `managed-settings.json` and `managed-mcp.json`, but none for skills. So a documented enterprise tier exists and outranks the others; the documentation names no filesystem path for where its skills live. That gives four tiers in total: personal, project, plugin, and enterprise.

Claude Code scans `.claude/skills/`, not `.agents/skills/`.

Verified 2026-07-23 against the current `code.claude.com` documentation.

## Codex

Source: `developers.openai.com/codex/skills`, which redirects to `learn.chatgpt.com/docs/build-skills.md`, and `learn.chatgpt.com/docs/build-plugins.md`.

Codex reads skills from repository, user, admin, and system locations. For repositories it scans `.agents/skills/` in the current working directory, in the parent directory above it, and at the repository root, when run inside a git repository. At the user level it reads `~/.agents/skills/`. At the machine or container level it reads `/etc/codex/skills/`. It also ships a set of its own skills, bundled with Codex by OpenAI. Codex follows a symlinked skill folder to its target when scanning any of these locations. Each skill is a directory holding a `SKILL.md`.

Separately, `~/.codex/config.toml` can carry `[[skills.config]]` entries with `path` and `enabled` keys. This is documented as the way to disable a discovered skill without deleting it, not as a way to declare a new discovery path.

Codex's plugin system is separate from skills discovery. Its manifest is `.codex-plugin/plugin.json`, installed with `codex plugin marketplace add svyatov/oss-kit`. That command reads the marketplace list at `$REPO_ROOT/.agents/plugins/marketplace.json`.

Codex scans `.agents/skills/`, not `.claude/skills/`.

Verified 2026-07-23.

## Cursor

Source: `cursor.com/docs/skills`, `cursor.com/docs/reference/plugins`, and the Cursor 2.5 changelog.

Cursor loads skills automatically from `.cursor/skills/` and `.agents/skills/` in the project (including nested directories such as `apps/web/.cursor/skills/` in a monorepo), and from `~/.cursor/skills/` and `~/.agents/skills/` for skills available across all projects. It also reads `.claude/skills/` and `.codex/skills/`, and their `~/`-rooted equivalents, for compatibility with skills placed for those other hosts. Each skill is a directory holding a `SKILL.md`, with no manifest.

Cursor's plugin system is separate from skills discovery and requires `.cursor-plugin/plugin.json`. Install a marketplace plugin from the editor or with `/add-plugin`; use Cursor's current plugin documentation for source-repository and team-admin flows.

Cursor scans both `.claude/skills/` and `.agents/skills/`.

Verified 2026-07-24.

## Gemini CLI

Source: `geminicli.com/docs/cli/skills/` and `geminicli.com/docs/extensions/reference/`.

Outside extensions, Gemini CLI reads a user directory, `~/.gemini/skills/` (aliased by `~/.agents/skills/`), and a workspace directory, `.gemini/skills/` (aliased by `.agents/skills/`). Within the same tier, `.agents/skills/` takes precedence over `.gemini/skills/`. Precedence across tiers, lowest to highest, is built-in, extension, user, workspace.

An extension's manifest is `gemini-extension.json` at the extension root. It has no field that names a skills path; an extension bundles skills by convention, in a `skills/` directory at the extension root, and Gemini CLI discovers them there automatically.

Gemini CLI scans `.agents/skills/` (as its alias for `.gemini/skills/`), not `.claude/skills/`.

Verified 2026-07-23.

## GitHub Copilot CLI

Source: `docs.github.com/en/copilot/concepts/agents/about-agent-skills`, the Copilot CLI command reference, and `docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace`.

Copilot project skills load from `.github/skills/`, `.agents/skills/`, and `.claude/skills/`. Personal skills load from `~/.copilot/skills/` and `~/.agents/skills/`. The CLI can invoke a discovered skill explicitly or select it from its description.

Copilot CLI reads a plugin marketplace manifest, `marketplace.json`, from either of two locations: `.github/plugin/` or `.claude-plugin/`. Either satisfies it, so this repository's `.claude-plugin/marketplace.json` serves Copilot CLI with no separate file.

Add the marketplace with `copilot plugin marketplace add OWNER/REPO` in the shell, or `/plugin marketplace add OWNER/REPO` interactively, then install with `copilot plugin install PLUGIN-NAME@MARKETPLACE-NAME`.

Verified 2026-07-24.

## Kimi Code CLI

Source: `www.kimi.com/code/docs/en/kimi-code-cli/customization/skills.html` and `github.com/MoonshotAI/kimi-cli/blob/main/docs/en/customization/plugins.md`.

Kimi Code CLI scans four tiers, most specific first: project (`.kimi-code/skills/` and `.agents/skills/`), user (`$KIMI_CODE_HOME/skills/`, defaulting to `~/.kimi-code/skills/`, and `~/.agents/skills/`), extra directories, and built-in skills bundled with the CLI. Extra directories are not a fixed path: they are declared as a list under the `extra_skill_dirs` key at the top level of `config.toml`. A skill is either a directory holding `SKILL.md` or a flat `.md` file.

Kimi Code CLI also has a plugin system, separate from skills. Its manifest is `plugin.json` at the plugin root, not under any `.kimi-plugin/` directory. Install a plugin with the terminal command `kimi plugin install <url>`; there is no `/plugins` slash command.

Kimi Code CLI scans `.agents/skills/`, not `.claude/skills/`.

Verified 2026-07-23.

## OpenCode

Source: `opencode.ai/docs/skills` and `opencode.ai/docs/plugins`.

OpenCode scans `.opencode/skills/`, `.claude/skills/`, and `.agents/skills/` at the project level, walking up to the git worktree root, and `~/.config/opencode/skills/`, `~/.claude/skills/`, and `~/.agents/skills/` globally. There is no manifest file and no git-URL install command; placing a skills directory at one of these paths is the install.

The `plugin` array in `opencode.json` is a different system: it loads npm-published JavaScript and TypeScript code plugins, and has nothing to do with skills.

OpenCode scans `.agents/skills/` and `.claude/skills/`, not only `.opencode/skills/`.

Verified 2026-07-23.

## VS Code

Source: `code.visualstudio.com/docs/agent-customization/agent-plugins` and `code.visualstudio.com/docs/agent-customization/agent-skills`.

VS Code's Agent plugins feature (Preview) reads `plugin.json` from `.plugin/`, the repository root, `.github/plugin/`, or `.claude-plugin/`, checked in that priority order. Install with the Command Palette command `Chat: Install Plugin From Source`, entering a Git repository URL.

Separately, VS Code scans skills at `.github/skills/`, `.claude/skills/`, and `.agents/skills/` at the project level, and `~/.copilot/skills/`, `~/.claude/skills/`, and `~/.agents/skills/` at the user level.

VS Code scans `.claude/skills/` and `.agents/skills/`, not only `.github/skills/`.

Verified 2026-07-23.

## Keeping this current

Every claim above carries the date it was verified. A host changing its loader after that date makes the row wrong, not merely stale: re-verify against that host's own documentation before trusting a section, rather than assuming the passage of time alone is the problem.
