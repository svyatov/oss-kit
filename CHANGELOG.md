# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) over the public API declared in the [README](README.md#versioning).

## [Unreleased]

## [0.3.1] - 2026-07-28

### Changed

- `oss-writing` gates the commit and change-request body behind a closed trigger list instead of listing what a body carries. The default is now no body at all, and one of six named conditions has to hold before one exists. The old table read as a checklist to cover, which is where padded git prose came from.
- `oss-writing` moved the GitHub and GitLab render mechanics into `references/forge-rendering.md`, loaded only when a description is about to become a squash commit message. The body keeps one forge-agnostic rule: forge fields take one paragraph per line, unwrapped.
- `oss-writing` states a subject budget of 72 characters, counting any number the forge appends on squash. It also makes the sentence and paragraph figures hard limits, where they were signals to split. Git's 50-character subject predates the `type(scope): ` prefix, which spends 15 to 20 of those characters.
- `oss-writing` no longer bans naming the failure a change targets. Recording the run that went wrong is a reproduction, which Git's own guidance asks for; only the author's route to the fix is noise.

### Fixed

- The site's home page no longer clips the domain map on a narrow window. Between 418px and 526px the map kept its two-column form inside a narrower container, which cut off the count column, the right edge of every bay, and the active bay's marker.
- Running prose on the site is capped at 58ch rather than 72ch, which measures about 70 characters a line instead of 84. Code blocks, tables, and install commands keep the full pane.
- Every rule page's Fixed by cell links to the owning skill's list of rules rather than to the top of its page, and a skill that names its rules only in prose gets a generated list to link to. Header navigation links also clear the 24px target floor from WCAG 2.5.8.
- The README skills table keeps every skill name on one line. GitHub's table layout was squeezing the name column to the width of `community` because the descriptions in the second column took the whole budget; they are now one line each, and the skill pages carry the detail.

## [0.3.0] - 2026-07-27

Five new rules, and `oss-audit` now reports the gaps alone rather than every rule it checked.

### Added

- A tell catalog at `skills/oss-writing/references/tells.md`, 22 lexical patterns with what to write instead of each. It took the kill list out of the always-loaded body, roughly a third of the skill's rules, because the lexical tells are the part a model cannot reproduce from judgment and the composition rules are the part it can. It loads when a draft reads padded, generic, or promotional, rather than on every invocation, and it is published at [oss-kit.svyatov.com/skills/oss-writing/tells](https://oss-kit.svyatov.com/skills/oss-writing/tells/).
- Four composition rules in `oss-writing`, each of which costs a non-native reader more than a native one: name the referent, cap noun stacks at three, one instruction per step, keep the articles. Paraphrased from ASD-STE100, which is cited and never reproduced.
- A normative statements section in `oss-writing`. Uppercase MUST, SHOULD, and MAY carry their RFC 2119 and RFC 8174 meanings only where the document claims them; a README that shouts MUST has invented a requirement nobody is checking.
- R-COM-07, the forge project page says what the project is and where it lives. A search result, a social card, and the forge's own project lists show the description and the topics and render none of the README, so a project with an empty description is findable only by someone who already has the link. `oss-community` gains a step for it, and both reference files gain the field limits, the commands, and the feature tabs each forge exposes.
- A reference at `skills/oss-community/references/report-fields.md` for deriving what a bug report has to collect. It carries the test for whether a field belongs, the five places in a repository that name the axes a defect can differ on, and which form element carries which kind of fact.
- Issue forms for this repository, replacing the two Markdown templates. A bug report now asks for the harness and the model, without which a report cannot distinguish a skill whose instructions are wrong from a host that loads skills from a different path. A rule proposal collects the five parts a `STANDARD.md` rule needs, so a proposal arrives with the check that decides whether it can be scored at all.
- A test that scans the skills tree and the root documents for em dashes, en dashes, and ` -- `. It reads prose only, stripping fenced blocks and inline code, so a rule can still name the pattern it forbids. The tree had none, and now nothing can add one unnoticed.
- Four documentation rules, all fixed by `oss-readme`. R-DOC-06, the README names what the project covers and where it runs, so a reader can tell in five seconds whether they are in the audience. R-DOC-07, every fenced code block carries a language tag and, when its destination is not a shell, a sentence above it naming where it goes. R-DOC-08, the README links a public, searchable channel for questions and defect reports. R-DOC-09, the README says whether the project is maintained.
- A procedure in `oss-readme` for building the facts list: sweep the repository for candidates, record the source file of each, sort them into the five questions a reader is asking, then present the slate and stop for the maintainer to pick three to five. The writer no longer chooses alone.
- A section in `oss-readme` for projects with more than one entry point, which name one thing to run first and cover the empty-repository case separately. It rests on no external convention and says so, because the published README guidance does not address such projects at all.
- A note in `oss-writing` that GitHub turns a single newline into a line break in an issue, a pull request, or a discussion, and into a space in a Markdown file. Prose hard-wrapped the way a repository file is written therefore renders ragged once it is pasted into a pull request description. GitLab does not share the behavior, so the fault is invisible until someone opens the pull request on GitHub.

### Changed

- The release and publishing area is scoped to repositories that publish a package, the way the agent skills area is scoped to repositories that ship skills. Without a preamble the area had no stated precondition, and `oss-audit` is told not to infer one, so every repository shipping through git tags alone failed four rules for having no publish step to secure. R-CI-04 and R-CHG-05 gain the same sentence R-SEC-09 and R-SKL-05 already carried: a check with nothing to look at puts the rule out of scope rather than passing it on an empty set. Two auditors were reaching two different counts on one repository.
- R-SEC-05 names where the maintainer's signing key comes from, per forge, and says that a missing `gpg.ssh.allowedSignersFile` is the check failing to run rather than the tag failing to verify. The rule asked for a key to be imported and never said from where, so a correctly signed tag audited as unknown on every checkout that had not been set up by hand beforehand.
- R-CI-02 compares checks rather than command strings. A project may run a documented check in CI through a second runtime or through the script its documented alias wraps, which this repository does to prove its validator works on Node and not only on Bun. A documented command with no CI job behind it still fails, which is the drift the rule exists to catch.
- `oss-audit` says in its count line why the not-applicable rules were skipped, grouped by reason. The count already reported how many, and a reader could not tell a rule that does not reach their repository from one the audit dropped.
- `oss-audit` reports the gaps and nothing else. The per-rule table listed every passing rule, so a repository meeting 28 of 34 rules answered with 28 rows nobody reads and then repeated the four that matter in a prioritized list below. The report is now a count line, which is the whole output on a repository with nothing to fix, followed by one line per fail and then per unknown, in priority order, each naming the evidence and the skill that fixes it. Every rule is still checked and every finding still carries its evidence; what changed is what reaches the screen.
- This repository's pull request template is written as the commit message it becomes. GitHub is set to squash with the pull request body as the commit message, so the old template's headings and ticked checkboxes are permanent in `git log`, one of them broken mid-sentence by hard wrapping. The template now prompts for paragraphs and seeds one `Affects:` trailer, and it asks for what CI cannot report: the run behind a skill change, and whether the public API narrows. The checklist moved to `CONTRIBUTING.md`, since every check it asked contributors to confirm already runs on every pull request.
- `oss-writing` says that a pull request description may be the commit message. A repository can set the squash commit message to the pull request body, no clone reveals that it did, and where it is set a heading, an unticked checkbox, or an HTML comment left in the body is permanent in history. GitHub does not strip comments, so template guidance can survive in `git log` while rendering as nothing on the pull request page. It also rewraps the body at roughly 76 columns without splitting a word, so hard wrapping a description arrives wrapped twice, which is where a commit body broken mid-sentence comes from.
- `oss-community` says what a change-request template should ask for. A checkbox asking whether the contributor ran the tests duplicates a required check and reads as satisfied whether or not it is, so the step now says to read the project's pipeline first and ask only for what no job produces.
- The install command passes `--skill '*'`, in the README, the install guide, the site's copy button, and `oss-audit`. The `skills` CLI is interactive by default, so the bare command opened a picker and the reader selected all nine skills by hand, which is not what a command labelled "install the kit" should ask of anyone. `--all` would go further and answer the agent and scope questions too, and those are the reader's to answer. `skills/oss-skill/references/hosts.md` gains the flags this rested on.
- R-SEC-04 accepts a repository ruleset as evidence on GitHub, not only a classic branch protection rule. Its check now reads `repos/{owner}/{repo}/rulesets` alongside the classic endpoint, which answers `404 Branch not protected` on a repository guarded by a ruleset. Any repository that passed before still passes; a repository on the form GitHub now recommends stops auditing as a fail.
- `oss-harden` reaches for a ruleset's code scanning rule on R-SEC-09, alongside the required status check rather than instead of it. A required check asks whether the analysis reported; the rule asks what it found, and it also blocks when the tool is unconfigured, which is the case a required check cannot express because deleting the analysis setup removes the check rather than failing it. The reference carries both threshold enums, the command that confirms the tool's reported name, and the note that a name matching nothing blocks every merge. GitHub Code Quality's equivalent rule is described with its licensing and Actions cost, and with the fact that the REST reference does not document it yet.
- `oss-harden` sets up branch protection on GitHub as a ruleset, with classic protection kept as the form to read rather than to create. The reference file gains the four rule types that carry R-SEC-04, the `~DEFAULT_BRANCH` condition, the migration order that never leaves the branch unguarded, and the four `pull_request` parameters worth setting past what the rule requires, including why `allowed_merge_methods` is not redundant with the repository's own merge checkboxes. It also answers the question a ruleset cannot: no rule keys on who clicks merge, the `update` rule that reads like the answer covers direct pushes only, and repository access is where restricting merges actually happens. It also gains the bypass list, which inverts the classic admin exemption: a ruleset binds everyone unless an actor is listed, so a single-maintainer project that requires one approving review and lists nobody cannot merge anything at all.
- `oss-readme` judges a fact by the reader question it answers rather than by the kind of evidence behind it. The old list admitted a benchmark, a size, a code comparison, and a screenshot, all of them properties of the artifact, which left no slot for what a project covers or what it needs from you. Those two are now the slots most often missing, and the first is mandatory wherever a project has a boundary.
- `oss-writing` separates a bolded label from a bolded claim. `- **Performance:** it is faster` is still banned, because the stub displaces the sentence. `- **Fast.** 50% faster than X.` is allowed, because there the bold is the claim and the rest is its evidence. Delete everything after the bold to tell which one you wrote.
- `oss-readme` says why it keeps the badge row below the tagline when the projects it takes its structure from put badges above the title. R-DOC-01 exists to spend a reader's first five seconds on the sentence, and the divergence holds only because the badge cap is three.
- Every hard constraint in `oss-writing` now says what goes wrong when it is broken. A bare prohibition is weaker than the same prohibition with its reason attached.
- The README leads with what the kit is, then one install command and one worked example, in that order. The install variants and the per-host plugin commands moved below the example, because three install blocks used to run back to back before a reader saw the kit do anything.
- The README states the facts a reader picks a tool on: the rule count, the routing from a gap to the skill that fixes it, the 500-line ceiling on a skill body, and the single bundled script that needs nothing installed.
- The README links the rendered install guide and standard on [oss-kit.svyatov.com](https://oss-kit.svyatov.com) rather than the Markdown sources under `site/`. A reader on GitHub was being sent to a source file when a published page exists.
- `oss-community` derives the fields of an issue template from the project rather than from a generic bug-report shape. The facts a maintainer needs are the variables that decide whether a defect reproduces, and the repository names them: the CI matrix, the manifest's supported-version ranges, the hosts the install guide claims, and the follow-up questions on closed issues. The step now presents that slate before writing anything, and calls out the variable the maintainer's own setup holds fixed, which is the field they are least able to notice is missing.
- `oss-community` prefers a GitHub issue form over a Markdown template on a public repository, and marks the fields a maintainer cannot triage without as required. A template made of headings enforces nothing, so a contributor can delete every heading and satisfy R-COM-05 with an empty issue. Markdown stays the documented fallback for a private repository and for GitLab, which has no form schema at all.
- `oss-community` no longer names a Contributor Covenant version. It reads the steward's site for whatever version is current, because a version number in a skill body goes stale the moment the steward publishes the next one. An older version already in a repository still satisfies R-COM-03 when its reporting contact works, so the skill says so rather than replacing a working file.
- `oss-community` handles a license file that has no manifest to match, which is the case for every private or unpublished package. R-COM-01 still needs the file to exist and to name its license, so the step reads the file itself and cross-checks the other places a repository states one.
- The four skills derived from third-party work credit the maintainer alongside the upstream holder in their `sources.json`. Each file named only upstream, which understates one side of a joint work after the rewrites those same files document. The unread `license_override` and `license_override_reason` fields are gone, and the README credits list is now a line pointing at `sources.json`, so attribution lives in one place per skill instead of a list that grows with every borrowing.

## [0.2.0] - 2026-07-27

### Added

- `oss-skill` bundles a validator at `scripts/validate.mjs` that checks a repository against R-SKL-01 through R-SKL-05. It needs Node 22 or later, or Bun, and nothing installed: it imports only Node built-in modules, reads files, and makes no network call.
- `STANDARD.md` gains R-SKL-05, a script a skill ships uses `sh` or Node with no dependencies, because it runs on the reader's machine rather than the author's, and R-SKL-06, every host a repository claims support for has a committed manifest or a documented install command.
- Plugin manifests for Codex CLI at `.codex-plugin/plugin.json` and Cursor at `.cursor-plugin/plugin.json`, Codex's own marketplace at `.agents/plugins/marketplace.json`, and an `.opencode/skills` symlink. Each host now finds the skills where it scans.
- A documentation site generated from `STANDARD.md` and the skills, served at [oss-kit.svyatov.com](https://oss-kit.svyatov.com) and redeployed on every push to `main`. Every rule has its own page, so a rule can be linked and read without installing anything.
- Install, getting started, and adoption guides on that site. The install guide covers every claimed harness, one section each.
- `oss-ci` covers static-site deployment, for GitHub Pages and GitLab Pages. It carries no rule, since no rule requires a project to publish a site, so the skill asks before writing a deploy and writes none for a project that only builds a site as a check.
- The README declares the public API that Semantic Versioning covers: skill names and paths, rule IDs and what they require, the bundled validator's command line, and the manifest paths each host reads.

### Changed

- R-SKL-02 now names the validator `oss-skill` bundles. The rule already accepted any specification validator, so what it requires has not changed.
- `oss-harden` reads the upstream project's newest release before pinning an action, component, or image, and reports a lagging major to the user instead of freezing it. R-SEC-01 and R-SEC-06 accept a SHA regardless of the age of the tag behind it, so a stale pin used to pass unquestioned and then read as audited.
- The README install section shows the two fastest commands and links to the install guide.
- Every plugin and marketplace manifest describes oss-kit as `Curated agent skills for open source maintainers`, the same line the site carries. The manifests called it an opinionated quality bar, so the pitch a reader saw depended on whether they arrived through a plugin browser or the site.
- Security reports go through GitHub private vulnerability reporting, now enabled on this repository. Email stays the fallback.
- `CONTRIBUTING.md` names the documentation site build. CI requires that check, and the guide used to say the repository has no build step, so a contributor who touched `site/` passed every documented command and still failed the merge.

### Removed

- The `skills-ref` validator is no longer installed in CI or named in the contributing guide. The bundled `oss-skill` validator replaces it, so the project no longer depends on a tool whose upstream describes it as for demonstration only.

## [0.1.0] - 2026-07-23

### Added

- `STANDARD.md` defines the 38 numbered rules the skills in this kit check a repository against, each with a check a tool can run and the skill that fixes a gap.
- `oss-writing` rewrites commit messages, pull requests, issues, and documentation prose into plain, active, marketing-free sentences.
- `oss-readme` orders a README so the install command and a working example come before motivation, and links the license, changelog, and contributing guide.
- `oss-ci` writes GitHub Actions or GitLab CI/CD configuration for lint, test, and build, matched to the runtime versions a project claims to support, with lockfile-keyed caching and job timeouts.
- `oss-publish` sets up trusted publishing, build provenance, and an approval gate for npm, RubyGems, PyPI, and crates.io releases, on both GitHub Actions and GitLab CI/CD.
- `oss-community` writes the community and governance files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY.md, issue and merge request templates, and CODEOWNERS.
- `oss-harden` pins GitHub Actions to commit SHAs, sets least-privilege workflow permissions, keeps untrusted input out of shell commands, configures Dependabot or Renovate, locks dependency resolution to a committed lockfile, runs static analysis on pull requests, and checks branch protection and signed release tags.
- `oss-changelog` keeps a changelog in Keep a Changelog format, decides the semantic version bump for a change, and drafts release notes from merged work.
- `oss-audit` scores a repository against `STANDARD.md`, reports each gap with the rule it fails, and names the skill that fixes it.
- `oss-skill` fixes the structure of a repository that ships agent skills: the top-level `skills/` layout, `SKILL.md` conformance to the Agent Skills specification, oversized bodies that belong in `references/`, and the license field an extracted skill carries with it.

[Unreleased]: https://github.com/svyatov/oss-kit/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/svyatov/oss-kit/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/svyatov/oss-kit/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/svyatov/oss-kit/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/svyatov/oss-kit/releases/tag/v0.1.0
