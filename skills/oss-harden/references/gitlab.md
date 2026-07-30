# GitLab reference

Concrete commands and settings for the decisions `SKILL.md` makes, on GitLab CI/CD and project settings. Every path below was checked against current GitLab documentation, and several against a live API response. Several of GitHub's controls have no GitLab equivalent, and the reverse is also true; do not translate a GitHub setting name or API path here by analogy.

## Read the current state (Step 2)

List every `image:`, `services:`, and `include:` entry across `.gitlab-ci.yml` and any file it includes, and whether each already names a digest or a full commit SHA, with `grep -nE 'image:|services:|include:|ref:' .gitlab-ci.yml`.

Check for an existing updater the same way as on GitHub: a Renovate configuration (`renovate.json`, `.gitlab/renovate.json`, or a scheduled pipeline job that already runs Renovate) or a GitLab Dependency Scanning template already included.

Read the live protected branch settings for the default branch:

```bash
curl --header "PRIVATE-TOKEN: <token>" \
  "https://gitlab.example.com/api/v4/projects/:id/protected_branches/:name"
```

The response's `allow_force_push` boolean and its `push_access_levels` and `merge_access_levels` arrays are part of the evidence R-SEC-04 checks for. `code_owner_approval_required` is review evidence and belongs to R-SEC-12 instead.

The protected-branch response does not report required approval rules or the "Pipelines must succeed" merge check. On Premium or Ultimate, read approval rules separately, and on every tier read the project setting:

```bash
curl --header "PRIVATE-TOKEN: <token>" \
  "https://gitlab.example.com/api/v4/projects/:id/approval_rules"
curl --header "PRIVATE-TOKEN: <token>" \
  "https://gitlab.example.com/api/v4/projects/:id"
```

Require at least one applicable rule with `approvals_required` of 1 or more on paid tiers, and require `only_allow_merge_if_pipeline_succeeds` to be `true`.

Read the inbound job-token scope and allowlist separately, per R-SEC-06:

```bash
curl --header "PRIVATE-TOKEN: <token>" \
  "https://gitlab.example.com/api/v4/projects/:id/job_token_scope"
curl --header "PRIVATE-TOKEN: <token>" \
  "https://gitlab.example.com/api/v4/projects/:id/job_token_scope/allowlist"
```

`inbound_enabled` on the first call reports whether the allowlist is active at all; the second lists which projects it names. `gitlab.example.com` in each example stands for `gitlab.com` for a project hosted there, or the project's self-managed host otherwise; resolve it from the git remote rather than assuming `gitlab.com`.

## No marketplace-action analogue; pin images and includes instead (R-SEC-06)

GitLab CI/CD has nothing shaped like a GitHub Actions `uses:` line pulling in a versioned third-party unit of code by default; a `.gitlab-ci.yml` calls project commands in `script:`, and the closest thing to a reusable, externally maintained unit is a CI/CD component consumed through `include:component`, general availability since GitLab 17.0. The pin problem R-SEC-01 solves on GitHub arrives on GitLab through three different keywords instead, and R-SEC-06 covers all three:

`image:` and `services:` should name a digest, not a floating tag, since a tag such as `node:22` or `postgres:16` can point at a different image tomorrow with no diff in this repository:

```yaml
image: node@sha256:1a2b3c4d5e6f...
services:
  - postgres@sha256:6f5e4d3c2b1a...
```

`include:project` should pin `ref:` to a full 40-character commit SHA rather than a branch name or tag:

```yaml
include:
  - project: 'group/project'
    ref: 787123b47f14b552955ca2786bc9542ae66fee5b
    file: '/templates/ci-template.yml'
```

`include:component` should also use a full commit SHA after the `@`. GitLab ranks a commit SHA as the highest-priority component version and recommends it for third-party components when integrity matters. Avoid `~latest`, partial versions, branches, and tags for an immutable pipeline.

`include:remote` should carry an `integrity:` hash so a change to the remote content, not just a change to the URL, fails the pipeline instead of silently running different configuration:

```yaml
include:
  - remote: 'https://example.com/ci/template.yml'
    integrity: 'sha256-<base64-encoded-hash>'
```

Resolve the version the file already selects unless the user separately authorizes an upgrade. For `include:component` and `include:project`, compare the selected release line with the source project's releases through `GET /projects/:id/releases`. For `image:` and `services:`, resolve the selected tag to the registry's manifest digest with a registry client the project already trusts. Report newer compatible and major releases separately, but do not hide an upgrade inside a pinning change.

## Inbound job token scope (R-SEC-06)

The job-token allowlist belongs to the target project. It names source projects whose job tokens may access this project. It does not list targets that this project's own jobs may call. Where `inbound_enabled` from the read above is `false`, jobs from any project may authenticate to this project when the user who triggered them has sufficient access. Enable the allowlist and confirm it names only source projects that need inbound access, at Settings > CI/CD > Job token permissions. When the project uses GitLab 18.3 or later, use fine-grained permissions for each entry so its token can call only the required API endpoint groups.

In this API call, the project in the URL is the target being protected and `target_project_id` is the source project being allowed:

```bash
curl --request POST \
  --header "PRIVATE-TOKEN: <token>" \
  --header "Content-Type: application/json" \
  --data '{ "target_project_id": <id> }' \
  "https://gitlab.example.com/api/v4/projects/:id/job_token_scope/allowlist"
```

## Automated dependency updates (R-SEC-03)

GitLab Dependency Scanning finds known-vulnerable dependencies already in use; it does not open update merge requests, and its dependency list is gated to Ultimate. GitLab ships no hosted update bot. Renovate's official self-hosting documentation recommends its `renovate-runner` GitLab project and scheduled-pipeline templates, so follow that project's current setup instead of inventing a one-job `latest` image example here. For GitLab Self-Managed, Renovate recommends cloning or importing that runner project to the instance.

Before adopting Renovate, review its documented trust model: a self-hosted Renovate instance must trust developers of the repositories it monitors and needs credentials for GitLab plus GitHub.com access for changelogs and tools. Store credentials as masked and hidden CI/CD variables, protect them where the schedule runs only on protected refs, and use the narrowest token and repository scope the documented runner supports. Enable only the managers the repository needs. Renovate's `gitlabci` manager covers images, services, and components; verify any additional manager against its current official documentation.

## Branch protection and required review (R-SEC-04, R-SEC-12)

Give the user the resolved URL: `https://gitlab.com/{namespace}/{project}/-/settings/repository` (swap the host for a self-managed instance) for protected branches, and `https://gitlab.com/{namespace}/{project}/-/settings/merge_requests` for approval rules and merge checks.

Protected branches, including blocking force pushes and restricting who can push directly, are available on every GitLab tier. Restricting "Allowed to push and merge" to a small group is what makes a merge request the only path onto the branch, which is what R-SEC-04 asks for, and it needs no paid tier.

Enforced merge request approval rules, the setting that actually blocks a merge until a named number of people approve, need GitLab Premium or Ultimate; on Free, any Developer can approve a merge request but nothing stops a merge with zero approvals. This reaches only a project R-SEC-12 applies to, meaning one with two or more members at Developer or above. Where such a project is on Free, say plainly that required review is not available at the platform level, and record the rule as unmet by the tier rather than by the maintainer; the protected-branch restriction above is already in place for R-SEC-04 and is the strongest control the tier has. Revisit it if the project upgrades tier. A project with a single member needs no fallback here, because the rule does not reach it.

Also on Free, GitLab does not read CODEOWNERS for merge request approval at all; both reading the file and enforcing it need Premium or Ultimate. On a tier that supports it, and on a project R-SEC-12 reaches, turn on "Require approval from code owners" in the same merge request approvals panel, enforcing the file `oss-community` wrote.

"Pipelines must succeed," the setting that blocks a merge while the pipeline is failing, is available on every tier, at Settings > Merge requests > Merge checks; turn it on regardless of what the approval rule situation allows.

After the user confirms each setting, repeat all three reads from Step 2. Check `allow_force_push` is `false`, direct push is explicitly `No one`, `only_allow_merge_if_pipeline_succeeds` is `true`, and, on Premium or Ultimate, an applicable approval rule requires at least one approval.

Push rules, the project-level settings that reject unsigned commits, enforce a commit message or branch name pattern, or block secret filenames, are a separate, Premium-or-Ultimate-only control at Settings > Repository > Push rules; they are not required by any R-SEC rule here, so mention them as an available option on a project with that tier rather than a gap on a project without it.

## Signed tags (R-SEC-05)

The evidence is git's own, not the forge's. Establish whether the tag uses OpenPGP, SSH, or X.509, get the maintainer's key or certificate through a maintainer-controlled channel, and configure Git for that format. SSH verification requires `gpg.format=ssh` and `gpg.ssh.allowedSignersFile`; X.509 uses `gpg.format=x509`. Then run `git fetch --tags`, `git tag -v {tag}`, and `git cat-file -t {tag}`, expecting verification to succeed and the object type to be `tag`.

## Untrusted input and variables (R-SEC-07)

GitLab expands a `script:` entry in the execution shell. User-controlled values such as commit messages, branch names, and merge request titles are data only when the shell expansion is quoted and the command does not pass them to `eval`, `sh -c`, or another interpreter. Prefer an argument:

```yaml
script:
  - ./scripts/check-title "$CI_MERGE_REQUEST_TITLE"
```

Do not splice the value into generated shell text. UI-defined variables have reference expansion disabled by default since GitLab 18.6; keep it disabled for secrets. Store secrets as masked and hidden variables, and mark them protected when jobs on unprotected refs do not need them. Remember that a merge request pipeline run in the parent project for a fork can receive parent-project variables, so do not run untrusted fork code in a privileged parent pipeline.

## Static analysis (R-SEC-09)

GitLab SAST's basic open-source analyzers are available on Free, Premium, and Ultimate, while Advanced SAST and merge request findings UI require Ultimate. Add the stable built-in template only for a supported language and enable merge request pipelines explicitly:

```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml

variables:
  AST_ENABLE_MR_PIPELINES: "true"
```

The built-in template belongs to the GitLab instance version, so it is not an external `include:` that R-SEC-06 can pin. Do not use the documented component example at `@main`; if a project chooses the component instead, resolve it to a full commit SHA. Confirm the merge request pipeline contains the SAST job and that "Pipelines must succeed" blocks a merge when the job fails.

## Detection controls (R-SEC-10, R-SEC-11)

Neither rule maps onto a GitHub command here. GitLab splits both outcomes across a paid control and a pipeline job, so establish the project's tier before proposing anything, and reach the outcome through the job where the tier withholds the control.

### Secret detection (R-SEC-10)

Secret push protection is Ultimate. It reads and writes through the project security settings:

```bash
curl --header "PRIVATE-TOKEN: $TOKEN" \
  "https://gitlab.example.com/api/v4/projects/:id/security_settings"
curl --request PUT --header "PRIVATE-TOKEN: $TOKEN" \
  --data "secret_push_protection_enabled=true" \
  "https://gitlab.example.com/api/v4/projects/:id/security_settings"
```

The `GET` returns `secret_push_protection_enabled` alongside the auto-fix and continuous-scanning fields, so it is both the write path and the read-back. The field was named `pre_receive_secret_detection_enabled` before GitLab 17.11; a project on an older self-managed instance answers under the old name. Setting it for a whole group is `PUT /groups/:id/security_settings` with the same parameter, and GitLab documents no `GET` there, so read the group's projects back one at a time rather than assuming the group write took.

Pipeline secret detection is available on Free, Premium, and Ultimate, and is the path for a project the Ultimate control is out of reach for. It is one include:

```yaml
include:
  - template: Jobs/Secret-Detection.gitlab-ci.yml
```

Two things about its coverage need saying to the maintainer rather than discovering later. It scans the current state of the repository and everything committed after it, so a secret already in history is not found by turning it on; a historic scan is a separate run and is slow on a large repository. And it detects rather than blocks: the pipeline reports the finding after the push has landed, which is weaker than push protection and is why R-SEC-10 names the Ultimate control first.

Where push protection is on and blocks a legitimate push, GitLab documents two skips: `git push -o secret_push_protection.skip_all`, or `[skip secret push protection]` in a commit message. Both are audit-logged. Give the maintainer the skip rather than watching them turn the control off.

### Dependency vulnerabilities (R-SEC-11)

Dependency Scanning is Ultimate, and so is the dependency list that would show what it covers. A Free project has no platform control here at all, which means the rule is met by a job rather than by a setting, and the sweep should say that plainly instead of reporting a gap the tier makes unfixable.

For that job, use a scanner that reads the project's committed lockfiles against a public advisory database and fails on what the merge request introduces, while a scheduled pipeline runs the repository-wide scan that only reports. GitLab has no dependency graph of its own on Free, so there is no coverage comparison to run the way there is on GitHub; the scanner's own lockfile support is the coverage, and it should be checked against every lockfile the project commits.

Where the project already runs Renovate for R-SEC-03, its `osvVulnerabilityAlerts` option checks dependencies against the OSV database and defaults to `true`, so that half may already be in place. It raises update merge requests rather than gating one, so it does not on its own satisfy the requirement that a vulnerability the change introduces blocks its merge.

## Read OpenSSF Scorecard results (Step 13)

OpenSSF's current weekly public dataset derives its project list from GitHub only, and its GitHub Action is the documented path for publishing repository-owned results to the REST API. Do not claim a GitLab project has current public API coverage without a successful dated response. If a result exists, report its date and use it only as supplementary evidence. If it does not, report no public result. Running the CLI is a separate task that requires installation and authentication, so do not add or run it unless the user asks.
