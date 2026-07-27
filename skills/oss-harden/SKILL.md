---
name: oss-harden
description: "Harden the security posture of an open source repository: pin CI actions to full commit SHAs, restrict workflow permissions, keep untrusted input out of shell commands, enable automated dependency updates, lock dependency resolution, run static analysis on pull requests, configure branch protection, enforce code owner review, and sign tags. Use when the user asks to harden a repo, improve supply chain security, fix an OpenSSF Scorecard finding, pin actions, fix a workflow script injection, or lock down CI. Covers GitHub and GitLab. Publishing belongs to oss-publish."
license: MIT
---

# Harden the security posture of an open source repository

This skill audits and repairs rather than generating from scratch. Every workflow, pipeline, or setting it touches already exists; the job is to read what is there before changing anything, then close the gap between that and the SEC rules below. Read every existing workflow or pipeline file, the existing dependency update configuration, and the current branch or protected-branch settings before proposing a single edit. Do not write a fresh workflow from a template; edit the one the project already has.

The concrete syntax for reading and fixing each control differs by forge, so it lives in one reference file per forge: [references/github.md](references/github.md) for GitHub Actions and repository settings, and [references/gitlab.md](references/gitlab.md) for GitLab CI/CD and project settings. Read the matching file before writing any configuration or giving any settings instruction; do not carry a command, an API path, or a YAML key from one forge to the other by analogy, because GitLab has no direct equivalent for several GitHub controls and the reverse is also true.

## Scope

This skill owns the security posture of the workflow and pipeline files two other skills also write into, and the boundary is the rule area, not a description of files. `oss-ci` decides what runs and when. `oss-publish` writes the publish job. Treat every mutable external reference and every overly broad or implicit token permission in those files as work for this skill. `oss-community` writes CODEOWNERS but does not enforce it; enforcing code owner review is a branch or merge request protection setting, which belongs here. Do not decide what a job runs, add a product feature, or choose a registry authentication flow while working from this skill; note that the project needs it and hand the work to `oss-ci` or `oss-publish`.

## Principles

Verify every command, API path, and setting name against the current documentation for the platform in question before writing it down or telling the user to click it; a wrong path either does nothing or breaks the workflow. Where a control depends on the forge's plan tier, such as required merge request approvals on GitLab, say which tier it needs rather than assuming the free tier has it, and give the strongest control the project's actual tier supports.

Half of what this skill fixes is repository files, which it edits directly. The other half is settings on the forge that only a repository owner or maintainer can change: branch protection, merge request approval rules, the job token allowlist, the actions permissions policy. For that half, resolve the real owner, repository, and branch name from the repository's own data (the git remote, the manifest's repository field) and give the user a direct settings URL built from those, never a placeholder like "go to your repository settings." Present one settings block, wait for the user to confirm it is done, then verify what can be verified from the command line before moving to the next block, the same pattern `oss-publish` uses for trusted publisher setup.

## Process

### Step 1: Detect the forge

Look for `.github/workflows/` or `.gitlab-ci.yml`, check the git remote for a github.com or gitlab host, or ask directly if neither signal is present. If the user states the forge explicitly, trust that over any signal found in the repository. This decides which reference file governs the rest of this process.

### Step 2: Read the current state

Before changing anything, read what already exists, using the commands the matching reference file names for each of the following:

Every workflow or pipeline file, so the `uses:` lines, `image:` and `include:` entries, and `permissions:` blocks that need fixing are known before any edit is proposed.

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

Pinning freezes a reference until something unfreezes it; R-SEC-03 requires an updater covering both the project's application dependencies and its CI dependencies, on both forges. On GitHub, Dependabot's `github-actions` ecosystem is what proposes the SHA and comment update for every workflow this skill just pinned, so a `dependabot.yml` this skill writes or edits needs that ecosystem alongside whatever ecosystem the project's package manager uses; a `dependabot.yml` that updates the package manager but leaves out `github-actions` re-freezes the actions the moment they are pinned. On GitLab, there is no equivalent of Dependabot shipped by the platform; the reference file names the documented alternative and what running it costs. Where a Renovate configuration already exists on either forge, extend its `packageRules` or presets rather than adding a competing Dependabot config; ask before replacing one updater with the other.

### Step 6: Branch protection and required review

R-SEC-04 requires the default branch to require at least one approving review, require the CI status check to pass, and reject force pushes and deletion, on both forges. This is a forge setting, not a file, so give the user the resolved settings URL for the repository or project found in Step 1, wait for confirmation, then verify with the read command from Step 2. Where `oss-community` has already written a CODEOWNERS file, this is also where code owner review gets enforced, by turning on the code-owner-approval setting alongside the review requirement; a CODEOWNERS file with nothing enforcing it is a suggestion, not a control. Where the platform's free tier does not offer enforced review, as GitLab's does not, say so plainly and give the strongest control the tier actually has; take that fallback only because the tier leaves no other option, the same spirit `STANDARD.md` states for the fallbacks it marks below the bar, and do not claim a paid capability is active on a free plan.

### Step 7: GitLab job token scope

R-SEC-06 also covers which other projects' job tokens may access this GitLab project. The allowlist is an inbound control on the target project, not a list of projects this pipeline's token may call. Read the current inbound scope and allowlist with the commands in `references/gitlab.md`; where the scope is open, enable it and retain only source projects that need access. Where fine-grained job-token permissions are enabled, grant each allowlisted source only the endpoints it needs.

### Step 8: Signed tags

R-SEC-05 applies the same way on both forges, because the evidence comes from git itself, not from a forge API. After fetching tags, configure the verifier for the tag's actual signature format and a maintainer-controlled trust source, then run `git tag -v <tag>` on the newest release tag. Also run `git cat-file -t <tag>` and require `tag`, confirming it is annotated rather than lightweight. Support OpenPGP, SSH, and X.509 signatures instead of assuming every maintainer uses GPG. Neither forge's UI verification badge replaces local cryptographic verification against the maintainer's trusted key. A repository with no release tag yet has nothing to check; say that rather than reporting a gap, and revisit at the first release.

### Step 9: Keep untrusted input out of privileged contexts

R-SEC-07 applies to both forges through different mechanisms, so read the matching reference file rather than carrying the syntax across. On GitHub the risk is textual: a `${{ }}` expression is substituted into the script before any shell sees it, so `${{ github.event.issue.title }}` inside a `run:` block executes whatever its author wrote. Move user-controlled values into an `env:` block and quote the environment variable in the shell. Separately, a `pull_request_target` or `workflow_run` workflow runs with the base repository's privileges, so it must not execute or check out contributor-controlled code; where one does, that is the highest-severity finding this skill produces and it belongs at the top of the summary. On GitLab, quote every user-controlled predefined variable in `script:` and pass values as arguments rather than evaluating generated shell. Store secrets as masked and hidden variables, protect them when only protected refs need them, and keep variable-reference expansion disabled.

### Step 10: Lockfile and frozen installs

R-SEC-08 requires the package manager's lockfile to be committed and CI to install from it in a mode that fails rather than re-resolves. Read the project's manifest to learn which package manager it uses, confirm the lockfile is committed rather than gitignored, and verify the current frozen-install command in that package manager's official documentation before changing CI. Examples include `npm ci`, `uv sync --locked`, `cargo build --locked`, Bundler with local `deployment` and `frozen` configuration, and `pip install --require-hashes` only when every requirement, including transitive dependencies, carries a hash. Where the project pins versions in a manifest but commits no lockfile, say that a version pin still trusts the registry to serve the same bytes while a recorded hash does not. A repository with no registry dependencies has nothing to lock; report that rather than a gap.

### Step 11: Static analysis on pull requests

R-SEC-09 applies only where the repository holds source in a language a static analyzer supports, so establish that first and say plainly that the rule does not reach the repository when it does not, rather than reporting a violation. Where it does apply, check that an analysis workflow runs on pull requests to the default branch and that its result is a required check, since an analyzer whose failure does not block merge is advisory. On GitHub, prefer CodeQL default setup, which is a repository setting rather than a workflow file the project has to maintain, and give the resolved settings URL the same way Step 6 does; the reference file names the endpoint that reports whether it is already enabled.

### Step 12: Read OpenSSF Scorecard results

Use Scorecard as supplementary evidence after the direct checks above, never as a substitute for them. Query the public API for an existing result and report its date, Scorecard version, per-check reason, and details. The weekly public dataset currently derives its project list from GitHub only and omits some API-expensive checks, while repository-published results depend on a configured Scorecard GitHub Action. A missing or stale result is normal and must not change a directly verified rule status. Map `Pinned-Dependencies`, `Token-Permissions`, `Dependency-Update-Tool`, and `Branch-Protection` only where their evidence matches the rule, and never map `Signed-Releases` to signed git tags because that check examines release artifacts. Do not offer to install or run another scanner unless the user asks for that expansion.

### Step 13: Present the result

Show what Steps 2 through 12 found and fixed, grouped by rule ID: which files this skill edited directly, which settings still need the user's confirmation with the resolved URL for each, and the supply-chain observation from Step 3 if one applies. Where a Scorecard result was read in Step 12, include its dated findings as supplementary evidence alongside this skill's direct findings. Do not mark a rule fixed until the file is written or the setting is confirmed and verified; a settings block the user has not yet confirmed stays listed as pending.

## Rules this skill owns

R-SEC-01: Pin every external action and reusable workflow to a full commit SHA

R-SEC-02: Workflows declare least-privilege permissions

R-SEC-03: Automated dependency updates cover both application dependencies and CI dependencies

R-SEC-04: The default branch requires review and passing checks before merge, and rejects force pushes

R-SEC-05: Release tags are signed and verifiable

R-SEC-06: A GitLab pipeline pins external execution inputs and restricts inbound job-token access

R-SEC-07: Untrusted input never reaches a privileged context

R-SEC-08: Registry dependencies resolve through a committed lockfile

R-SEC-09: Static analysis runs on pull requests where the language supports it
