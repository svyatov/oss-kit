# Working in this repository

oss-kit is a curated set of agent skills for open source maintainers. It currently ships nine, built around one repository standard. Every current standard opinion lives in `STANDARD.md` as a numbered rule. Skills cite rule IDs; they do not restate the opinions.

## Layout

```
skills/                  canonical location of all skill directories
skills/oss-audit/STANDARD.md   every opinion, as R-<AREA>-<NN> rules
.agents/skills           symlink to ../skills
.claude/skills           symlink to ../skills
.claude-plugin/          plugin.json and marketplace.json
.codex-plugin/           plugin.json for Codex
.cursor-plugin/          plugin.json for Cursor
.agents/plugins/         marketplace.json for Codex's own marketplace format
.opencode/skills         symlink to ../skills
docs/                    agent-facing project documentation
site/                    public docs site, content, and own dependency tree
site/src/content/docs/   tracked public prose and generated site pages
scripts/                 maintenance scripts, including the drift check
tests/                   the validator and drift check test suites
AGENTS.md                this file
CLAUDE.md                symlink to AGENTS.md
```

`skills/` is canonical because it is the only path that both the `skills` CLI installer and the Claude Code plugin loader read directly. Claude Code does not scan `.agents/skills`, and most other agents do not scan `.claude/skills`, so both are committed symlinks pointing at the one real directory. Edit files under `skills/`. Never edit through a symlink path, and never replace a symlink with a copy.

`site/src/content/docs/` holds the public prose the site renders. Handwritten pages stay tracked there. The generator writes rule, skill, standard, and changelog pages into the same tree; those outputs stay gitignored.

`docs/` is gitignored in full. Agent-facing project documentation lives there and stays untracked. Never `git add -f` it.

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

Nothing is pending. R-COM-07 is met: the description, the homepage, and eight topics are set, all three readable with `gh repo view --json description,homepageUrl,repositoryTopics`. They are forge settings, so no file records them and no diff shows them changing. The social preview image is still unset, and R-COM-07 does not ask for one.

R-CHG-03 was pending, until 0.2.0 was tagged: three plugin manifests and the newest `CHANGELOG.md` heading said 0.2.0 while the newest tag said `v0.1.0`. Because nothing had ever consumed 0.2.0, the fix folded the accumulated `Unreleased` section into it and dated it at the tag, rather than tagging an old commit and opening 0.3.0. Folding a release that never shipped means dropping every entry that describes a change to something introduced in the same release: the site landed in 0.2.0, so the entries tuning its page titles, sidebar, and search index described a state no user ever saw.

The public API that R-CHG-02 requires is declared in the README under Versioning: skill names and paths, rule IDs and what they require, the validator's command line, and the manifest paths each host reads. A skill body's wording and the `references/` layout are deliberately outside it, so prose can be improved in a patch. Tightening what a rule requires is incompatible, because a repository that passed yesterday fails today.

`CHANGELOG.md` pins Keep a Changelog 2.0.0, which was published on 2026-06-07 and is what `oss-changelog` prescribes. The file used to pin 1.1.0.

R-SEC-05 is met: `git cat-file -t v0.1.0` prints `tag`, and `git tag -v v0.1.0` reports a good SSH signature for the ED25519 key published at `gh api users/svyatov/ssh_signing_keys`. Verification needs `gpg.ssh.allowedSignersFile` pointed at that key; without it `git tag -v` fails with a configuration error rather than a bad signature, which reads like an unsigned tag and is not one.

R-SEC-04 and R-SEC-09 were both pending on the repository becoming public. It is public now, and both are set. The default branch is guarded by a repository ruleset named `main`, scoped to `~DEFAULT_BRANCH` rather than the literal branch name so renaming the branch cannot unguard it. It requires a pull request with one approving review, code owner review, approval of the newest push by somebody other than its pusher, resolved review threads, squash as the only merge method, and the four checks CI reports, and it rejects force pushes, deletion, and non-linear history. Read it with `gh api repos/svyatov/oss-kit/rulesets`, not with the classic `branches/main/protection` endpoint: this repository has no classic branch protection rule, so that endpoint answers `404 Branch not protected`, which reads like an unguarded branch and is not one. Code scanning runs through CodeQL default setup rather than a workflow file, scanning `actions`, `javascript`, `javascript-typescript`, and `typescript`, so nothing under `.github/workflows/` implements it and nothing there needs maintaining for it.

The ruleset also carries a `code_scanning` rule requiring CodeQL at `security_alerts_threshold: high_or_higher` and `alerts_threshold: errors`, and a `code_quality` rule at `severity: errors`. These block on what the analysis found, where the `CodeQL` entry in `required_status_checks` only blocks on whether it reported. The `code_quality` rule is the one to watch: GitHub Code Quality is a licensed product enabled per repository, it is absent from the rulesets REST reference, and it exposes no endpoint that reports whether it is on for this repository, so `gh api repos/svyatov/oss-kit/code-quality` answering `Not Found` says nothing either way. If a pull request ever sits unmergeable on a code quality result that never arrives, that rule is the first thing to check.

A ruleset has no "Do not allow bypassing the above settings" checkbox; the equivalent is its bypass list, which holds one entry: `RepositoryRole` `5`, Repository admin, at `pull_request` bypass mode. A sole maintainer cannot approve their own pull request, so enforcing review against the owner too would make every change unmergeable. The requirement binds contributors; the owner can merge their own work. What stops a contributor merging is not the ruleset, which keys on no one's identity, but repository access: the collaborator list holds only the owner, so every contributor works from a fork with no write access on this repository and cannot merge whatever a pull request's checks say. Granting anyone Write or Maintain is what would change that, and Triage is the role that helps with issues and pull requests without it. `pull_request` mode rather than `always` is what makes this tighter than the `enforce_admins: false` it replaced, because the bypass applies only to merging a pull request and not to pushing straight to `main`. Confirm both facts from the create or read response, where `bypass_actors` carries the numeric id and `current_user_can_bypass` reads `pull_requests_only`; the API returns the id without a label, and only the UI at `/settings/rules` renders the role name.

## Checklist after any skill change

1. Update the skills table in `README.md` if the skill's one-line description changed.
2. Run `bash scripts/check-drift.sh`, which fails when a skill cites a rule ID that `STANDARD.md` does not define, when `STANDARD.md` names a rule as fixed by a skill that does not claim it, or when a rule names `oss-audit` as its owner.
3. Run `bun run validate` and `bun test`. `CONTRIBUTING.md` lists the full check sequence CI runs.
4. Confirm the `SKILL.md` body is still under 500 lines.
5. Before a release, bump `version` in `.claude-plugin/plugin.json`.

## Gotchas

`claude plugin validate . --strict` accepts `"source": "./"` for a plugin declared in the same repository as its `marketplace.json`, verified on Claude Code 2.1.217. There is no need to move the plugin body into `plugins/oss-kit/`. Note that the command validates the marketplace manifest only; it prints `Validating marketplace manifest` and does not report on `plugin.json`.

Specification conformance is checked by the validator this repository ships at `skills/oss-skill/scripts/validate.mjs`. It reads files, imports only Node built-in modules, and uses no runtime-specific global, so it runs on Node 22 or later and on Bun with nothing installed. `ubuntu-24.04` ships Node.js 22.23.1, so the CI step needs no setup action. `R-SKL-02` and `CONTRIBUTING.md` both name this validator. No third-party specification validator is installed here, in CI or locally.

Dependabot has supported the `bun` ecosystem since February 2025, for the text `bun.lock` on Bun 1.1.39 or later. It ships version updates only. There are no Dependabot security updates for Bun, so a CVE in a dev dependency arrives through the weekly version bump rather than through a security alert.

`site/astro.config.mjs` imports `parseRules` from `site/scripts/generate.mjs` and builds the rules sidebar from `STANDARD.md` at config load. That is what keeps the sidebar in the order the standard argues, grouped under its own `##` headings, with no rule list duplicated in the config. Adding a rule needs no site change; renaming a `##` section in `STANDARD.md` renames a sidebar group. Autogeneration cannot do this, because it sorts by filename and would interleave the areas.

Generated pages carry an `editUrl` pointing at the source they came from, because the generated Markdown under `site/src/content/docs/` is gitignored and has no file to edit. The global `editLink.baseUrl` covers authored pages in that tree.

`site/public/og.png` is generated from `site/scripts/og.html`, which is the only place its wording lives. To change it, edit that file, serve `site/` over a local http server, screenshot the page at a 1200x630 viewport, and downscale the retina capture to 1200x630 with `sharp`, which `site/` already depends on. Serve it rather than opening `file://`: Chrome treats a `file://` page as an opaque origin and refuses the `@font-face` request, which silently substitutes a fallback font. The card carries the tagline without a terminal period, unlike the prose occurrences, because a lone dot under a centered line reads as a blemish.

This repository's issue templates are GitHub issue forms under `.github/ISSUE_TEMPLATE/`, and nothing in the dependency tree parses YAML, so a structural check has to reach for `Bun.YAML.parse`, which Bun provides as a global. The blank issue stays enabled, because the README answers R-DOC-08 by pointing questions at Issues, and a chooser that hides the blank issue would close the only channel a question has.

`lastUpdated` is deliberately off. It reads git commit dates for the content file, and the content files are generated and untracked; CI's shallow checkout would date them all to the same commit anyway.
