# The oss-kit standard

This document states every opinion oss-kit holds about an open source repository, one numbered rule at a time. A rule has an ID, a statement, the reason it exists, a `Check:` line naming the evidence a reader or a tool can look for, the skill that fixes it, and the forges it applies to. The skills in this repository cite these IDs instead of restating the opinions, so a rule changes in one place. `oss-audit` scores a repository against these IDs.

Some rules name a fallback marked below the bar. That marker means the blessed option is unavailable, not that the fallback is acceptable practice: a registry with no trusted publishing, a forge with no attestation support, a plan tier with no protected environments. Take the fallback only when the platform leaves you no other option, and revisit it when the platform catches up.

Rule IDs are `R-<AREA>-<NN>`. Areas are DOC, COM, CI, SEC, PUB, CHG, and SKL. IDs are permanent: a retired rule keeps its number and is marked retired rather than reused.

The standard holds 61 rules:

- Documentation: R-DOC-01 through R-DOC-10
- Community: R-COM-01 through R-COM-09
- Continuous integration: R-CI-01 through R-CI-06
- Security posture: R-SEC-01 through R-SEC-15
- Release and publishing: R-PUB-01 through R-PUB-07
- Changelog and versioning: R-CHG-01 through R-CHG-07
- Agent skills: R-SKL-01 through R-SKL-07

Two areas are gated by a preamble before any of their rules apply: PUB, which reaches a repository shipping a built artifact, and SKL, which reaches a repository shipping agent skills. PUB's preamble also splits it into two tracks, so a repository resolves which of its rules apply in one step rather than rule by rule.

## Documentation

### R-DOC-01: The README opens with one sentence saying what the project does

A reader decides in about five seconds whether to keep reading. A title followed by a badge wall or a table of contents spends that budget on nothing.

Check: the first paragraph of `README.md` after the title is a single sentence naming what the project is and who it is for, and it appears before any table of contents, badge row, or `##` heading.

Fixed by: oss-readme
Forges: both

### R-DOC-02: The README shows how to install the project and one runnable example, in that order, near the top

Installation and a working snippet answer the two questions every visitor has. Burying them under motivation, philosophy, or comparison tables costs you the readers who would have used the project. A snippet that never shows what it returns makes the reader install the project to find out, which is the work the snippet was there to save.

Check: `README.md` contains a fenced code block with an install command, followed by a second fenced code block showing minimal usage whose result is visible in a comment inside the block or in a block immediately below it, and both appear before any section about design, motivation, or comparisons.

Fixed by: oss-readme
Forges: both

### R-DOC-03: The README links to the license, the changelog, and the contributing guide

These three files answer whether a reader may use the project, what changed since they last looked, and how to send a fix. A link that resolves to nothing is worse than no link, because it costs a click to learn the file is missing.

Check: `README.md` contains links whose targets are the license file, the changelog, and the contributing guide, and each target exists in the repository at a path its own rule accepts: the license file as R-COM-01 reads it, the changelog as R-CHG-01 reads it, and the contributing guide as R-COM-02 reads it.

Fixed by: oss-readme
Forges: both

### R-DOC-04: Every version, command, and support claim in the README matches the repository

Documentation drifts silently. A README promising support for a runtime version the test matrix dropped two releases ago sends a contributor into an afternoon of debugging that ends in your issue tracker.

Check: runtime versions, package versions, install commands, and CLI flags quoted in `README.md` appear with the same values in the package manifest, the CI configuration, and the source.

Fixed by: oss-readme
Forges: both

### R-DOC-05: Documentation prose is plain, active, and free of marketing language

Documentation is read by someone who is already stuck. Promotional adjectives and hedging add reading time without adding information, and they make the honest parts harder to trust. Write sentences in the active voice and name the actor, so a reader learns who has to do the thing. The check below names only evidence a tool can count, because an auditor that scores the same files differently on two runs makes every other score in the report unreliable.

Check: `README.md`, files under `docs/`, the contributing guide, security policy, and code of conduct at whichever path R-COM-02, R-COM-04, and R-COM-03 accept, and the entry text under the changelog's release headings, contain no em dash (U+2014), en dash (U+2013), or emoji character; every heading is sentence case except a heading preserved from an attributed third-party code of conduct; and none of the words robust, powerful, seamless, comprehensive, blazing, or effortless describes the project.

Fixed by: oss-writing
Forges: both

### R-DOC-06: The README names what the project covers and where it runs

A reader's first question is whether they are in the audience at all. A README that describes what the project does but never names the forges, registries, runtimes, or platforms it supports makes every reader run the install command to find out, and most of them will not.

Check: `README.md` names the platforms, forges, ecosystems, registries, or runtimes the project supports, and each name it claims appears in the source, the manifest, or the CI configuration.

Fixed by: oss-readme
Forges: both

### R-DOC-07: Every fenced code block in the README says what consumes it

A block of text in a box tells a reader nothing about where it goes. Two blocks in a row, one a shell command and one the contents of a configuration file, look identical and get pasted into the same place.

Check: every fenced code block in `README.md` carries a language tag, and every block whose destination is not a shell is preceded by a sentence naming the file, tool, or prompt it goes to.

Fixed by: oss-readme
Forges: both

### R-DOC-08: The README links a public place to ask a question and report a problem

A reader who is stuck either finds the channel or leaves. A private mailbox or a chat platform that needs an account and a client is not a channel, because the next person with the same question cannot find the answer you already wrote.

Check: `README.md` links at least one public channel that is searchable, addressable by URL, and usable without proprietary client software, covering both questions and defect reports; one channel satisfies both when the project routes them to the same place.

Fixed by: oss-readme
Forges: both

### R-DOC-09: The README says whether the project is maintained

A project that stopped four years ago and one that shipped last week look the same in a search result. Saying which costs a sentence and saves a reader a day.

Check: `README.md` carries a statement of maintenance or support status, or the repository carries an equivalent signal: `DEPRECATED` as the first heading of `README.md`, `DEPRECATED` at the start of the repository description, a no-maintenance-intended badge, or the archived flag set.

Fixed by: oss-readme
Forges: both

### R-DOC-10: The README names one thing that sets the project apart, with evidence

A reader who has understood what the project does still has to decide against whatever they are already using. A README that never answers that leaves the comparison to them, and the alternative they already know wins by default. The evidence half is what stops the answer being an adjective: a boundary, a measurement, or a named competitor can be checked, and "powerful" cannot.

Check: `README.md`, before its first `##` heading, presents at least one claim as what distinguishes the project from the alternatives a reader already has, that claim names a supported boundary, a measured number, or an alternative project by name, and it is traceable to the source, a manifest, the CI configuration, or a linked measurement. A number stated somewhere in the opening for another purpose does not satisfy this.

Fixed by: oss-readme
Forges: both

## Community

### R-COM-01: The repository ships a license file whose license matches the package manifest

Without a license file the default is exclusive copyright, so nobody may legally use the code. A manifest field saying MIT while the file says Apache-2.0 forces every downstream legal review to stop and ask.

Check: a license file exists at the repository root under a name the forge's own detector reads, which on GitHub means a basename of `LICENSE`, `LICENCE`, `UNLICENSE`, or `COPYING`, bare or carrying a `.md`, `.markdown`, `.txt`, or `.html` extension, and every package manifest that declares a license names the license that file contains. Do not fail a repository for the spelling of a filename the forge already resolves.

Fixed by: oss-community
Forges: both

### R-COM-02: CONTRIBUTING.md tells a newcomer how to set up, test, and submit a change

A contributor who cannot run the tests sends a patch you have to fix yourself. The three commands that get them from clone to green cost you one paragraph and save every future contributor an hour. A contributor also needs to know what an acceptable change looks like before writing it, and learning in review that a feature needed a test costs the round trip the guide exists to save.

Check: `CONTRIBUTING.md` exists at the repository root, in `.github/`, or in `docs/` on GitHub, or at the repository root on GitLab, and states the setup command, the test command, how to open a pull request or merge request, that a change adding functionality arrives with a test, and which document states what an acceptable contribution must satisfy. That document exists at the path or URL the guide names.

Fixed by: oss-community
Forges: both

### R-COM-03: CODE_OF_CONDUCT.md exists and names a working reporting contact

A code of conduct with `[INSERT CONTACT METHOD]` still in it is worse than none, because it advertises a reporting channel that goes nowhere.

Check: `CODE_OF_CONDUCT.md` exists at the repository root, in `.github/`, or in `docs/` on GitHub, or at the repository root on GitLab, and contains an email address or a reporting URL with no template placeholder text.

Fixed by: oss-community
Forges: both

### R-COM-04: SECURITY.md states a private reporting channel and a response window

Without a stated channel, a finder either opens a public issue that discloses the bug to everyone at once, or gives up. A stated response window tells them when to escalate. A window with no ceiling promises nothing, because a policy answering within a year satisfies the words and defeats the point.

Check: `SECURITY.md` exists at the repository root, in `.github/`, or in `docs/` on GitHub, or at the repository root on GitLab, and names a private channel that an unaffiliated reporter can use, together with the time you commit to responding in, which is no longer than 14 days. Accept GitHub private vulnerability reporting only when the repository is public and the feature is enabled. Accept a GitLab confidential issue only when the intended reporter role can create it as confidential; GitLab Service Desk and a monitored security email are valid alternatives.

Fixed by: oss-community
Forges: both

### R-COM-05: Issue and change-request templates exist so reports arrive with the facts you need

Every free-form bug report costs a round trip to ask for the version and the reproduction. A template collects both before the issue is filed.

Check: on GitHub, `.github/ISSUE_TEMPLATE/` holds at least one template, and a pull request template sits at any path GitHub reads: `pull_request_template.md` at the repository root, in `docs/`, or in `.github/`, or a `PULL_REQUEST_TEMPLATE/` directory holding at least one template in any of those three. On GitLab, `.gitlab/issue_templates/` holds at least one template and `.gitlab/merge_request_templates/` exists. Issue forms are read from `.github/ISSUE_TEMPLATE/` alone, so that path is exact where the pull request template's is not.

Fixed by: oss-community
Forges: both

### R-COM-06: A CODEOWNERS file assigns a reviewer to every path

Without a catch-all owner, a change to an unclaimed directory waits for someone to notice it. With one, the forge requests review automatically.

Check: where the forge supports Code Owners for the repository's visibility and plan, and two or more principals hold push, maintain, or admin access as R-SEC-12 reads it, a `CODEOWNERS` file exists in the repository root, `.github/`, `.gitlab/`, or `docs/`, and it contains a `*` rule naming at least one eligible owner. GitLab Free, private repositories on GitHub Free, and a repository where one principal holds every merge path fall outside this rule.

Fixed by: oss-community
Forges: both

### R-COM-07: The forge project page says what the project is and where it lives

A search result, a social card, and the forge's own project lists show the description and the topics, and none of them render the README. A project with an empty description is findable only by someone who already has the link.

Check: the forge project has a non-empty description, at least one topic, and, where the project publishes a documentation site or a package page, a homepage URL pointing at it. Read these from the forge, with `gh repo view --json description,homepageUrl,repositoryTopics` or the GitLab projects API, rather than inferring them from files in the repository.

Fixed by: oss-community
Forges: both

### R-COM-08: A documented statement says who decides, and what happens if they stop

A contributor weighing whether to invest in a project and a user weighing whether to depend on it are asking the same two questions: who can merge and release, and does this survive its current maintainers. Leaving both unanswered does not read as informality, it reads as a project nobody has thought past this week.

Check: a tracked file states how decisions get made and who makes them, and says what becomes of the project if the current maintainers stop, whether that is a named successor, an organization or foundation holding the repository, or a plain statement that the project has one maintainer and no succession arranged. A single-maintainer project satisfies this rule by saying so; naming a second maintainer is not required.

Fixed by: oss-community
Forges: both

### R-COM-09: When questions and defects have different homes, the issue chooser says so

A project that opens a discussion forum and then leaves the issue chooser silent has two channels and one visible door. Every question still arrives as an issue, and the forum stays empty while the tracker stays noisy.

Check: where the project runs a public non-defect channel such as GitHub Discussions, a forum, or a mailing list, `.github/ISSUE_TEMPLATE/config.yml` names it under `contact_links` with a URL that resolves. A project running no such channel falls outside this rule.

Fixed by: oss-community
Forges: github

## Continuous integration

### R-CI-01: CI runs on every push to the default branch and on every change request

A pipeline that only runs on tags tells you the build broke after you shipped it. Running on the default branch and on every pull or merge request catches breakage while the author still has the context.

Check: the CI configuration triggers on `push` to the default branch and on `pull_request` carrying no `branches:` filter (GitHub), or defines rules for `$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH` and `merge_request_event` (GitLab). The `branches:` filter keys on the pull request's base branch rather than its head, so `branches: [main]` runs nothing at all for a pull request stacked onto another branch, and a configuration carrying one fails this rule rather than passing it.

Fixed by: oss-ci
Forges: both

### R-CI-02: CI runs the same lint, test, and build commands the contributing guide gives to humans

When CI runs a different command than `CONTRIBUTING.md` documents, a contributor passes locally and fails in CI, and neither of you can tell which is authoritative.

Check: the CI configuration invokes every applicable lint, typecheck, test, and build command defined by the project's automation, and every command `CONTRIBUTING.md` gives a contributor runs in CI as the same underlying check. A CI job may reach a check through a different entry point than the documented one, such as a second runtime or a script the documented alias wraps, as long as the check itself runs; a documented command with no CI job behind it fails the rule.

Fixed by: oss-ci
Forges: both

### R-CI-03: The test matrix covers every runtime version the project claims to support

A support claim you do not test is a guess. Dropping the oldest supported version from the matrix is how a patch release breaks half the installed base.

Check: the matrix entries in the CI configuration cover every maintained runtime release line included by the support range declared in the package manifest.

Fixed by: oss-ci
Forges: both

### R-CI-04: Dependency caches are keyed on the lockfile

A cache key that ignores the lockfile serves stale dependencies after an upgrade, so CI tests a dependency set nobody has. A key that changes on every run caches nothing and pays the restore cost anyway.

Check: every dependency cache in the CI configuration caches only reusable package-manager data, derives its primary key from the lockfile, and separates every operating system, architecture, runtime, or package-manager boundary that makes the cached contents incompatible. Any fallback key preserves those compatibility boundaries. A CI configuration that defines no dependency cache falls outside this rule rather than satisfying it with nothing to check.

Fixed by: oss-ci
Forges: both

### R-CI-05: Every job has a timeout, and superseded runs for the same branch are cancelled

A hung job holds a runner until the platform's default timeout expires, which is six hours on GitHub. Queued runs for commits nobody will merge burn the same minutes.

Check: every job sets `timeout-minutes` (GitHub) or `timeout` (GitLab), and the configuration sets `concurrency` with `cancel-in-progress: true` for change-request runs (GitHub) or marks jobs `interruptible: true` with auto-cancel enabled (GitLab).

Fixed by: oss-ci
Forges: both

### R-CI-06: The repository defines an automated test suite and the command that runs it

The rules before this one govern where checks run, never whether the repository has any tests to run, so a repository with none passes the whole area while its CI verifies nothing. This rule asks only that a suite exist, because once it does R-CI-02 makes CI run it, and a gate clause here would restate that rule.

Check: the repository contains automated tests and a defined command that runs them, whether that is a test script in the package manifest, a task-runner target, or the layout the ecosystem's standard test runner discovers. The command is not a placeholder whose whole body is an echo, a bare `true`, or an `exit 0`, which is what a scaffolded manifest ships before anybody replaces it. A repository shipping no executable code falls outside this rule rather than failing it.

Fixed by: oss-ci
Forges: both

## Security posture

### R-SEC-01: Pin every external action and reusable workflow to a full commit SHA

Tag and branch refs are mutable, so a compromised upstream tag changes what runs in your workflow without a diff in your repo.

Check: every external `uses:` line in `.github/workflows/`, and in every `action.yml` or `action.yaml` the repository ships, including GitHub-owned actions and reusable workflows outside the current repository, resolves to a 40-character commit SHA. A composite action's steps take `uses:` exactly as a workflow job's steps do, so an action the repository defines is inside this rule and not only the workflows that call it.

Fixed by: oss-harden
Forges: github

### R-SEC-02: Workflows declare least-privilege permissions

The default token permission set is broad enough that a compromised build step can push commits or publish a release. A read-only default costs one line and turns most injection findings into nothing.

Check: every workflow file sets a top-level `permissions:` block that grants no more than `contents: read`, and any job needing more declares the extra scope at the job level.

Fixed by: oss-harden
Forges: github

### R-SEC-03: Automated dependency updates cover both application dependencies and CI dependencies

Pinning actions to SHAs (R-SEC-01) freezes them until something unfreezes them. Without an updater, pinned means unpatched.

Check: the repository contains `.github/dependabot.yml` or a Renovate configuration, and its ecosystem list covers both the package manager the project uses and the CI action or container images it runs.

Fixed by: oss-harden
Forges: both

### R-SEC-04: The default branch takes changes only through a change request that passed CI, and rejects force pushes

Branch protection is the only rule here that a repository setting enforces rather than a file. Without it, every other rule in this document can be bypassed by one push. Every control this rule names binds a repository of any size, including one with a single maintainer, because none of them needs a second person to function.

Check: the default branch is protected, a pull request or merge request is the only path onto it, at least one CI status check must pass before merge, and force pushes and deletion are blocked. On GitHub the settings live in either of two places, so read both: `gh api repos/{owner}/{repo}/rulesets` for a ruleset, and `gh api repos/{owner}/{repo}/branches/{branch}/protection` for a classic rule, which answers `404 Branch not protected` when a ruleset is what guards the branch. On GitLab, `GET /projects/:id/protected_branches/:name`.

Fixed by: oss-harden
Forges: both

### R-SEC-05: Release tags are signed and verifiable

An unsigned tag proves nothing about who cut the release. Anyone with write access, or anyone who takes it, can point a tag at any commit. Forge verification reflects keys and identities registered with that forge and differs by signature format, so the portable evidence comes from git itself against a maintainer-controlled trust source.

Check: after `git fetch --tags` and importing the maintainer's published signing key, `git tag -v <tag>` on the newest release tag succeeds, and `git cat-file -t <tag>` prints `tag`, which means the tag is annotated rather than lightweight. Fetch the key from the forge the maintainer publishes it on: `gh api users/{owner}/ssh_signing_keys` or `gh api users/{owner}/gpg_keys` on GitHub, `GET /users/:id/keys` or `/users/:id/gpg_keys` on GitLab. An SSH signature verifies only against an allowed-signers file naming that key with the tagger's email, pointed at by `gpg.ssh.allowedSignersFile`; without it `git tag -v` reports a configuration error, which is the check failing to run rather than the tag failing to verify.

Fixed by: oss-harden
Forges: both

### R-SEC-06: A GitLab pipeline pins external execution inputs and restricts inbound job-token access

GitLab has no action-shaped `uses:` step, so the same mutable-reference problem arrives through `image:`, `services:`, and external `include:` entries. A floating image tag or an `include:` on a branch name changes what runs without a diff in your repository. Separately, an open inbound job-token scope lets a job token from any project access this project when its triggering user is authorized. The allowlist is a target-project control; it does not describe where this project's own job token can go.

Check: every `image:` and `services:` entry in `.gitlab-ci.yml` and its included files names an image by digest (`image@sha256:...`), every external `include:project` and `include:component` entry resolves to a full commit SHA, every `include:remote` entry sets `integrity:`, and `GET /projects/:id/job_token_scope` reports `inbound_enabled` true with its allowlist naming only source projects that need access to this target project.

Fixed by: oss-harden
Forges: gitlab

### R-SEC-07: Untrusted input never reaches a privileged context

Forge-supplied text such as an issue title, a branch name, or a commit message is written by whoever opened the contribution. Interpolated into a shell command it runs as code, and a workflow that builds a fork's contribution while holding secrets hands those secrets to its author.

Check: on GitHub, no user-controlled `${{ github.event.* }}` or `${{ github.head_ref }}` expression appears inside a `run:` block, such values reach the shell through an `env:` block instead, and no `pull_request_target` or `workflow_run` workflow executes contributor-controlled code; on GitLab, user-controlled predefined variables are quoted when used in `script:`, no job evaluates them as generated shell, and every sensitive variable is masked with variable-reference expansion disabled.

Fixed by: oss-harden
Forges: both

### R-SEC-08: Registry dependencies resolve through a committed lockfile

A version range re-resolves on every build, so what CI installs today is not what it installed yesterday. A lockfile records the exact artifact and its hash, which turns a silent substitution into a failed build. It costs a maintainer nothing, because the package manager writes it.

Check: the lockfile or fully hashed requirements file the project's package manager produces is committed, records integrity for registry dependencies, and every CI install uses the package manager's current frozen mode so it fails on stale or missing resolution data rather than updating it. Two clauses narrow it, and both key on what the tooling documents rather than on what the repository happens to contain, so an absent lockfile is never mistaken for an impossible one. Where the project's build tool publishes no lockfile format at all, the version-lock half falls outside this rule rather than failing it; among the ecosystems this standard covers that is Apache Maven, which offers fixed versions, `dependencyManagement`, and enforcer rules such as `banDynamicVersions` in place of one, and it is the build tool rather than the Maven Central registry that earns this, because a Gradle project publishing to the same registry writes `gradle.lockfile` and stays inside the rule. Where the ecosystem's own documentation directs a library package not to commit its lockfile, which both NuGet and Dart do, the rule reaches that ecosystem's application packages and the library case falls outside it rather than failing it.

Fixed by: oss-harden
Forges: both

### R-SEC-09: Static analysis runs on pull requests where the language supports it

A reviewer catches what a reader notices. A static analyzer catches the injection and memory classes a reader skims past, and on GitHub the default setup is a repository setting rather than a workflow to maintain.

Check: where the repository contains source in a language a static analyzer supports, a static analysis workflow runs on pull requests to the default branch and its result is a required check. A repository holding no source in a supported language falls outside this rule rather than failing it.

Fixed by: oss-harden
Forges: both

### R-SEC-10: Committed secrets are detected before they reach the default branch

A leaked credential is live from the moment it is pushed, and rewriting history does not revoke it. Detection at the push is the difference between rotating one key and auditing everything that key could reach.

Check: on GitHub, `gh api repos/{owner}/{repo} --jq .security_and_analysis` reports both `secret_scanning` and `secret_scanning_push_protection` as `enabled`, read back after any write rather than inferred from one, because the repository `PATCH` answers 200 while silently discarding a field it will not honour; an absent `security_and_analysis` key means the caller is not an admin, which is unknown rather than disabled. Non-provider patterns and validity checks are GitHub Secret Protection, a paid product, and fall outside this rule. On GitLab, either `GET /projects/:id/security_settings` reports `secret_push_protection_enabled` true, which requires Ultimate, or the project's pipeline includes `Jobs/Secret-Detection.gitlab-ci.yml`, which is available on Free.

Fixed by: oss-harden
Forges: both

### R-SEC-11: Every dependency ecosystem the project ships is watched for known vulnerabilities

An updater (R-SEC-03) moves dependencies forward on a schedule. It never says which of today's pinned versions is now known-bad, so without a watcher the freeze that R-SEC-01 and R-SEC-08 create is a freeze nobody is told to break.

Check: the package set the forge reports watching matches the project's resolved dependency set, so coverage of a manifest's direct dependencies does not read as coverage of the lockfile; where the forge cannot parse the project's lockfile, a scanner that can reads it and covers the residual; and where the forge's updater lists the ecosystem for version updates but not for security updates, which on GitHub is the case for both `bun` and `mix`, the residual is that ecosystem's whole advisory feed rather than a parsing gap, so the scanner is the only watcher the project has rather than a supplement to one. On GitHub, `gh api repos/{owner}/{repo}/vulnerability-alerts` answers 204 when enabled and 404 when disabled, and `gh api repos/{owner}/{repo}/dependency-graph/sbom` lists what is actually watched; read every control back after a write for the reason R-SEC-10 gives, and treat an absent `security_and_analysis` key as unknown rather than disabled. On GitLab, Dependency Scanning requires Ultimate, and a Free project reaches the same outcome through a job running an advisory-database scanner. A vulnerability the change introduces blocks its merge; the repository-wide scan reports rather than blocks, because an advisory published against a dependency with no fix is not something a contributor can resolve.

Fixed by: oss-harden
Forges: both

### R-SEC-12: Where more than one person can merge, the default branch requires an approving review

A review catches what no scanner reads: the change an insider lands on purpose, and the change a stolen account lands in someone else's name. Nobody can approve their own change request, so a repository where one principal holds every merge path cannot satisfy this rule and gains nothing from being asked. Requiring an approval there produces one of two outcomes, a maintainer who cannot merge, or a bypass entry that exempts the only person the rule could bind. Both cost the repository a control it did have. Where two or more people can merge, the approval is the one control that puts a second pair of eyes on the diff before it lands.

Skipping this rule has a scored consequence worth stating. OpenSSF Scorecard tiers the Branch-Protection check and gates each tier on the one below it, with force push and deletion in tier 1, review in tier 2, and status checks in tier 3. A repository that blocks force pushes and requires CI but not review therefore scores 3 out of 10 rather than 8. Meet the standard here, not the score.

Check: where two or more principals hold push, maintain, or admin access, the default branch requires at least one approving review, and where a CODEOWNERS file exists its review is enforced. Read the access list rather than inferring it, with `gh api repos/{owner}/{repo}/collaborators?affiliation=all` plus the repository's teams on GitHub, or project members at Developer or above on GitLab. A repository where one principal holds every merge path falls outside this rule rather than failing it. Where the access list cannot be read, which answers `403 Must have push access to view repository collaborators` for a caller without push access, the rule is unknown rather than pass or fail.

Fixed by: oss-harden
Forges: both

### R-SEC-13: A released tag cannot be moved or deleted, and only trusted principals may create one

A tag is the name a consumer installs by, and git lets anyone with push access repoint one at a different commit. Moving a released tag changes what every later fetch resolves to while the version number stays put, which is the one change a version number exists to make visible. Restricting who may create a tag matters for the same reason from the other end: where the registry reads the forge rather than taking an upload, creating the tag is the publish, so tag creation is the last gate before a version becomes public and the only thing standing where an approval gate would stand on the registry-push track.

Check: on GitHub, a repository ruleset targeting `refs/tags/*` blocks tag update and tag deletion and restricts tag creation to named principals, read back with `gh api repos/{owner}/{repo}/rulesets` rather than inferred from the write; on GitLab, protected tags cover the release tag pattern with a create access level set and no role permitted to force-update it, read back with `GET /projects/:id/protected_tags`. This rule covers a git tag only. A container registry tag is mutable by design, lives outside the forge, and is reachable by no forge control, so the immutable identity of a published image is its digest rather than its tag.

Fixed by: oss-harden
Forges: both

### R-SEC-14: A newly published version waits before the updater proposes it

An attacker who takes a maintainer account publishes within seconds, and the registry serves it just as fast. What ends those incidents is other people looking: the malicious versions in the npm compromises of September 2025 were found and pulled within hours. An updater with no cooldown opens its pull request inside that window, so a project that merges its bumps promptly is the one that installs the bad version before anybody has looked at it, and diligence about updating becomes the exposure. A cooldown moves the update out of the window at no cost, because it delays a routine version bump and not a fix for a known vulnerability.

Check: the repository's dependency updater configuration delays a newly published version before proposing it, through a `cooldown` block carrying at least `default-days` in `.github/dependabot.yml`, or `minimumReleaseAge` in a Renovate configuration. Read the value as well as the key: a cooldown shorter than a day does not outlast the window it exists to cover. Dependabot's cooldown applies to version updates and never to a security update, and Renovate's behaviour on a vulnerability alert is set separately by `minimumReleaseAgeBehaviour`, so neither setting has to be qualified to keep an advisory-driven fix prompt. A repository with no updater configuration at all falls outside this rule and fails R-SEC-03 instead, which is the same gap counted once.

Fixed by: oss-harden
Forges: both

### R-SEC-15: CI installs dependencies without running the code they ship

A dependency that runs code during install gets a shell on the runner, with whatever token the job holds and whatever the job can push to. That is the step the September 2025 npm worm used to spread, and it needs no vulnerability in the project: installing is enough. Every package manager that has this problem has now shipped a control for it, so the rule is about writing the control down where a reader can see it rather than inheriting whatever the runner's manager version happens to default to.

Check: every CI step that installs registry dependencies either runs the package manager in a mode that executes no dependency-supplied install or build code, or the repository commits the allowlist that manager reads. For the npm ecosystem that is `--ignore-scripts` on the install command, or `allowScripts` in `package.json` for npm 12, `enableScripts: false` for Yarn, `allowBuilds` for pnpm, or `trustedDependencies` for Bun. For Composer it is `--no-scripts` and `--no-plugins`, or the `allow-plugins` map in `composer.json`, which from Composer 2.2.0 permits nothing until a plugin is listed. For Python it is `--only-binary`, because a wheel install runs no packaged code where a source distribution runs the project's build backend. Where the package manager documents no way to decline that code, the rule falls outside that ecosystem rather than failing it: that is Cargo, whose `build.rs` runs for every dependency that has one and can only be replaced through the `links` override; RubyGems, whose native extensions build on install; Hex, which compiles dependency source; Maven and NuGet, which run only what the project's own build file declares; and Go modules, container images, and pub.dev packages, where nothing a dependency ships runs during resolution at all.

Fixed by: oss-harden
Forges: both

## Release and publishing

This area applies to a repository that ships a built artifact to people who did not build it, in either of two forms: a package published to a registry, evidenced by a manifest declaring a public package, a release workflow naming a publish command, or an existing registry page; or a built asset attached to a forge release, evidenced by a release carrying a file the repository does not contain. Where neither exists, the area is not applicable as a whole and its rules are not checked one at a time.

The area runs on two tracks, and which track a repository takes decides how many of its rules reach it. On the registry-push track a release uploads a built artifact to a registry, and every rule below applies: npm, PyPI, RubyGems, crates.io, NuGet, Maven Central, Hex, pub.dev, and container images. On the tag-published track nothing is uploaded and there is no publishing credential at all, because the registry reads the forge instead: a Go module is published by pushing a git tag that `proxy.golang.org` fetches on demand, and a Packagist package is registered once and thereafter updated by a forge integration or a weekly crawl. R-PUB-01 through R-PUB-04 have nothing to attach to there, so on the tag-published track those four are not applicable as a whole and are not checked one at a time; R-PUB-05, R-PUB-06, and R-PUB-07 still apply. What stands in for R-PUB-04's approval gate on that track is R-SEC-13, which restricts who may create a tag, because creating the tag is the publish.

A repository that ships only its source, with no package identity any registry resolves, publishes nothing to secure here and falls outside this area on either track. Shipping through git tags is not by itself what places a repository outside it, because that is exactly how a Go module publishes; the absence of a resolvable package identity is.

### R-PUB-01: Publishing happens in CI, tied to a release tag, never from a developer machine

A local publish ships whatever is in the working tree, from a machine holding a long-lived registry token. A CI publish tied to a release tag ships a commit that is in the repository and that CI has tested.

Check: the publish command runs in a release workflow or pipeline that is either triggered by a tag push or creates the release tag in the same run, and appears in no local script intended for manual use. A release-automation workflow such as release-please, semantic-release, or changesets satisfies this by the second clause: it triggers on a merge to the default branch and then tags, releases, and publishes in one run, so the published commit is still one the repository holds and CI has tested. What fails is a publish with no release tag on either side of it, and a publish a person can run from a working tree.

Fixed by: oss-publish
Forges: both

### R-PUB-02: The publish job authenticates to the registry with trusted publishing, not a stored token

A long-lived registry token in CI secrets is the single credential that turns any workflow compromise into a supply-chain compromise. Trusted publishing exchanges a short-lived OIDC token per run, so there is nothing to steal between releases.

Check: the publish job requests `id-token: write` and publishes through the registry's OIDC flow (npm trusted publishing, PyPI trusted publishers, RubyGems OIDC, crates.io trusted publishing). Where the registry's own publishing documentation names no OIDC flow at all, which is the case for Hex, a token scoped to the single package being published is below the bar and permitted, and the registry limitation is reported beside it. That is not the same as a registry documenting a flow this standard has not enumerated, which is unverified rather than absent: read the registry's documentation and report the rule unknown until the flow is checked, because the scoped-token fallback would otherwise pass a repository that could have used OIDC. Where the registry documents no credential narrower than the publishing account, which is the case for Maven Central, an account-scoped token is below the bar and permitted, reported beside the compensating controls that keep it below the bar rather than at it: an expiry set when the token is generated, revocation and replacement on compromise, namespace ownership verified against the account, and a publishing type that holds a validated deployment until a person releases it. Sonatype has announced namespace-scoped and artifact-scoped tokens without shipping them, so re-read the registry's token documentation before accepting this fallback rather than treating it as settled. A repository that publishes to no registry, shipping only built assets on a forge release, falls outside this rule rather than failing it.

Fixed by: oss-publish
Forges: both

### R-PUB-03: Published artifacts carry build provenance

Provenance links the published artifact back to the commit and workflow that built it, so a consumer can tell a legitimate release from one uploaded by whoever held the token.

Check: the exact published artifact has verifiable provenance tied to the expected repository and workflow. Prefer a registry-served record: verify npm provenance for an installed exact package version, PyPI provenance through its Integrity API, or a RubyGems attestation through its attestation API. Where a registry cannot serve provenance, verify a forge attestation for the exact published artifact and report the registry limitation; OIDC authentication alone is not provenance.

Fixed by: oss-publish
Forges: both

### R-PUB-04: A human approves the run before anything reaches a public registry

A registry publish cannot be undone. An approval gate is the last point where a compromised tag, a wrong version, or a bad artifact can be stopped.

Check: before public availability, a person other than an automation account must approve through a GitHub environment with required reviewers, a GitLab protected environment with a manual job and approval rules, or a registry proof-of-presence gate such as npm staged publishing with 2FA approval. Verify the configured gate through the forge or registry API. If the repository visibility or forge plan does not provide a native gate and the registry has no equivalent, report the rule as unmet rather than substituting an unverified approval action.

Fixed by: oss-publish
Forges: both

### R-PUB-05: A built artifact ships with an inventory of what went into it

Nobody can read a compiled binary to find out which dependency versions are inside it. Without an inventory, a newly disclosed vulnerability in a bundled library leaves every downstream user unable to answer whether they are affected, and the maintainer unable to tell them.

Check: a release that carries a built asset also carries a software bill of materials in SPDX or CycloneDX format, published as a release asset or at a path the README or release notes name, covering the dependencies that went into that asset. A release carrying only the source archives the forge generates falls outside this rule rather than failing it.

Fixed by: oss-publish
Forges: both

### R-PUB-06: Release assets are signed, or listed by hash in a signed manifest

A signed tag covers the commit, not the files attached to the release, and those files are uploaded by whatever held the token. A downloader who cannot verify an asset cannot tell a legitimate release from one replaced after the fact, and reads the tag signature as though it covered both.

Check: each built asset on the newest release either carries a detached signature or appears with its cryptographic hash in a manifest that is itself signed, and the verifying key or attestation identity is discoverable from the repository rather than only from the release itself. A forge attestation covering the exact asset satisfies this. A release carrying only the source archives the forge generates falls outside this rule rather than failing it.

Fixed by: oss-publish
Forges: both

### R-PUB-07: A tag-published registry entry updates through the forge, not through a token a CI job holds

The tag-published track has no publish step to secure, but the registry still has to learn that a new version exists. Where that link is a registry API token sitting in CI secrets, the track has reintroduced the exact credential it otherwise avoids: any workflow compromise can then push a package version, without the project ever running a publish command.

Check: the registry entry is updated by a forge-side integration the registry itself configures, and no registry API token appears in CI secrets or in any workflow file. On GitHub, Packagist's documented path is authorizing the Packagist application and letting it install the hook, so no token is stored anywhere; the package page shows an auto-update warning when no hook is set, which is the observable evidence. Where the registry offers no such path, which is the case for Packagist on GitLab, the credential belongs in the forge's project integration settings, where no job can read it, and never in a CI variable. An ecosystem that exposes no registry entry to update falls outside this rule rather than failing it, which is the case for Go modules: `proxy.golang.org` fetches a tag on demand and offers no account, no registration, and no credential.

Fixed by: oss-publish
Forges: both

## Changelog and versioning

### R-CHG-01: Each release unit keeps a discoverable changelog in its declared format

A changelog exists so a user upgrading two versions can read what changed without diffing tags. Generated commit lists do not answer that, because commit subjects address the maintainer, not the user.

Check: each release unit has a discoverable changelog following the project's declared convention. For Keep a Changelog 2.0.0, it opens with `# Changelog` and a pinned convention link, carries `## [Unreleased]`, lists dated releases newest first, groups notable changes under the six standard types, marks incompatible entries `**Breaking:**`, and resolves version headings to tag or comparison links.

Fixed by: oss-changelog
Forges: both

### R-CHG-02: Semantic versions reflect changes to the declared public API

SemVer is a promise to users and dependency resolvers about the declared public API. A version increment that understates an incompatible change lets an ordinary upgrade select code the version range did not warn users about.

Check: the project declares the public API covered by Semantic Versioning; versions use valid SemVer syntax, allowing a `v` prefix only on tag names; stable releases increment MAJOR for incompatible public API changes, MINOR for compatible additions and deprecations, and PATCH for compatible fixes. During `0.y.z` initial development, this standard uses MINOR for incompatible changes rather than forcing `1.0.0`; SemVer itself permits anything to change before 1.0.0.

Fixed by: oss-changelog
Forges: both

### R-CHG-03: Every release unit uses one version across its tag, manifests, and changelog

When these disagree, nobody can tell which one describes the artifact users installed, and the changelog stops being a reliable upgrade record. A repository that ships several manifests, one per host or one per package, multiplies the ways they can drift apart.

Check: for the newest release of each release unit, its tag, every manifest or generated version source that describes that unit, and its newest changelog entry name the same version. Independently versioned packages in one repository are checked separately and are not forced to share a version.

Fixed by: oss-changelog
Forges: both

### R-CHG-04: Forge release notes derive from the changelog without contradicting it

Auto-generated release notes list merged pull requests, which repeats work the changelog already did better. Two divergent descriptions of one release is worse than one.

Check: the release body on the forge contains the corresponding changelog section without omissions or contradictory claims. It may add release-scoped installation, verification, migration, asset, or contributor details. Read it with `gh release view <tag> --json body` on GitHub, or from the `description` field of `GET /projects/:id/releases/:tag_name` on GitLab.

Fixed by: oss-changelog
Forges: both

### R-CHG-05: A public API is deprecated in a release before it is removed

Removing an API without warning turns an upgrade into an outage. Users need a released version where the old path still works and the interface they use directs them to the replacement.

Check: every public item under Removed appeared under Deprecated in an earlier release, stayed usable for the project's stated deprecation window, and produced an interface-appropriate notice naming the replacement or migration path and earliest removal version. For stable SemVer, deprecation ships in a MINOR release and removal waits for a later MAJOR release. A project that has removed no public item falls outside this rule rather than satisfying it with nothing to check.

Fixed by: oss-changelog
Forges: both

### R-CHG-06: A release that fixes a publicly known run-time vulnerability names it in the changelog

A reader deciding whether an upgrade is urgent is asking one question, and a fixed vulnerability they can look up is the fact that answers it. Scoping this to what reached users is what keeps the Security group worth reading: a vulnerability in a development-only dependency never reached one, and a Security heading that cries wolf over those is one readers stop opening. A build toolchain is on the other side of that line whenever the project ships what the toolchain produced.

Check: the changelog entry for each release that resolved a publicly known vulnerability in the shipped code or in a run-time dependency names every such vulnerability under Security, each by an identifier from a published advisory. A development-only dependency is not a run-time vulnerability. Where the project ships a built artifact, its build toolchain is one, because a compromised bundler or code generator injects into the thing users install; where the project ships only source, a build-only dependency stays outside. On GitHub, `gh api repos/{owner}/{repo}/dependabot/alerts?state=fixed` reports which advisories were resolved and when, which is what locates them in a release; on GitLab, the project's vulnerability report carries the same and requires Ultimate, so a Free project resolves it from the advisory identifiers its scanner job recorded. A project that has fixed no publicly known run-time vulnerability falls outside this rule rather than satisfying it with nothing to check.

Fixed by: oss-changelog
Forges: both

### R-CHG-07: Where an ecosystem encodes the major version in package identity, the released major matches it

A version that disagrees with the package name is not a documentation defect, because the two resolve to different packages. Go states the requirement outright: a module released at v2 or higher must carry a matching suffix on its module path and therefore on the import path of every package inside it, so a repository tagged `v2.0.0` whose `go.mod` still names the v1 path has published a v1 that no consumer of v2 can import. R-CHG-03 asks the tag, the manifests, and the changelog to agree on one version, and it does not reach the package name.

Check: where the ecosystem encodes the major version in package identity, that identity matches the released major. For a Go module at v2 or higher, the `module` line in `go.mod` ends in the matching `/vN` suffix and the newest release tag's major matches it; a `gopkg.in` path carries the suffix at every major, including v0 and v1, and separates it with a dot rather than a slash. An ecosystem that does not encode the major version in package identity falls outside this rule rather than satisfying it with nothing to check.

Fixed by: oss-changelog
Forges: both

## Agent skills

This area applies only to a repository that ships agent skills, meaning a repository holding at least one `SKILL.md`. Where none exists, the area is not applicable as a whole and its rules are not checked one at a time.

### R-SKL-01: Skills live in a top-level `skills/` directory, one directory per skill

The `skills` CLI discovers this layout directly, and plugin packages conventionally expose the same directory. Keeping one canonical tree avoids copies drifting while host-specific paths can point to it through manifests or symlinks.

Check: a `skills/` directory exists at the repository root, every skill is a direct child of it and holds a `SKILL.md`, and no other `SKILL.md` exists in the repository. Resolve a symlinked directory such as `.claude/skills` to its target before applying the check, so a committed symlink pointing at `skills/` does not read as a second copy.

Fixed by: oss-skill
Forges: both

### R-SKL-02: Every skill conforms to the Agent Skills specification

The specification is the one format every host reads. A skill that violates it fails to load, and most hosts fail silently, so the author sees a skill that never triggers and no error saying why.

Check: a specification validator exits 0 for every directory under `skills/`. `oss-skill` ships one at `scripts/validate.mjs` in its own installed directory, which reads files, needs nothing installed, and runs on Node 22 or later and on Bun.

Fixed by: oss-skill
Forges: both

### R-SKL-03: A `SKILL.md` body stays under 500 lines, with depth in `references/`

The whole body loads into context when the skill activates, competing there with the conversation and with every other active skill. The specification recommends fewer than 500 lines and 5000 tokens, with supporting files loaded only when the task calls for them.

Check: every `skills/*/SKILL.md` is under 500 lines, and any skill needing more material ships it under that skill's own `references/` directory.

Fixed by: oss-skill
Forges: both

### R-SKL-04: Every `SKILL.md` declares a license

Installers extract one skill directory at a time. The repository license file does not travel with it, so an extracted skill arrives with no terms attached and nobody downstream can tell whether they may use it.

Check: the frontmatter of every `skills/*/SKILL.md` carries a `license:` field naming the license that applies to that skill. It matches the repository license when that license covers the skill; a differently licensed skill carries its own license file and the field references it.

Fixed by: oss-skill
Forges: both

### R-SKL-05: A skill that ships a script uses portable sh or JavaScript with no dependencies

A script inside a skill runs on the reader's machine, not the author's. An interpreter the reader does not have, or a dependency install the skill cannot perform, turns a skill that loads into a skill that fails partway through the task it was invoked for.

Check: within a skill's `scripts/` directory, at any depth, every executable file starts with a shebang naming `sh` or `node`, directly or through `env`; JavaScript resolves every import and require to a relative path, an absolute path, or a real Node built-in module; no script uses TypeScript, a runtime-specific global, or a runtime-specific module; and the skill directory contains no dependency manifest, lockfile, or `node_modules`. A skill that ships no script and no manifest falls outside this rule rather than failing it.

Fixed by: oss-skill
Forges: both

### R-SKL-06: Every host the repository claims support for has a working install path

A README that names a host it has shipped nothing for sends a reader to a command that fails. Hosts read different manifests, so support is a file at a path, not a sentence.

Check: for every host named in `README.md` or in the install documentation it links to, either the manifest that host reads is committed at the path the host reads it from, or a documented install command exists that needs no manifest; and no host is named that has neither.

Fixed by: oss-skill
Forges: both

### R-SKL-07: Each skill is a focused, progressively disclosed procedure

A skill adds value only when it triggers for the right task, supplies knowledge the agent lacks, and leads the work through a repeatable procedure. Generic explanation, broad menus of equal choices, and unnecessary reference loads consume context without improving the result.

Check: the description states both the task outcome and when to use the skill; the body keeps one coherent workflow, gives a default when several approaches exist, preserves non-obvious gotchas, and includes a verification loop; conditional detail lives in directly linked files loaded only at the branch that needs it; and the instructions name capabilities rather than harness-specific tools.

Fixed by: oss-skill
Forges: both
