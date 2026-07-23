# Working in this repository

oss-kit ships nine agent skills that apply one opinionated quality bar to open source projects. Every opinion lives in `STANDARD.md` as a numbered rule. Skills cite rule IDs; they do not restate the opinions.

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

Skill directory names are prefixed `oss-` and match the frontmatter `name` exactly. The nine are `oss-audit`, `oss-community`, `oss-readme`, `oss-ci`, `oss-harden`, `oss-publish`, `oss-changelog`, `oss-writing`, and `oss-skill`.

A frontmatter `name` is 1 to 64 characters of `[a-z0-9-]` with no leading, trailing, or consecutive hyphens. A frontmatter `description` is quoted.

A `SKILL.md` body stays under 500 lines. Depth goes in that skill's `references/` directory.

Code splits by who runs it. A script a skill ships runs on a reader's machine, so it conforms to R-SKL-05: `sh` or Node, a shebang naming one of them, only Node built-in modules, no runtime-specific global, and no manifest, lockfile, or `node_modules` inside the skill. Node 22 is the floor, which rules out `import.meta.main` and TypeScript type stripping. Maintenance code under `scripts/` and `tests/` runs only here and may use Node or Bun freely.

The Agent Skills specification permits a `scripts/` directory and lists Python among its common options. R-SKL-05 is deliberately stricter, and `STANDARD.md` carries the reason.

No skill names a harness-specific tool such as `Task`, `TodoWrite`, or `Skill`, tells the reader to dispatch a subagent, or branches on which tools are available. Describe the structure of the work instead.

Before adding, installing, or documenting a tool this repository depends on, follow the link from the upstream project to the install command that project publishes. Never work the other direction, from a search result or a registry page back to a project. Every field on a registry page except the package name and the maintainer account is text the publisher typed, so a repository URL there proves nothing until you open it and confirm it exists. If upstream documents no registry install, then there is no registry package, whatever the registry shows.

When a tool fails that check, or when the installed artifact contradicts upstream documentation in any way, such as a different executable name or a different version, do not install it. Do not pin around it, and do not quietly substitute something else. Stop and bring it to the maintainer. Pinning code you have not established the origin of gives you the same code at a known revision, which is bookkeeping rather than a fix. A tool a project genuinely publishes passes in seconds, so this costs nothing in the normal case and fires only when something is wrong. Recording the contradiction in the gotchas below and carrying on is how an unvetted registry install once reached this repository, and it stayed until someone read the upstream repository.

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

Each `###` line is exactly `### R-<AREA>-<NN>: <statement>`, where AREA is DOC, COM, CI, SEC, PUB, CHG, or SKL and NN is two digits. Each rule carries exactly one `Check:` line, exactly one `Fixed by:` line naming one of the eight skills that fix rules, and exactly one `Forges:` line whose value is `github`, `gitlab`, or `both`. Numbering starts at 01 in each area and does not skip. Retired rules keep their number and are marked retired, so IDs are never reused. The SKL area carries a preamble scoping it to repositories that ship agent skills; no other area is scoped by repository type.

`oss-audit` owns no rule and must not appear in a `Fixed by:` line. It scores the repository and routes each gap to the skill that fixes it, so a rule it owned would route to itself.

## Standard.md rules that do not apply here, or apply later

This repository is scored against `skills/oss-audit/STANDARD.md` like any other. The rules below are recorded here rather than fixed, because they either do not reach this repository or wait on an event that has not happened yet.

Not applicable:

- R-CI-04: a lockfile now exists, but no CI step caches anything, so there is no cache key to get wrong.
- R-SEC-06: GitLab-only rule; this repository is on GitHub.
- R-PUB-01, R-PUB-02, R-PUB-03, R-PUB-04: oss-kit ships through git, `npx skills add`, and the Claude Code plugin marketplace, and publishes to no package registry, so there is no publish step, token, OIDC flow, or provenance to secure.
- R-CHG-05: no API has been removed, so there is no deprecation to have preceded it.

Pending, with the trigger that resolves each one:

- R-SEC-04: the remote exists at `github.com/svyatov/oss-kit`, but `gh api repos/svyatov/oss-kit/branches/main/protection` returns 403, "Upgrade to GitHub Pro or make this repository public." Resolves when the repository becomes public; `oss-harden` sets it then.
- R-SEC-09: the repository now holds JavaScript, which CodeQL supports, so the rule applies. Code scanning on a private repository needs a paid GitHub Code Security license. Resolves when the repository becomes public; `oss-harden` adds the workflow then, scanning `javascript-typescript` and `actions`.

## Checklist after any skill change

1. Update the skills table in `README.md` if the skill's one-line description changed.
2. Run the drift check, which fails when a skill cites a rule ID that `STANDARD.md` does not define, when `STANDARD.md` names a rule as fixed by a skill that does not claim it, or when a rule names `oss-audit` as its owner.
3. Confirm the `SKILL.md` body is still under 500 lines.
4. Before a release, bump `version` in `.claude-plugin/plugin.json`.

## Gotchas

`claude plugin validate . --strict` accepts `"source": "./"` for a plugin declared in the same repository as its `marketplace.json`, verified on Claude Code 2.1.217. There is no need to move the plugin body into `plugins/oss-kit/`. Note that the command validates the marketplace manifest only; it prints `Validating marketplace manifest` and does not report on `plugin.json`.

Specification conformance is checked by the validator this repository ships at `skills/oss-skill/scripts/validate.mjs`. It reads files, imports only Node built-in modules, and uses no runtime-specific global, so it runs on Node 22 or later and on Bun with nothing installed. `ubuntu-24.04` ships Node.js 22.23.1, so the CI step needs no setup action. `R-SKL-02` and `CONTRIBUTING.md` both name this validator. No third-party specification validator is installed here, in CI or locally.

Dependabot has supported the `bun` ecosystem since February 2025, for the text `bun.lock` on Bun 1.1.39 or later. It ships version updates only. There are no Dependabot security updates for Bun, so a CVE in a dev dependency arrives through the weekly version bump rather than through a security alert.

`skills-ref` was dropped from this repository entirely, not pinned differently, because `oss-skill` now bundles a validator this project maintains and CI runs. R-SKL-02 was already written to accept any specification validator, so the rule needed no change. The reason for removal rather than replacement is that `skills-ref`'s own upstream README calls it a library "intended for demonstration purposes only", not for production use. Do not restore the `skills-ref` install to CI or name it in any skill.
