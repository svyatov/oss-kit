---
name: oss-harden
description: "Harden repository security, workflow permissions, dependency controls, branch protection, and release tags on GitHub or GitLab."
disable-model-invocation: true
license: MIT
---

# Harden the security posture of an open source repository

Read every existing workflow, pipeline, updater configuration, and branch-protection setting before proposing edits. Repair gaps against the SEC rules in place. Do not replace an existing workflow with a fresh template.

Use [references/github.md](references/github.md) for GitHub and [references/gitlab.md](references/gitlab.md) for GitLab. Read the matching reference before writing configuration or settings instructions. Never transfer commands, API paths, or YAML keys between forges by analogy.

## Scope

The SEC rules belong here: R-SEC-01 pinned references, R-SEC-02 least-privilege permissions, R-SEC-03 dependency updates, R-SEC-04 branch protection, R-SEC-05 signed tags, R-SEC-06 GitLab pipeline inputs, R-SEC-07 untrusted input, R-SEC-08 committed lockfiles, R-SEC-09 static analysis, R-SEC-10 secret detection, R-SEC-11 vulnerability watching, R-SEC-12 required review, R-SEC-13 immutable release tags, R-SEC-14 update cooldown, and R-SEC-15 install scripts.

When `oss-audit-report.md` exists, read this skill's group and its quoted checks. Otherwise, work from the request and `STANDARD.md`.

This skill owns security controls in workflow and pipeline files. `oss-ci` decides what runs and when; `oss-publish` owns publication and registry authentication. `oss-community` writes CODEOWNERS; this skill enforces it. Fix mutable external references and broad or implicit permissions in all those files. Hand other CI or publication needs to their owning skill; do not add product features.

Read `oss-writing` before writing branch names, commits, change requests, or issues. It supplies writing guidance, not a separate work handoff.

## Principles

Verify commands, API paths, and settings against current official documentation before using them. State plan-tier limits and the strongest control the actual tier supports.

Edit repository files directly. For owner-controlled forge settings, derive the owner, repository, and branch from repository data. Present one settings block with the resolved URL, wait for confirmation, then verify available API evidence before continuing.

## Process

### Step 1: Detect the forge

Look for `.github/workflows/` or `.gitlab-ci.yml`, check the git remote for a github.com or gitlab host, or ask directly if neither signal is present. If the user states the forge explicitly, trust that over any signal found in the repository. This decides which reference file governs the rest of this process.

### Step 2: Read the current state

Settle the credential before the first call rather than discovering the gap on a failed one. Every read and write from here on goes through the forge's API.

For GitHub, read [Credential requirements](references/github.md#credential-requirements) before calling the API.

For GitLab, read [Credential requirements](references/gitlab.md#credential-requirements) before calling the API. Use a read-only token for reporting and a write-capable token only for repairs. Keep tokens out of command text and report inaccessible settings as unknown.

With that settled, read what already exists before changing anything, using the commands the matching reference file names for each of the following:

Every workflow or pipeline file, so the `uses:` lines, `image:` and `include:` entries, and `permissions:` blocks that need fixing are known before any edit is proposed.

Every `action.yml` or `action.yaml` the repository ships, so composite action `uses:` entries are also known.

Read every manifest and lockfile, including documentation, examples, tooling, and unpublished dependency trees. Steps 5, 10, 11, and 12 use this presence inventory. Record an empty set when no registry dependencies exist.

Read the file for each ecosystem on that list before configuring anything for it. Each one carries the updater's ecosystem key and whether security updates exist for it, the lockfile and the command that installs from it frozen, the analyzer the language has, and what watches it for known vulnerabilities:

- [references/ecosystems/npm.md](references/ecosystems/npm.md)
- [references/ecosystems/pypi.md](references/ecosystems/pypi.md)
- [references/ecosystems/rubygems.md](references/ecosystems/rubygems.md)
- [references/ecosystems/crates.md](references/ecosystems/crates.md)
- [references/ecosystems/go-modules.md](references/ecosystems/go-modules.md)
- [references/ecosystems/packagist.md](references/ecosystems/packagist.md)
- [references/ecosystems/nuget.md](references/ecosystems/nuget.md)
- [references/ecosystems/maven-central.md](references/ecosystems/maven-central.md)
- [references/ecosystems/hex.md](references/ecosystems/hex.md)
- [references/ecosystems/pubdev.md](references/ecosystems/pubdev.md)
- [references/ecosystems/containers.md](references/ecosystems/containers.md)

Detect a container ecosystem through a registry push or an existing registry image, never a Dockerfile alone. If an ecosystem has no reference here, report that research gap instead of generalizing from another language.

The existing dependency update configuration, if any: `.github/dependabot.yml` or a Renovate configuration on GitHub, a Renovate configuration on GitLab. Note which ecosystems it already covers and which it does not, rather than assuming none exists.

The current branch or merge request protection settings for the default branch, read from the forge's own API rather than assumed from the repository files, since a protected branch leaves no trace in the repository itself.

Whether the newest release tag is signed, if a release has shipped yet; a repository with no tags yet has nothing to check here, so say that plainly instead of treating it as a gap.

Verified 2026-08-07 against [GitHub repository REST endpoints](https://docs.github.com/en/rest/repos/repos), [GitLab token scopes](https://docs.gitlab.com/user/profile/personal_access_tokens/), [GitLab job token scope API](https://docs.gitlab.com/api/project_job_token_scopes/), [GitLab project security settings API](https://docs.gitlab.com/api/project_security_settings/), and the current sources named in `references/ecosystems/`.

### Step 3: Pin third-party references to immutable content

For R-SEC-01, pin every external GitHub `uses:` reference to a full 40-character SHA, including reusable workflows and composite actions. Preserve the selected version in a trailing comment. For R-SEC-06 on GitLab, pin `image:`, `services:`, and external `include:` entries. Resolve the existing version unless an upgrade is authorized. Check current compatible and major releases and report lag separately.

On GitHub, use [the bundled resolver](references/github.md#resolve-action-references-with-the-bundled-script), or its documented manual fallback. Dereference annotated tags and report branch references explicitly.

Installer commands inside steps are outside R-SEC-01 and R-SEC-06. Registry installs belong to R-SEC-08 in Step 10. Git-URL and piped-script installers need the origin check below.

For a git-URL or piped-script installer, confirm its upstream repository or documentation publishes that exact install path. Registry metadata alone proves no origin. Report unestablished origin as a separate supply-chain observation, with no rule ID. Do not install until the maintainer decides, and do not substitute a commit pin for establishing origin.

### Step 4: Set least-privilege permissions

For R-SEC-02 on GitHub, set top-level permissions to at most `contents: read` and grant exceptions per job. Read [Workflow permission defaults](references/github.md#workflow-permission-defaults) before editing. GitLab uses the job-token controls in Step 7 instead.

### Step 5: Configure automated dependency updates

Configure R-SEC-03 coverage for every present application and CI dependency ecosystem. Extend an existing updater; ask before replacing it. Read [GitHub updater details](references/github.md#updater-coverage-and-delay) or [GitLab updater details](references/gitlab.md#updater-coverage-and-delay).

For R-SEC-14, configure the updater's release-age delay and resolve its effective coverage, including overrides and exclusions. Preserve at least Dependabot's three-day platform delay; Renovate has no delay by default. Verify the actual security-update exemption instead of treating missing-timestamp behavior as a vulnerability control. With no updater, report R-SEC-03 alone.

For R-SEC-15, inspect every CI registry install for an explicit block on dependency-supplied install code or a committed allowlist. Read the ecosystem reference for supported controls. Report unsupported ecosystems as outside scope. Write the flag or allowlist even when the current manager defaults to blocking scripts.

Verified 2026-08-07 against [GitHub Actions metadata syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax.md), [GitHub secure use reference](https://docs.github.com/en/actions/reference/security/secure-use.md), [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference.md), [Dependabot cooldown guidance](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/optimizing-pr-creation-version-updates), [Renovate configuration options](https://docs.renovatebot.com/configuration-options/), and the current sources named in `references/ecosystems/`. The two GitHub Dependabot pages conflict on the unset cooldown default.

### Step 6: Branch protection and required review

For R-SEC-04 on both forges, require change requests and passing CI, and reject force pushes and branch deletion. Apply these controls even with one maintainer. Present the resolved settings URL, obtain confirmation, and verify read-back evidence. Create GitHub rulesets for new protection; retain working classic protection unless migration is requested.

On GitHub, use [the ruleset helper](references/github.md#edit-an-existing-ruleset) for existing rulesets. Preserve unrelated rules, strip API-read nulls before writing, and read the result back. Do not infer applied settings from a successful write.

Read the access list before applying R-SEC-12. It applies only where at least two principals hold merge access. Otherwise report it outside scope and leave review requirements off, without compensating bypass entries. Where applicable, require approval and enforce existing CODEOWNERS. If the plan lacks enforced review, report that limitation and the strongest available fallback; do not claim paid controls on a free plan.

### Step 7: GitLab job token scope

R-SEC-06 also covers which other projects' job tokens may access this GitLab project. The allowlist is an inbound control on the target project, not a list of projects this pipeline's token may call. Read the current inbound scope and allowlist with the commands in `references/gitlab.md`; where the scope is open, enable it and retain only source projects that need access. Where fine-grained job-token permissions are enabled, grant each allowlisted source only the endpoints it needs.

### Step 8: Signed and protected tags

For R-SEC-05, follow the signed-tag procedure in [GitHub](references/github.md#signed-tag-verification-procedure) or [GitLab](references/gitlab.md#signed-tag-verification-procedure). Fetch tags, establish the tag type and signer identity, then verify the signature. Support OpenPGP, SSH, and X.509. Distinguish an unconfigured verifier from an invalid signature. With no release tag, record that nothing can be verified yet.

For R-SEC-13, read tag protection separately from branch protection: GitHub tag rulesets or GitLab protected tags. Establish which person or workflow creates releases before restricting creation. Present missing settings and verify read-back evidence using the matching forge reference. Configure protection before the first release, and report any remaining deletion capability described by the forge.

Verified 2026-08-07 against [GitHub rules REST endpoints](https://docs.github.com/en/rest/repos/rules), [GitHub ruleset rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), [Git tag](https://git-scm.com/docs/git-tag), [Git configuration](https://git-scm.com/docs/git-config), [GitLab merge request approvals](https://docs.gitlab.com/user/project/merge_requests/approvals/), and [GitLab protected tags](https://docs.gitlab.com/user/project/protected_tags/).

### Step 9: Keep untrusted input out of privileged contexts

For R-SEC-07, read the [GitHub](references/github.md#untrusted-input-procedure) or [GitLab](references/gitlab.md#untrusted-input-procedure) procedure. Pass user input through quoted arguments instead of evaluating it as shell code. Privileged workflows must not execute contributor-controlled code; place such findings first. Apply the forge-specific secret-variable protections.

Verified 2026-08-07 against [GitHub script injections](https://docs.github.com/en/actions/concepts/security/script-injections), [GitHub `pull_request_target` security](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target.md), and [GitLab CI/CD variables](https://docs.gitlab.com/ci/variables/).

### Step 10: Lockfile and frozen installs

For R-SEC-08, confirm each applicable lockfile is committed, not ignored, and CI uses the documented frozen install mode. Verify the command against the package manager's official documentation. A manifest version pin is not a content hash. With no registry dependencies, record that nothing needs locking.

Read each ecosystem reference's section on failures after committing a lockfile. Establish whether resolution varies by runtime, whether the updater maintains every lock path, and whether the lock covers CI platforms. Where runtime matters, generate on the lowest supported runtime. Provide one documented command to regenerate all locks, and add the required platform resolutions. Do not infer one ecosystem's answers from another.

### Step 11: Static analysis on pull requests

For R-SEC-09, establish which source languages an analyzer supports, including CI configuration. If none apply, report the rule outside scope. Otherwise, require analysis on change requests to the default branch and make its result a merge requirement. On GitHub, follow [Required CodeQL checks](references/github.md#required-codeql-checks): use advanced setup, verify fork coverage and check reporting, and add the ruleset code-scanning rule. Obtain confirmation before disabling existing default setup.

### Step 12: Enable the detection controls this repository can actually use

For R-SEC-10 and R-SEC-11, derive applicable controls from the forge, plan tier, and Step 2's ecosystem inventory. Name controls outside the applicable set and their reasons.

When an API supports a setting, write it and read it back separately. Success on write does not prove the setting changed. When no API exists, present the resolved settings URL and obtain confirmation. Distinguish user-confirmed settings from API evidence. An inaccessible or absent response field means unknown, not disabled; GitHub omits `security_and_analysis` without admin access.

For R-SEC-11, compare the forge's watched package set with the resolved dependency set. Add a lockfile scanner for uncovered dependencies. Gate on vulnerabilities introduced by the change and report repository-wide scan results separately. Do not make an unrelated advisory with no available fix block every contribution.

Verified 2026-08-07 against the current package-manager sources named in `references/ecosystems/`, [GitHub code scanning setup types](https://docs.github.com/en/code-security/concepts/code-scanning/setup-types), [GitHub repository REST endpoints](https://docs.github.com/en/rest/repos/repos), [GitHub dependency graph ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems.md), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [GitLab secret detection](https://docs.gitlab.com/user/application_security/secret_detection/), and [GitLab dependency scanning](https://docs.gitlab.com/user/application_security/dependency_scanning/), and the workflow-file paragraph on 2026-08-11 against [CodeQL Actions built-in queries](https://docs.github.com/en/code-security/code-scanning/managing-your-code-scanning-configuration/actions-built-in-queries).

### Step 13: Read OpenSSF Scorecard results

Use Scorecard as supplementary evidence after the direct checks above, never as a substitute for them. A missing or stale result is normal and must not change a directly verified rule status. Do not offer to install or run another scanner unless the user asks for that expansion.

The Scorecard section of the reference file Step 1 chose carries the rest: `references/github.md` for what the API returns, which checks map to which rule, and how `Branch-Protection` scores a repository that R-SEC-12 does not reach; `references/gitlab.md` for what the public dataset covers on that forge.

### Step 14: Present the result

Read every R-SEC `Check:` against the resulting repository and settings. Fix failures and restart the checks after each fix. Do not report completion with a failing rule unless the maintainer declined its fix.

Use exactly five statuses: fixed, pending confirmation, outside the repository, unknown, or declined. Fixed requires a written file or verified setting. Pending confirmation means the settings block awaits the user. Outside means the rule's precondition does not apply. Unknown means a read could not answer. Declined requires the maintainer's decision and recorded reason.

Group findings by rule ID, naming edited files and pending settings with resolved URLs. Include Step 3's supply-chain observations separately. Show dated Scorecard findings only as supplementary evidence. Never mark an unconfirmed setting fixed.

Close with optional controls, separate from rule findings. Include controls with no API, controls withheld by the plan tier, and improvements beyond the standard. For each, state what it does, why this skill could not set it, and what enabling it requires.

Verified 2026-08-07 against [OpenSSF Scorecard checks](https://github.com/ossf/scorecard/blob/main/docs/checks.md) and [GitHub Scorecard guidance](https://docs.github.com/en/code-security/security-overview/viewing-security-insights-for-your-organization#viewing-openssf-scorecard-metrics-for-an-organization).
