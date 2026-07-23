# The oss-kit standard

This document states every opinion oss-kit holds about an open source repository, one numbered rule at a time. A rule has an ID, a statement, the reason it exists, a `Check:` line naming the evidence a reader or a tool can look for, the skill that fixes it, and the forges it applies to. The skills in this repository cite these IDs instead of restating the opinions, so a rule changes in one place. `oss-audit` scores a repository against these IDs.

Some rules name a fallback marked below the bar. That marker means the blessed option is unavailable, not that the fallback is acceptable practice: a registry with no trusted publishing, a forge with no attestation support, a plan tier with no protected environments. Take the fallback only when the platform leaves you no other option, and revisit it when the platform catches up.

Rule IDs are `R-<AREA>-<NN>`. Areas are DOC, COM, CI, SEC, PUB, CHG, and SKL. IDs are permanent: a retired rule keeps its number and is marked retired rather than reused.

## Documentation

### R-DOC-01: The README opens with one sentence saying what the project does

A reader decides in about five seconds whether to keep reading. A title followed by a badge wall or a table of contents spends that budget on nothing.

Check: the first paragraph of `README.md` after the title is a single sentence naming what the project is and who it is for, and it appears before any table of contents, badge row, or `##` heading.

Fixed by: oss-readme
Forges: both

### R-DOC-02: The README shows how to install the project and one runnable example, in that order, near the top

Installation and a working snippet answer the two questions every visitor has. Burying them under motivation, philosophy, or comparison tables costs you the readers who would have used the project.

Check: `README.md` contains a fenced code block with an install command, followed by a second fenced code block showing minimal usage, and both appear before any section about design, motivation, or comparisons.

Fixed by: oss-readme
Forges: both

### R-DOC-03: The README links to the license, the changelog, and the contributing guide

These three files answer whether a reader may use the project, what changed since they last looked, and how to send a fix. A link that resolves to nothing is worse than no link, because it costs a click to learn the file is missing.

Check: `README.md` contains links whose targets are the license file, `CHANGELOG.md`, and `CONTRIBUTING.md`, and each target exists in the repository.

Fixed by: oss-readme
Forges: both

### R-DOC-04: Every version, command, and support claim in the README matches the repository

Documentation drifts silently. A README promising support for a runtime version the test matrix dropped two releases ago sends a contributor into an afternoon of debugging that ends in your issue tracker.

Check: runtime versions, package versions, install commands, and CLI flags quoted in `README.md` appear with the same values in the package manifest, the CI configuration, and the source.

Fixed by: oss-readme
Forges: both

### R-DOC-05: Documentation prose is plain, active, and free of marketing language

Documentation is read by someone who is already stuck. Promotional adjectives and hedging add reading time without adding information, and they make the honest parts harder to trust. Write sentences in the active voice and name the actor, so a reader learns who has to do the thing. The check below names only evidence a tool can count, because an auditor that scores the same files differently on two runs makes every other score in the report unreliable.

Check: `README.md`, files under `docs/`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and the entry text under `CHANGELOG.md` release headings contain no em dash (U+2014), en dash (U+2013), or emoji character; every heading is sentence case; and none of the words robust, powerful, seamless, comprehensive, blazing, or effortless describes the project.

Fixed by: oss-writing
Forges: both

## Community

### R-COM-01: The repository ships a license file whose license matches the package manifest

Without a license file the default is exclusive copyright, so nobody may legally use the code. A manifest field saying MIT while the file says Apache-2.0 forces every downstream legal review to stop and ask.

Check: `LICENSE` or `LICENSE.md` exists at the repository root, and the license it contains matches the `license` field of the package manifest.

Fixed by: oss-community
Forges: both

### R-COM-02: CONTRIBUTING.md tells a newcomer how to set up, test, and submit a change

A contributor who cannot run the tests sends a patch you have to fix yourself. The three commands that get them from clone to green cost you one paragraph and save every future contributor an hour.

Check: `CONTRIBUTING.md` exists at the repository root, in `.github/`, or in `docs/` on GitHub, or at the repository root on GitLab, and states the setup command, the test command, and how to open a pull request or merge request.

Fixed by: oss-community
Forges: both

### R-COM-03: CODE_OF_CONDUCT.md exists and names a working reporting contact

A code of conduct with `[INSERT CONTACT METHOD]` still in it is worse than none, because it advertises a reporting channel that goes nowhere.

Check: `CODE_OF_CONDUCT.md` exists at the repository root, in `.github/`, or in `docs/` on GitHub, or at the repository root on GitLab, and contains an email address or a reporting URL with no template placeholder text.

Fixed by: oss-community
Forges: both

### R-COM-04: SECURITY.md states a private reporting channel and a response window

Without a stated channel, a finder either opens a public issue that discloses the bug to everyone at once, or gives up. A stated response window tells them when to escalate.

Check: `SECURITY.md` exists at the repository root, in `.github/`, or in `docs/` on GitHub, or at the repository root on GitLab, and names a private channel (GitHub private vulnerability reporting, a GitLab confidential issue, or an email address) together with the time you commit to responding in.

Fixed by: oss-community
Forges: both

### R-COM-05: Issue and change-request templates exist so reports arrive with the facts you need

Every free-form bug report costs a round trip to ask for the version and the reproduction. A template collects both before the issue is filed.

Check: the repository has `.github/ISSUE_TEMPLATE/` with at least one template plus `.github/pull_request_template.md`, or `.gitlab/issue_templates/` with at least one template plus `.gitlab/merge_request_templates/`.

Fixed by: oss-community
Forges: both

### R-COM-06: A CODEOWNERS file assigns a reviewer to every path

Without a catch-all owner, a change to an unclaimed directory waits for someone to notice it. With one, the forge requests review automatically.

Check: a `CODEOWNERS` file exists in the repository root, `.github/`, `.gitlab/`, or `docs/`, and it contains a `*` rule naming at least one owner.

Fixed by: oss-community
Forges: both

## Continuous integration

### R-CI-01: CI runs on every push to the default branch and on every change request

A pipeline that only runs on tags tells you the build broke after you shipped it. Running on the default branch and on every pull or merge request catches breakage while the author still has the context.

Check: the CI configuration triggers on `push` to the default branch and on `pull_request` (GitHub), or defines rules for `$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH` and `merge_request_event` (GitLab).

Fixed by: oss-ci
Forges: both

### R-CI-02: CI runs the same lint, test, and build commands the contributing guide gives to humans

When CI runs a different command than `CONTRIBUTING.md` documents, a contributor passes locally and fails in CI, and neither of you can tell which is authoritative.

Check: the CI configuration invokes a linter, a test runner, and the build command for the shipped artifact, and each command string matches the one in `CONTRIBUTING.md`.

Fixed by: oss-ci
Forges: both

### R-CI-03: The test matrix covers every runtime version the project claims to support

A support claim you do not test is a guess. Dropping the oldest supported version from the matrix is how a patch release breaks half the installed base.

Check: the matrix entries in the CI configuration list the same runtime versions as the supported range declared in the package manifest, including the oldest and the newest.

Fixed by: oss-ci
Forges: both

### R-CI-04: Dependency caches are keyed on the lockfile

A cache key that ignores the lockfile serves stale dependencies after an upgrade, so CI tests a dependency set nobody has. A key that changes on every run caches nothing and pays the restore cost anyway.

Check: every cache step in the CI configuration includes a hash of the lockfile in its key, and declares a restore-key prefix so a changed lockfile still warms from the previous cache.

Fixed by: oss-ci
Forges: both

### R-CI-05: Every job has a timeout, and superseded runs for the same branch are cancelled

A hung job holds a runner until the platform's default timeout expires, which is six hours on GitHub. Queued runs for commits nobody will merge burn the same minutes.

Check: every job sets `timeout-minutes` (GitHub) or `timeout` (GitLab), and the configuration sets `concurrency` with `cancel-in-progress: true` for change-request runs (GitHub) or marks jobs `interruptible: true` with auto-cancel enabled (GitLab).

Fixed by: oss-ci
Forges: both

## Security posture

### R-SEC-01: Pin every third-party action to a full commit SHA

Tag and branch refs are mutable, so a compromised upstream tag changes what runs in your workflow without a diff in your repo.

Check: every `uses:` line in `.github/workflows/` that references a third-party action resolves to a 40-character SHA.

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

### R-SEC-04: The default branch requires review and passing checks before merge, and rejects force pushes

Branch protection is the only rule here that a repository setting enforces rather than a file. Without it, every other rule in this document can be bypassed by one push.

Check: the default branch is protected, requires at least one approving review, requires the CI status check to pass, and blocks force pushes and deletion. Read the settings with `gh api repos/{owner}/{repo}/branches/{branch}/protection` on GitHub, or `GET /projects/:id/protected_branches/:name` on GitLab.

Fixed by: oss-harden
Forges: both

### R-SEC-05: Release tags are signed and verifiable

An unsigned tag proves nothing about who cut the release. Anyone with write access, or anyone who takes it, can point a tag at any commit. Neither forge exposes an API that reports tag signature validity, so the evidence comes from git itself once the tag and the maintainer's public key are local.

Check: after `git fetch --tags` and importing the maintainer's published signing key, `git tag -v <tag>` on the newest release tag succeeds, and `git cat-file -t <tag>` prints `tag`, which means the tag is annotated rather than lightweight.

Fixed by: oss-harden
Forges: both

### R-SEC-06: A GitLab pipeline pins every image and every included file, and limits what its job token reaches

GitLab has no `uses:` line to pin, so the same mutable-reference problem arrives through `image:`, `services:`, and `include:`. A floating image tag or an `include:` on a branch name changes what runs without a diff in your repository, and a job token with an open inbound scope lets whatever runs read every project that trusts the token. The pin and the scope belong in one rule because a pinned pipeline with an unscoped token still hands an attacker the blast radius.

Check: every `image:` and `services:` entry in `.gitlab-ci.yml` and its included files names an image by digest (`image@sha256:...`), every `include:project` entry sets `ref:` to a commit SHA or a protected tag, every `include:remote` entry points at an immutable URL and sets `integrity:`, and `GET /projects/:id/job_token_scope` reports `inbound_enabled` true with `GET /projects/:id/job_token_scope/allowlist` naming only the projects the pipeline needs.

Fixed by: oss-harden
Forges: gitlab

## Release and publishing

### R-PUB-01: Publishing happens in CI, triggered by a tag, never from a developer machine

A local publish ships whatever is in the working tree, from a machine holding a long-lived registry token. A tag-triggered CI publish ships a commit that is in the repository and that CI has tested.

Check: a release workflow or pipeline triggered by a tag push runs the publish command, and the publish command appears in no local script intended for manual use.

Fixed by: oss-publish
Forges: both

### R-PUB-02: The publish job authenticates to the registry with trusted publishing, not a stored token

A long-lived registry token in CI secrets is the single credential that turns any workflow compromise into a supply-chain compromise. Trusted publishing exchanges a short-lived OIDC token per run, so there is nothing to steal between releases.

Check: the publish job requests `id-token: write` and publishes through the registry's OIDC flow (npm trusted publishing, PyPI trusted publishers, RubyGems OIDC, crates.io trusted publishing). Where the registry offers no OIDC flow, a scoped token limited to one package is below the bar and permitted.

Fixed by: oss-publish
Forges: both

### R-PUB-03: Published artifacts carry build provenance

Provenance links the published artifact back to the commit and workflow that built it, so a consumer can tell a legitimate release from one uploaded by whoever held the token.

Check: the publish step emits provenance (`npm publish --provenance`, PyPI attestations, or a build provenance attestation step), and the registry serves it for the newest version: `npm audit signatures` reports a verified attestation for the package, or `GET https://pypi.org/integrity/<project>/<version>/<filename>/provenance` returns a provenance object instead of a 404.

Fixed by: oss-publish
Forges: both

### R-PUB-04: A human approves the run before anything reaches a public registry

A registry publish cannot be undone. An approval gate is the last point where a compromised tag, a wrong version, or a bad artifact can be stopped.

Check: the publish job targets a GitHub environment with required reviewers, or a GitLab protected environment with a manual job, and the environment lists at least one approver other than an automation account. Read `protection_rules` from `gh api repos/{owner}/{repo}/environments/{environment_name}` and look for a `required_reviewers` entry on GitHub, or read `approval_rules` and `deploy_access_levels` from `GET /projects/:id/protected_environments/:name` on GitLab.

Fixed by: oss-publish
Forges: both

## Changelog and versioning

### R-CHG-01: The repository keeps CHANGELOG.md in Keep a Changelog format

A changelog exists so a user upgrading two versions can read what changed without diffing tags. Generated commit lists do not answer that, because commit subjects address the maintainer, not the user.

Check: `CHANGELOG.md` exists at the repository root, carries an `## [Unreleased]` section, and every release heading matches `## [X.Y.Z] - YYYY-MM-DD` with entries grouped under Added, Changed, Deprecated, Removed, Fixed, or Security.

Fixed by: oss-changelog
Forges: both

### R-CHG-02: Versions follow semantic versioning, and any breaking change bumps the major

Semver is a promise to a dependency resolver. A breaking change shipped as a patch bypasses every version constraint your users wrote and breaks their builds without their action.

Check: every version in `CHANGELOG.md` and every release tag matches `v?MAJOR.MINOR.PATCH` with an optional prerelease suffix, and every release containing a Removed entry or a breaking Changed entry increments MAJOR.

Fixed by: oss-changelog
Forges: both

### R-CHG-03: The release tag, every versioned manifest, and the newest changelog entry are the same version

When these disagree, nobody can tell which one describes the artifact users installed, and the changelog stops being a reliable upgrade record. A repository that ships several manifests, one per host or one per package, multiplies the ways they can drift apart.

Check: for the newest release tag, the tag name, the `version` field of every manifest in the repository that declares one, and the topmost release heading in `CHANGELOG.md` all name the same version.

Fixed by: oss-changelog
Forges: both

### R-CHG-04: Forge release notes reproduce the changelog entry for that version

Auto-generated release notes list merged pull requests, which repeats work the changelog already did better. Two divergent descriptions of one release is worse than one.

Check: the release body on the forge for the newest version matches the corresponding section of `CHANGELOG.md`. Read it with `gh release view <tag> --json body` on GitHub, or from the `description` field of `GET /projects/:id/releases/:tag_name` on GitLab.

Fixed by: oss-changelog
Forges: both

### R-CHG-05: A public API is deprecated in a release before it is removed

Removing an API without warning turns an upgrade into an outage. A deprecation shipped one minor release earlier gives users a window to migrate while both paths still work.

Check: every item under Removed in a release appears under Deprecated in an earlier release, and the deprecated API emits a runtime warning naming its replacement.

Fixed by: oss-changelog
Forges: both

## Agent skills

This area applies only to a repository that ships agent skills, meaning a repository holding at least one `SKILL.md`. Where none exists, the area is not applicable as a whole and its rules are not checked one at a time.

### R-SKL-01: Skills live in a top-level `skills/` directory, one directory per skill

The `skills` CLI installer and every plugin loader read that path. A repository that keeps its skills anywhere else cannot be installed by the commands its own README documents, so the skills reach nobody.

Check: a `skills/` directory exists at the repository root, every skill is a direct child of it and holds a `SKILL.md`, and no other `SKILL.md` exists in the repository. Resolve a symlinked directory such as `.claude/skills` to its target before applying the check, so a committed symlink pointing at `skills/` does not read as a second copy.

Fixed by: oss-skill
Forges: both

### R-SKL-02: Every skill conforms to the Agent Skills specification

The specification is the one format every host reads. A skill that violates it fails to load, and most hosts fail silently, so the author sees a skill that never triggers and no error saying why.

Check: a specification validator exits 0 for every directory under `skills/`. `skills-ref validate <dir>` is one such validator, installed from the `skills-ref` directory of the upstream `agentskills/agentskills` repository.

Fixed by: oss-skill
Forges: both

### R-SKL-03: A `SKILL.md` body stays under 500 lines, with depth in `references/`

The whole body loads into context when the skill activates, competing there with the conversation and with every other active skill. The specification sets the ceiling at 500 lines and about 5000 tokens, and puts the rest under `references/`, loaded only when the task calls for it.

Check: every `skills/*/SKILL.md` is under 500 lines, and any skill needing more material ships it under that skill's own `references/` directory.

Fixed by: oss-skill
Forges: both

### R-SKL-04: Every `SKILL.md` declares a license

Installers extract one skill directory at a time. The repository license file does not travel with it, so an extracted skill arrives with no terms attached and nobody downstream can tell whether they may use it.

Check: the frontmatter of every `skills/*/SKILL.md` carries a `license:` field, and its value names the same license as the repository license file.

Fixed by: oss-skill
Forges: both
