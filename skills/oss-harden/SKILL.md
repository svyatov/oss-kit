---
name: oss-harden
description: "Harden the security posture of an open source repository: pin CI actions to full commit SHAs, restrict workflow permissions, keep untrusted input out of shell commands, enable automated dependency updates, lock dependency resolution, run static analysis on pull requests, detect committed secrets before they reach the default branch, watch every shipped dependency ecosystem for known vulnerabilities, configure branch protection, enforce code owner review, and sign tags. Use when the user asks to harden a repo, improve supply chain security, fix an OpenSSF Scorecard finding, pin actions, fix a workflow script injection, enable secret scanning or push protection, turn on dependency vulnerability alerts, or lock down CI. Covers GitHub and GitLab. Publishing belongs to oss-publish."
license: MIT
---

# Harden the security posture of an open source repository

This skill audits and repairs rather than generating from scratch. Every workflow, pipeline, or setting it touches already exists; the job is to read what is there before changing anything, then close the gap between that and the SEC rules below. Read every existing workflow or pipeline file, the existing dependency update configuration, and the current branch or protected-branch settings before proposing a single edit. Do not write a fresh workflow from a template; edit the one the project already has.

The concrete syntax for reading and fixing each control differs by forge, so it lives in one reference file per forge: [references/github.md](references/github.md) for GitHub Actions and repository settings, and [references/gitlab.md](references/gitlab.md) for GitLab CI/CD and project settings. Read the matching file before writing any configuration or giving any settings instruction; do not carry a command, an API path, or a YAML key from one forge to the other by analogy, because GitLab has no direct equivalent for several GitHub controls and the reverse is also true.

## Scope

The SEC rules belong here: R-SEC-01 pinned references, R-SEC-02 least-privilege permissions, R-SEC-03 dependency updates, R-SEC-04 branch protection, R-SEC-05 signed tags, R-SEC-06 GitLab pipeline inputs, R-SEC-07 untrusted input, R-SEC-08 committed lockfiles, R-SEC-09 static analysis, R-SEC-10 secret detection, R-SEC-11 vulnerability watching, and R-SEC-12 required review.

This skill owns the security posture of the workflow and pipeline files two other skills also write into, and the boundary is the rule area, not a description of files. `oss-ci` decides what runs and when. `oss-publish` writes the publish job. Treat every mutable external reference and every overly broad or implicit token permission in those files as work for this skill. `oss-community` writes CODEOWNERS but does not enforce it; enforcing code owner review is a branch or merge request protection setting, which belongs here. Do not decide what a job runs, add a product feature, or choose a registry authentication flow while working from this skill; note that the project needs it and hand the work to `oss-ci` or `oss-publish`.

## Principles

Verify every command, API path, and setting name against the current documentation for the platform in question before writing it down or telling the user to click it; a wrong path either does nothing or breaks the workflow. Where a control depends on the forge's plan tier, such as required merge request approvals on GitLab, say which tier it needs rather than assuming the free tier has it, and give the strongest control the project's actual tier supports.

Half of what this skill fixes is repository files, which it edits directly. The other half is settings on the forge that only a repository owner or maintainer can change: branch protection, merge request approval rules, the job token allowlist, the actions permissions policy. For that half, resolve the real owner, repository, and branch name from the repository's own data (the git remote, the manifest's repository field) and give the user a direct settings URL built from those, never a placeholder like "go to your repository settings." Present one settings block, wait for the user to confirm it is done, then verify what can be verified from the command line before moving to the next block, the same pattern `oss-publish` uses for trusted publisher setup.

## Process

### Step 1: Detect the forge

Look for `.github/workflows/` or `.gitlab-ci.yml`, check the git remote for a github.com or gitlab host, or ask directly if neither signal is present. If the user states the forge explicitly, trust that over any signal found in the repository. This decides which reference file governs the rest of this process.

### Step 2: Read the current state

Settle the credential before the first call rather than discovering the gap on a failed one. Every read and write from here on goes through the forge's API.

On GitHub, the commands assume `gh` is installed and authenticated; `gh auth status` prints the active account per host. The settings reads and writes need admin on the repository, which is also why `security_and_analysis` is absent rather than `disabled` for a caller without it.

On GitLab, an audit-only run and a repair run need different tokens, and the difference is worth keeping. The read set clears with a token carrying the `read_api` scope, which GitLab documents as read access to the API. The write set needs `api`, which GitLab documents as complete read and write access. Provision the read-only token for a sweep that only reports, so a run auditing the settings cannot rewrite them.

Scope is not the whole answer, because several project-settings reads carry a role floor of their own. GitLab documents the job-token scope reads as needing the Maintainer or Owner role, and the security-settings read as needing Security Manager, Developer, Maintainer, or Owner. Both writes, the job-token allowlist and the security settings, need Maintainer or Owner. So a read-only sweep still needs a Maintainer token; do not assume the reads clear at a lower role than the writes.

Read a refusal carefully. GitLab documents 403 as a request that is not allowed and 404 as a resource that could not be accessed, which its own wording extends to a user who is not authorized to reach it. A read denied for role reasons can therefore answer 404, which reads like a control that is off and is not. Report it as unknown.

Supply the token from an environment variable read from the operator's own secret store, and never inline it. A token pasted into a command lands in shell history and in whatever transcript the run produces, which turns one audit into a leaked credential.

With that settled, read what already exists before changing anything, using the commands the matching reference file names for each of the following:

Every workflow or pipeline file, so the `uses:` lines, `image:` and `include:` entries, and `permissions:` blocks that need fixing are known before any edit is proposed.

Every package manifest and lockfile the repository commits, which is what tells you the ecosystems this project ships. Steps 5 and 12 both consume that list, and Step 10 works the lockfiles themselves; establishing it once here is what stops each of them deriving its own. A repository with no registry dependencies has an empty list, which is an answer rather than a gap.

The existing dependency update configuration, if any: `.github/dependabot.yml` or a Renovate configuration on GitHub, a Renovate configuration on GitLab. Note which ecosystems it already covers and which it does not, rather than assuming none exists.

The current branch or merge request protection settings for the default branch, read from the forge's own API rather than assumed from the repository files, since a protected branch leaves no trace in the repository itself.

Whether the newest release tag is signed, if a release has shipped yet; a repository with no tags yet has nothing to check here, so say that plainly instead of treating it as a gap.

### Step 3: Pin third-party references to immutable content

On GitHub, every external `uses:` line in every workflow should resolve to a full 40-character commit SHA, including GitHub-owned actions and reusable workflows outside the current repository. Preserve the selected version in a trailing comment so a human and the updater can still read it. On GitLab, there is no action-shaped `uses:` step; the same mutable-reference problem arrives through `image:`, `services:`, and external `include:` entries, so pin those instead, per R-SEC-06. Resolve the version the configuration already selects unless the user separately authorizes an upgrade. Check the newest compatible and newest major releases and report lag, but do not combine a security pin with a potentially breaking upgrade. The reference file for the detected forge gives the exact resolution process and the caveat that an annotated tag needs one extra step most naive lookups miss.

A workflow or pipeline can also invoke a package installer or a tool installer directly, such as a `pip install` or a `uv tool install` of a package or a git source. R-SEC-01 and R-SEC-06 check only `uses:`, `image:`, `services:`, and `include:`; they do not extend to an installer command run inside a step, and no rule in `STANDARD.md` reaches it, so do not cite a rule ID for what this paragraph produces.

Where such a command installs from a registry, R-SEC-08 already governs it through the lockfile, so read Step 10 rather than treating it here. Where it installs from a git URL or a piped script, check that the upstream project actually publishes what the command fetches: read the project's own repository or documentation and confirm the install path came from there, rather than working backward from a registry page, whose author, homepage, and repository fields are text the publisher typed. Report a command whose upstream cannot be established as a supply-chain observation in the summary, separate from the rule findings, and say plainly that it should not be installed until a maintainer decides. Do not resolve it by pinning it to a commit SHA. Pinning code whose origin is unestablished gives the same code at a known revision, and a maintainer reading a pinned line will reasonably assume someone already vouched for it.

### Step 4: Set least-privilege permissions

On GitHub, every workflow needs a top-level `permissions:` block granting no more than `contents: read`, with any job that needs more declaring the extra scope at the job level instead of widening the top-level block, per R-SEC-02. This has no GitLab equivalent as a rule; GitLab's analogous control is the job token scope in Step 7. Read the reference file for the default a workflow gets when `permissions:` is absent entirely, since that default is not the same as writing `contents: read` explicitly and a workflow already at the safe default because a wider default was never in play still benefits from writing the block down.

### Step 5: Configure automated dependency updates

Pinning freezes a reference until something unfreezes it; R-SEC-03 requires an updater covering both the project's application dependencies and its CI dependencies, on both forges. On GitHub, Dependabot's `github-actions` ecosystem is what proposes the SHA and comment update for every workflow this skill just pinned, so a `dependabot.yml` this skill writes or edits needs that ecosystem alongside one entry for every ecosystem the manifests read in Step 2 declare; a `dependabot.yml` that updates the package manager but leaves out `github-actions` re-freezes the actions the moment they are pinned. On GitLab, there is no equivalent of Dependabot shipped by the platform; the reference file names the documented alternative and what running it costs. Where a Renovate configuration already exists on either forge, extend its `packageRules` or presets rather than adding a competing Dependabot config; ask before replacing one updater with the other.

### Step 6: Branch protection and required review

R-SEC-04 requires the default branch to take changes only through a change request, require at least one CI status check to pass, and reject force pushes and deletion, on both forges. This is a forge setting, not a file, so give the user the resolved settings URL for the repository or project found in Step 1, wait for confirmation, then verify with the read command from Step 2. On GitHub, set this up as a repository ruleset; classic branch protection is the older form, still enforced where it already exists and worth reading, but not what to create today. Every control in this paragraph works without a second person, so set all of them whatever the repository's size.

R-SEC-12 adds the approving review, and reaches only a repository where two or more principals hold push, maintain, or admin access. Establish that first by reading the access list the rule's check names, and report the rule as outside the repository when one principal holds every merge path. Do not report a violation there, and do not set the requirement anyway and then add a bypass entry to undo it; that trades a control the repository had for a status that blocks nobody. Where the rule does reach, set the review requirement alongside the controls above, and where `oss-community` has already written a CODEOWNERS file, turn on the code-owner-approval setting too; a CODEOWNERS file with nothing enforcing it is a suggestion, not a control. Where the platform's free tier does not offer enforced review, as GitLab's does not, say so plainly and give the strongest control the tier actually has; take that fallback only because the tier leaves no other option, the same spirit `STANDARD.md` states for the fallbacks it marks below the bar, and do not claim a paid capability is active on a free plan.

### Step 7: GitLab job token scope

R-SEC-06 also covers which other projects' job tokens may access this GitLab project. The allowlist is an inbound control on the target project, not a list of projects this pipeline's token may call. Read the current inbound scope and allowlist with the commands in `references/gitlab.md`; where the scope is open, enable it and retain only source projects that need access. Where fine-grained job-token permissions are enabled, grant each allowlisted source only the endpoints it needs.

### Step 8: Signed tags

R-SEC-05 applies the same way on both forges, because the evidence comes from git itself, not from a forge API. Fetch the tags, then establish what the tag is before reaching for any key: `git cat-file -t <tag>` must print `tag`, and one `git for-each-ref` read returns the tagger's address and the signature format together. Only then resolve which account publishes the key and fetch it; the repository owner is that account only when the owner is a user, and neither the release publisher nor the tagged commit's author is a substitute, because either can differ from the tagger. Support OpenPGP, SSH, and X.509 signatures instead of assuming every maintainer uses GPG. Fetching a key by account proves publication and not control, so neither that fetch nor either forge's UI verification badge replaces confirming the maintainer through a channel they control. Distinguish a failed verification from an unconfigured verifier: with SSH signatures and no allowed-signers file, git exits nonzero with a configuration error, which is the check failing to run and scores unknown rather than failed. The per-forge command sequences are in `references/github.md` and `references/gitlab.md`. A repository with no release tag yet has nothing to check; say that rather than reporting a gap, and revisit at the first release.

### Step 9: Keep untrusted input out of privileged contexts

R-SEC-07 applies to both forges through different mechanisms, so read the matching reference file rather than carrying the syntax across. On GitHub the risk is textual: a `${{ }}` expression is substituted into the script before any shell sees it, so `${{ github.event.issue.title }}` inside a `run:` block executes whatever its author wrote. Move user-controlled values into an `env:` block and quote the environment variable in the shell. Separately, a `pull_request_target` or `workflow_run` workflow runs with the base repository's privileges, so it must not execute or check out contributor-controlled code; where one does, that is the highest-severity finding this skill produces and it belongs at the top of the summary. On GitLab, quote every user-controlled predefined variable in `script:` and pass values as arguments rather than evaluating generated shell. Store secrets as masked and hidden variables, protect them when only protected refs need them, and keep variable-reference expansion disabled.

### Step 10: Lockfile and frozen installs

R-SEC-08 requires the package manager's lockfile to be committed and CI to install from it in a mode that fails rather than re-resolves. Working from the manifests Step 2 read, confirm each lockfile is committed rather than gitignored, and verify the current frozen-install command in that package manager's official documentation before changing CI. Examples include `npm ci`, `uv sync --locked`, `cargo build --locked`, Bundler with local `deployment` and `frozen` configuration, and `pip install --require-hashes` only when every requirement, including transitive dependencies, carries a hash. Where the project pins versions in a manifest but commits no lockfile, say that a version pin still trusts the registry to serve the same bytes while a recorded hash does not. A repository with no registry dependencies has nothing to lock; report that rather than a gap.

### Step 11: Static analysis on pull requests

R-SEC-09 applies only where the repository holds source in a language a static analyzer supports, so establish that first and say plainly that the rule does not reach the repository when it does not, rather than reporting a violation. Where it does apply, check that an analysis workflow runs on pull requests to the default branch and that its result is a required check, since an analyzer whose failure does not block merge is advisory. On GitHub, prefer CodeQL default setup, which is a repository setting rather than a workflow file the project has to maintain, and give the resolved settings URL the same way Step 6 does; the reference file names the endpoint that reports whether it is already enabled. Where Step 6 set up a ruleset, add its code scanning rule too, which blocks a merge on what the analysis found rather than only on whether it reported, and so also catches the case where the analysis configuration is deleted and the required check simply stops appearing.

### Step 12: Enable the detection controls this repository can actually use

R-SEC-10 and R-SEC-11 ask whether the repository receives signal: that a committed secret is caught before it reaches the default branch, and that every ecosystem the project ships is watched for known vulnerabilities. Every other rule in this area checks something the project controls. These two check whether anything is looking, which is what the pinning and locking in Steps 3, 5, and 10 assume when they freeze a dependency until somebody says it is now known-bad.

Do not work from a fixed list of switches. Derive the applicable set from three things already known: the forge from Step 1, the plan tier that forge reports for this repository or project, and the ecosystems the manifests and lockfiles read in Step 2 declare. A control the tier withholds is not a failing rule, and a control for an ecosystem the project does not ship is not a gap. Name both out loud rather than dropping them, so the reader can tell a control that does not reach this repository from one the sweep never considered.

For each control in that set, establish whether the forge exposes an API for it. Where it does, write the value and then read it back with a separate call. A write that returns success is not evidence: GitHub's repository `PATCH` answers 200 and silently discards a field the repository has no entitlement for, so a control can appear set and still be off. Where the forge exposes no API, which is true of several switches on the same settings page, resolve the settings URL for this repository and present it the way Step 6 does, then read back whatever the API can read and say plainly which part of the claim rests on the user's confirmation rather than on a reading.

A read can also fail to answer. On GitHub the `security_and_analysis` object is absent rather than `disabled` for a caller without admin, so a missing value means unknown, and reporting it as off would be wrong. Say which of the two readings you got.

For R-SEC-11, switching the forge's alerting on does not finish the check. Compare the package set the forge reports watching against what the project actually resolves: a forge that cannot parse the project's lockfile still parses its manifests, so the security overview looks the same whether it covers ten packages or five hundred. Where the two sets differ, that residual is the finding, and the fix is a scanner that reads the lockfile the forge cannot. Scope what blocks a merge to what the change introduces, and let the repository-wide scan report instead. An advisory published overnight against a dependency with no fix available is not something a contributor can act on, and a check that fails for that reason teaches the maintainer to dismiss alerts.

### Step 13: Read OpenSSF Scorecard results

Use Scorecard as supplementary evidence after the direct checks above, never as a substitute for them. A missing or stale result is normal and must not change a directly verified rule status. Do not offer to install or run another scanner unless the user asks for that expansion.

The Scorecard section of the reference file Step 1 chose carries the rest: `references/github.md` for what the API returns, which checks map to which rule, and how `Branch-Protection` scores a repository that R-SEC-12 does not reach; `references/gitlab.md` for what the public dataset covers on that forge.

### Step 14: Present the result

Before presenting, read each R-SEC rule's `Check:` line in `STANDARD.md` against the repository and its settings as they now stand, and fix what fails. Start the list again after each fix, since one setting can move another rule's evidence, and do not report done while any cited rule still fails.

Give every rule one of four statuses, and use no others: fixed, pending confirmation, outside the repository, or unknown. Fixed means the file is written or the setting is read back. Pending confirmation means the settings block is presented and the user has not confirmed it. Outside the repository means the rule's own precondition does not reach this repository, such as a forge it does not apply to or a tier the project does not have. Unknown means the read could not answer, which Step 2 says a 404 can produce, and it is neither a pass nor a fail.

Show what Steps 2 through 13 found and fixed, grouped by rule ID: which files this skill edited directly, which settings still need the user's confirmation with the resolved URL for each, and the supply-chain observation from Step 3 if one applies. Where a Scorecard result was read in Step 13, include its dated findings as supplementary evidence alongside this skill's direct findings. Do not mark a rule fixed until the file is written or the setting is confirmed and verified; a settings block the user has not yet confirmed stays listed as pending.

Then close with what the maintainer could still turn on that this skill could not reach itself. Give each item what it does, why the skill could not set it, and what enabling it would take. Three kinds belong here: a control the forge exposes no API for, which only a click reaches; a control the forge's tier withholds, named with the tier it needs; and a control that strengthens the repository beyond what any rule in `STANDARD.md` requires. Keep this list separate from the rule findings and label it as optional. A maintainer reading an unmet rule and an available extra in one list cannot tell which of the two the standard actually asks for, and the one that reads as less urgent is the one that gets skipped.
