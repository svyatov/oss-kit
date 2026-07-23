# Working in this repository

oss-kit ships eight agent skills that apply one opinionated quality bar to open source projects. Every opinion lives in `STANDARD.md` as a numbered rule. Skills cite rule IDs; they do not restate the opinions.

## Layout

```
skills/                  canonical location of all skill directories
skills/oss-audit/STANDARD.md   every opinion, as R-<AREA>-<NN> rules
.agents/skills           symlink to ../skills
.claude/skills           symlink to ../skills
.claude-plugin/          plugin.json and marketplace.json
AGENTS.md                this file
CLAUDE.md                symlink to AGENTS.md
```

`skills/` is canonical because it is the only path that both the `skills` CLI installer and the Claude Code plugin loader read directly. Claude Code does not scan `.agents/skills`, and most other agents do not scan `.claude/skills`, so both are committed symlinks pointing at the one real directory. Edit files under `skills/`. Never edit through a symlink path, and never replace a symlink with a copy.

`docs/` is gitignored on purpose. Planning documents live there and stay untracked. Never `git add -f` them.

## Repo rules

Skill directory names are prefixed `oss-` and match the frontmatter `name` exactly. The eight are `oss-audit`, `oss-community`, `oss-readme`, `oss-ci`, `oss-harden`, `oss-publish`, `oss-changelog`, and `oss-writing`.

A frontmatter `name` is 1 to 64 characters of `[a-z0-9-]` with no leading, trailing, or consecutive hyphens. A frontmatter `description` is quoted.

A `SKILL.md` body stays under 500 lines. Depth goes in that skill's `references/` directory.

No skill ships an executable file, and no skill contains a `scripts/` directory.

No skill names a harness-specific tool such as `Task`, `TodoWrite`, or `Skill`, tells the reader to dispatch a subagent, or branches on which tools are available. Describe the structure of the work instead.

Before adding, installing, or documenting a tool this repository depends on, follow the link from the upstream project to the install command that project publishes. Never work the other direction, from a search result or a registry page back to a project. Every field on a registry page except the package name and the maintainer account is text the publisher typed, so a repository URL there proves nothing until you open it and confirm it exists. If upstream documents no registry install, then there is no registry package, whatever the registry shows.

When a tool fails that check, or when the installed artifact contradicts upstream documentation in any way, such as a different executable name or a different version, do not install it. Do not pin around it, and do not quietly substitute something else. Stop and bring it to the maintainer. Pinning code you have not established the origin of gives you the same code at a known revision, which is bookkeeping rather than a fix. A tool a project genuinely publishes passes in seconds, so this costs nothing in the normal case and fires only when something is wrong. Recording the contradiction in the gotchas below and carrying on is how `pip install skills-ref` reached this repository.

Prose follows the `skills/oss-writing` skill in this repo: no em dashes, no en dashes, no ` -- `, no emoji, sentence-case headings, active voice, straight ASCII quotes, and no inline-header bullet lists such as `- **Thing:** text`.

Forge scope is GitHub and GitLab. A rule that applies to only one says so in its `Forges:` line.

Commits use Conventional Commits: `type(scope): description`.

## Rule format in STANDARD.md

The CI drift check parses `STANDARD.md` mechanically, so the shape is a contract:

```markdown
### R-SEC-01: Pin every third-party action to a full commit SHA

One or two sentences saying why the rule exists.

Check: the concrete observable evidence a checker looks for.

Fixed by: oss-harden
Forges: github
```

Each `###` line is exactly `### R-<AREA>-<NN>: <statement>`, where AREA is DOC, COM, CI, SEC, PUB, or CHG and NN is two digits. Each rule carries exactly one `Check:` line, exactly one `Fixed by:` line naming one of the eight skills, and exactly one `Forges:` line whose value is `github`, `gitlab`, or `both`. Numbering starts at 01 in each area and does not skip. Retired rules keep their number and are marked retired, so IDs are never reused.

`oss-audit` owns no rule and must not appear in a `Fixed by:` line. It scores the repository and routes each gap to the skill that fixes it, so a rule it owned would route to itself.

## Standard.md rules that do not apply here, or apply later

This repository is scored against `skills/oss-audit/STANDARD.md` like any other. The rules below are recorded here rather than fixed, because they either do not reach this repository or wait on an event that has not happened yet.

Not applicable:

- R-CI-03: no package manifest declares a supported runtime range, so there is no matrix to cover.
- R-CI-04: no lockfile and no cache steps, so there is nothing to key.
- R-SEC-06: GitLab-only rule; this repository is on GitHub.
- R-PUB-01, R-PUB-02, R-PUB-03, R-PUB-04: oss-kit ships through git, `npx skills add`, and the Claude Code plugin marketplace, and publishes to no package registry, so there is no publish step, token, OIDC flow, or provenance to secure.
- R-CHG-05: no API has been removed, so there is no deprecation to have preceded it.

Pending, with the trigger that resolves each one:

- R-SEC-04: branch protection is a forge setting and no remote exists yet. Resolves when the public repository exists; `oss-harden` sets it then.
- R-SEC-05: no release tag exists yet. Applies at the first signed release.
- R-CHG-03, R-CHG-04: no release tag or forge release exists yet. Apply at the first release.

## Checklist after any skill change

1. Update the skills table in `README.md` if the skill's one-line description changed.
2. Run the drift check, which fails when a skill cites a rule ID that `STANDARD.md` does not define, or when `STANDARD.md` names a rule as fixed by a skill that does not claim it.
3. Confirm the `SKILL.md` body is still under 500 lines.
4. Before a release, bump `version` in `.claude-plugin/plugin.json`.

## Gotchas

`claude plugin validate . --strict` accepts `"source": "./"` for a plugin declared in the same repository as its `marketplace.json`, verified on Claude Code 2.1.217. There is no need to move the plugin body into `plugins/oss-kit/`. Note that the command validates the marketplace manifest only; it prints `Validating marketplace manifest` and does not report on `plugin.json`.

The `skills-ref` validator has no official package on any registry. Install it from the `skills-ref` directory of the upstream repository, pinned to a full commit SHA, as `CONTRIBUTING.md` and `.github/workflows/validate.yml` both do. The PyPI package named `skills-ref` is published by an account unaffiliated with the project, and its metadata names a GitHub repository that does not exist. Do not install it, and do not restore `pip install skills-ref` to any file here.

`skills-ref validate <dir>` exits 0 on a valid skill and 1 on a name and directory mismatch, with the mismatch named in text on stderr, so a CI step can test the exit status directly and does not need to grep the output. Verified on upstream commit `492e1b7`.
