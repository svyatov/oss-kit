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

Commits use Conventional Commits: `type(scope): description`. Branches use the same types: `type/kebab-description`, as in `feat/forge-detection-controls` or `fix/site-omit-unreleased`. A release branch is `chore/release-X.Y.Z`.

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

Every rule also has an entry in `skills/oss-audit/rule-sources.json`, keyed by ID, holding `sources`, an optional `verified` date, and an optional `note`. `tests/rule-sources.test.ts` enforces two things about it: a `verified` date needs at least one source, because a date with nothing behind it cannot be re-checked; and a rule whose `sources` are empty needs a `note`, because a rule holding this project's own position with no argument recorded is one nobody can challenge. Write that note to answer what was observed, and what would retire the rule. The docs site prints it on the rule page in place of a source list, so it is public prose, not an internal comment. Set `verified` only to a day a source was actually read.

`scripts/rule-freshness.mjs` reports against the rules that have a source and lists the own-position rules separately. It never gates: a metric that fails a build becomes a chore somebody disables.

## Provenance in sources.json

A skill derived from third-party work carries a `sources.json` naming the upstream it came from, the copyright holders, and how this fork differs. The `modifications` array is that last part. It records the difference as it stands now, not the route taken to reach it.

Write an entry when a change that ships moves the fork further from upstream. Fold one release's worth of change to one skill into as few entries as the divergence needs. While a release is unreleased, amend its newest entry rather than appending another. A tag freezes that entry, and the next change starts a new one. Never append one entry per commit, and never during an editing session.

Where a later change reverses an earlier one, delete both entries. A third entry recording the reversal leaves a reader replaying the sequence to learn the standing difference. `CHANGELOG.md` carries what each release changed and git history carries the rest, so an entry that duplicates either is the wrong entry.

Read the file an entry describes before keeping the entry. An entry survives only while what it claims is still true. One carried forward on trust once advertised guidance the skill no longer had.

This prose is public. `README.md` points a reader at it for attribution. It is also the record of change that the Google developer documentation style guide's CC BY 4.0 terms require. `tests/authored-docs.test.ts` parses each file and fails on an em dash, an en dash, or ` -- `, which is the only check any of them gets.

## Standard.md rules that do not apply here, or apply later

This repository is scored against `skills/oss-audit/STANDARD.md` like any other. The rules below are recorded here rather than fixed, because they either do not reach this repository or wait on an event that has not happened yet.

Not applicable:

- R-CI-04: no CI step caches anything, and the rule now says a CI configuration defining no dependency cache falls outside it rather than satisfying it with nothing to check.
- R-SEC-06: GitLab-only rule; this repository is on GitHub.
- R-PUB-01 through R-PUB-06: oss-kit ships through git, `npx skills add`, and the Claude Code plugin marketplace. The PUB preamble now reaches two populations, registry publishers and repositories attaching a built asset to a forge release, and this repository is neither: it publishes to no registry, and its releases carry only the source archives GitHub generates. So the whole area is still out of scope by its preamble and its rules are not checked one at a time. Watch this if a release ever attaches a built file, because R-PUB-05 and R-PUB-06 would both start applying that day.
- R-CHG-05: no public item has been removed, and the rule now says a project that has removed none falls outside it.
- R-CHG-06: this repository ships only its source, and every dependency it has is a development or build-time one, so no run-time vulnerability can reach a user and none has been fixed in a release. The rule's own clause places a project that has fixed none outside it. The day a release attaches a built file is the day this changes, because the rule counts a build toolchain as run-time from then on. That is the same event the R-PUB entry above says to watch for.
- R-SEC-12: one principal holds every merge path here. `gh api repos/svyatov/oss-kit/collaborators?affiliation=all` returns the owner and nobody else, so the rule falls outside this repository rather than failing. Adding anyone at Write, Maintain, or Admin is what brings it back, and that day the `main` ruleset needs `required_approving_review_count` raised to 1 and `require_code_owner_review` turned on.
- R-COM-06: same condition, stated in the rule's own `Check:`. `CODEOWNERS` is kept anyway, because it costs nothing and becomes live the day a second principal is added.

One badge criterion was considered during the 2026-07-30 Passing alignment and declined, so nobody re-opens it as an oversight. `documentation_interface` asks a project to provide reference documentation describing the external interface of what it produces. Upstream it is a MUST with `na_allowed` and a justification required, so a project may mark it not applicable. No rule was written for it, for three reasons. Any check this project could write reduces to a file that looks like API documentation existing, which is unobservable in the way `STANDARD.md` requires. R-CHG-02 already forces the public API to be declared, which is the half a reader needs to know what is covered. And no skill in the kit owns reference documentation, so a rule would have no `Fixed by:` line to name.

R-COM-08 is met by the Governance section of `CONTRIBUTING.md`: one maintainer decides and releases, only the maintainer has write access so every contribution arrives from a fork, and no succession is arranged. The rule is deliberately satisfiable by a solo project stating that it is one, so the section says that plainly rather than inventing a governance structure. It also records the one decision that is not a judgement call, that a rule changes when there is an upstream source for the change. R-COM-07 is met: the description, the homepage, and eight topics are set, all three readable with `gh repo view --json description,homepageUrl,repositoryTopics`. They are forge settings, so no file records them and no diff shows them changing. The social preview image is still unset, and R-COM-07 does not ask for one.

R-CHG-03 was pending, until 0.2.0 was tagged: three plugin manifests and the newest `CHANGELOG.md` heading said 0.2.0 while the newest tag said `v0.1.0`. Because nothing had ever consumed 0.2.0, the fix folded the accumulated `Unreleased` section into it and dated it at the tag, rather than tagging an old commit and opening 0.3.0. Folding a release that never shipped means dropping every entry that describes a change to something introduced in the same release: the site landed in 0.2.0, so the entries tuning its page titles, sidebar, and search index described a state no user ever saw.

The public API that R-CHG-02 requires is declared in the README under Versioning: skill names and paths, rule IDs and what they require, the validator's command line, and the manifest paths each host reads. A skill body's wording and the `references/` layout are deliberately outside it, so prose can be improved in a patch. Tightening what a rule requires is incompatible, because a repository that passed yesterday fails today.

`CHANGELOG.md` pins Keep a Changelog 2.0.0, which was published on 2026-06-07 and is what `oss-changelog` prescribes. The file used to pin 1.1.0.

R-SEC-05 is met: `git cat-file -t v0.2.0` prints `tag`, and `git tag -v v0.2.0` reports a good SSH signature for the ED25519 key published at `gh api users/svyatov/ssh_signing_keys`. Verification needs `gpg.ssh.allowedSignersFile` pointed at an allowed-signers file naming that key with the tagger's email; without it `git tag -v` fails with a configuration error rather than a bad signature, which reads like an unsigned tag and is not one. The rule now carries both the fetch command and that distinction, so an audit on a fresh checkout can resolve it instead of reporting unknown.

R-SEC-04 and R-SEC-09 were both pending on the repository becoming public. It is public now, and both are set. The default branch is guarded by a repository ruleset named `main`, scoped to `~DEFAULT_BRANCH` rather than the literal branch name so renaming the branch cannot unguard it. It requires a pull request, resolved review threads, squash as the only merge method, and the four checks CI reports, and it rejects force pushes, deletion, and non-linear history. It requires no approving review, because R-SEC-12 does not reach a repository with one principal and R-SEC-04 no longer asks for one. Expect `Branch-Protection` in an OpenSSF Scorecard result to read 3 of 10 for that reason: its tiers gate each other, review is tier 2, and status checks are tier 3. That is the intended state, not a regression. Read the ruleset with `gh api repos/svyatov/oss-kit/rulesets`, not with the classic `branches/main/protection` endpoint: this repository has no classic branch protection rule, so that endpoint answers `404 Branch not protected`, which reads like an unguarded branch and is not one. Code scanning runs through CodeQL default setup rather than a workflow file, scanning `actions`, `javascript`, `javascript-typescript`, and `typescript`, so nothing under `.github/workflows/` implements it and nothing there needs maintaining for it.

The ruleset also carries a `code_scanning` rule requiring CodeQL at `security_alerts_threshold: high_or_higher` and `alerts_threshold: errors`, and a `code_quality` rule at `severity: errors`. These block on what the analysis found, where the `CodeQL` entry in `required_status_checks` only blocks on whether it reported. The `code_quality` rule is the one to watch: GitHub Code Quality is a licensed product enabled per repository, it is absent from the rulesets REST reference, and it exposes no endpoint that reports whether it is on for this repository, so `gh api repos/svyatov/oss-kit/code-quality` answering `Not Found` says nothing either way. If a pull request ever sits unmergeable on a code quality result that never arrives, that rule is the first thing to check.

A ruleset has no "Do not allow bypassing the above settings" checkbox; the equivalent is its bypass list, and this one is empty. Nothing here exempts the owner from anything. It used to hold `RepositoryRole` `5`, Repository admin, at `pull_request` mode, which existed for one reason: the ruleset required an approving review, nobody can approve their own pull request, and without the exemption every change the sole maintainer opened was unmergeable. Dropping the review requirement removed the reason, so the entry went too, and the ruleset now binds the owner as tightly as anybody else. Confirm it from the create or read response, where `bypass_actors` reads `[]` and `current_user_can_bypass` reads `never`. Do not restore the entry to unblock a merge; a required approval nobody can give, undone by an exemption for the only person it named, is strictly weaker than not requiring it.

What stops a contributor merging is not the ruleset, which keys on no one's identity, but repository access: the collaborator list holds only the owner, so every contributor works from a fork with no write access on this repository and cannot merge whatever a pull request's checks say. Granting anyone Write or Maintain is what would change that, and Triage is the role that helps with issues and pull requests without it. That same list is what R-SEC-12 reads, so granting one of those two roles turns the rule on and the review requirement with it.

R-SEC-10 is met, read back rather than inferred from the write: `gh api repos/svyatov/oss-kit --jq .security_and_analysis` reports `secret_scanning` and `secret_scanning_push_protection` both `enabled`. The same response reports `secret_scanning_non_provider_patterns` and `secret_scanning_validity_checks` disabled, which is correct rather than a gap, because both belong to GitHub Secret Protection, a paid product the rule's `Check` places outside itself. Read that field with an admin token. For a caller without admin the key is absent from the response entirely, which reads as disabled and is not.

R-SEC-11 is met on coverage and on reporting, and open on blocking. `gh api repos/svyatov/oss-kit/vulnerability-alerts -i` answers 204 and `dependabot_security_updates` reads `enabled`, but the dependency graph does not parse `bun.lock`, so `gh api repos/svyatov/oss-kit/dependency-graph/sbom` lists 10 `pkg:npm` packages against the 492 that `site/bun.lock` resolves, alongside 8 `pkg:githubactions` and 1 `pkg:github`. The `osv-scanner` workflow covers that residual: its `pull-request` job scans what the change introduces, and its `scheduled` job scans the repository weekly and reports.

What is open is the blocking half. The `main` ruleset requires four checks and `pull-request / osv-scan` is not among them, so the scan reports today and does not gate. It stays that way until a pull request from a fork runs it green, because a fork gets a read-only token while the called workflow declares `security-events: write` at its own top level. If GitHub compares the fork-capped grant rather than the declared one, that job fails at startup, produces no check run at all, and a required check that never reports blocks the merge with nothing to read. One green fork run settles it, and adding the `pull-request / osv-scan` context to the ruleset's `required_status_checks` closes the rule. Add it there and not to `code_scanning_tools`, which holds CodeQL and takes analysis tools rather than check contexts.

Two controls expose no endpoint that reports their state: Dependabot malware alerts and grouped security updates. Both are on, set by hand in the repository settings, and this paragraph is the only record of it. No read-back can confirm either, so a later audit reporting nothing about them is reporting unknown rather than disabled.

Neither `osv-scanner` job meets R-CI-05, and neither can. A job that calls a reusable workflow accepts only `concurrency`, `if`, `name`, `needs`, `permissions`, `secrets`, `strategy`, `uses`, and `with`, so `timeout-minutes` is not settable on it, and upstream's reusable workflows set no timeout of their own. The remaining option is a fork of the reusable workflow, which trades an unbounded run for an unreviewed copy of somebody else's security scanner.

## Checklist after any skill change

1. Update the skills table in `README.md` if the skill's one-line description changed.
2. Run `bash scripts/check-drift.sh`, which fails when a skill cites a rule ID that `STANDARD.md` does not define, when `STANDARD.md` names a rule as fixed by a skill that does not claim it, or when a rule names `oss-audit` as its owner.
3. Run `bun run validate` and `bun test`. `CONTRIBUTING.md` lists the full check sequence CI runs.
4. Confirm the `SKILL.md` body is still under 500 lines.
5. Where the change moves a derived skill further from its upstream, amend that skill's newest `sources.json` entry. Start a new entry only when the last one already shipped in a release.
6. Before a release, bump `version` in `.claude-plugin/plugin.json`.

## Gotchas

`claude plugin validate . --strict` accepts `"source": "./"` for a plugin declared in the same repository as its `marketplace.json`, verified on Claude Code 2.1.217. There is no need to move the plugin body into `plugins/oss-kit/`. Note that the command validates the marketplace manifest only; it prints `Validating marketplace manifest` and does not report on `plugin.json`.

Specification conformance is checked by the validator this repository ships at `skills/oss-skill/scripts/validate.mjs`. It reads files, imports only Node built-in modules, and uses no runtime-specific global, so it runs on Node 22 or later and on Bun with nothing installed. `ubuntu-24.04` ships Node.js 22.23.1, so the CI step needs no setup action. `R-SKL-02` and `CONTRIBUTING.md` both name this validator. No third-party specification validator is installed here, in CI or locally.

Dependabot has supported the `bun` ecosystem since February 2025, for the text `bun.lock` on Bun 1.1.39 or later. It ships version updates only. There are no Dependabot security updates for Bun, so a CVE in a dev dependency arrives through the weekly version bump rather than through a security alert.

`site/astro.config.mjs` imports `parseRules` from `site/scripts/generate.mjs` and builds the rules sidebar from `STANDARD.md` at config load. That is what keeps the sidebar in the order the standard argues, grouped under its own `##` headings, with no rule list duplicated in the config. Adding a rule needs no site change; renaming a `##` section in `STANDARD.md` renames a sidebar group. Autogeneration cannot do this, because it sorts by filename and would interleave the areas.

Generated pages carry an `editUrl` pointing at the source they came from, because the generated Markdown under `site/src/content/docs/` is gitignored and has no file to edit. The global `editLink.baseUrl` covers authored pages in that tree.

`site/public/og.png` is generated from `site/scripts/og.html`, which is the only place its wording lives. To change it, edit that file, serve `site/` over a local http server, screenshot the page at a 1200x630 viewport, and downscale the retina capture to 1200x630 with `sharp`, which `site/` already depends on. Serve it rather than opening `file://`: Chrome treats a `file://` page as an opaque origin and refuses the `@font-face` request, which silently substitutes a fallback font. The card carries the tagline without a terminal period, unlike the prose occurrences, because a lone dot under a centered line reads as a blemish.

This repository's issue templates are GitHub issue forms under `.github/ISSUE_TEMPLATE/`, and nothing in the dependency tree parses YAML, so a structural check has to reach for `Bun.YAML.parse`, which Bun provides as a global. The blank issue is off in `config.yml`, which it could not be before Discussions existed: the README used to answer R-DOC-08 by pointing questions at Issues, so hiding the blank issue would have closed the only channel a question had. Discussions is that channel now, the three forms cover every kind of report the tracker accepts, and the chooser links Q&A, General, and the security policy. Note that `blank_issues_enabled: false` hides the option from read and triage access only; it stays visible to the maintainer labeled "Maintainers only", so testing it while signed in as the owner proves nothing.

The two proposal forms stay in Issues rather than moving to Discussions, even though a proposal is not a defect and R-COM-09's reasoning points the other way. One maintainer with two inboxes is worse than one noisy inbox, and a filled rule proposal is already a work item, so routing it through Discussions would add a conversion step to every accepted proposal. What Discussions takes instead is the case the forms cannot: `02-rule-proposal.yml` requires a mechanical check, and somebody who thinks a rule is wrong without having a check to offer had nowhere to file before. The chooser sends them to General.

Discussions keeps all six categories GitHub creates. No category carries a form under `.github/DISCUSSION_TEMPLATE/`, because none of them collects a recurring shape of report yet; add one when a category does.

`lastUpdated` is deliberately off. It reads git commit dates for the content file, and the content files are generated and untracked; CI's shallow checkout would date them all to the same commit anyway.
