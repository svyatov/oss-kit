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

The response's `allow_force_push` and `code_owner_approval_required` booleans, and the `push_access_levels` and `merge_access_levels` arrays, are the evidence R-SEC-04 checks for. Read the job token scope the same way, per R-SEC-06:

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

`include:project` should pin `ref:` to a full 40-character commit SHA rather than a branch name or a mutable tag:

```yaml
include:
  - project: 'group/project'
    ref: 787123b47f14b552955ca2786bc9542ae66fee5b
    file: '/templates/ci-template.yml'
```

A protected tag is an acceptable `ref:` where the included project's maintainers guarantee it is immutable in practice; a SHA needs no such guarantee.

`include:remote` should carry an `integrity:` hash so a change to the remote content, not just a change to the URL, fails the pipeline instead of silently running different configuration:

```yaml
include:
  - remote: 'https://example.com/ci/template.yml'
    integrity: 'sha256-<base64-encoded-hash>'
```

## Job token scope (R-SEC-06)

GitLab's job token access is project-only by default: a job's `CI_JOB_TOKEN` can only authenticate against the project the pipeline runs in unless the inbound allowlist explicitly names another project. Where `inbound_enabled` from the read above is `false`, the scope is already open to every project that trusts the token, which is broader than the default and worth narrowing; where it is `true`, confirm the allowlist names only the projects this pipeline actually calls into, at Settings > CI/CD > Job token permissions for the project, or with:

```bash
curl --request POST \
  --header "PRIVATE-TOKEN: <token>" \
  --header "Content-Type: application/json" \
  --data '{ "target_project_id": <id> }' \
  "https://gitlab.example.com/api/v4/projects/:id/job_token_scope/allowlist"
```

## Automated dependency updates (R-SEC-03)

GitLab's own Dependency Scanning finds known-vulnerable dependencies already in use; it does not open update merge requests the way Dependabot or Renovate do, and it is gated to GitLab Ultimate, so a project on Free or Premium gets nothing from it here even where it is enabled. The practical equivalent of Dependabot's update pull requests on GitLab is Renovate, run as a scheduled pipeline job rather than as a hosted app, since GitLab ships no hosted update bot of its own:

```yaml
renovate:
  stage: .post
  image: renovate/renovate:latest
  script:
    - renovate
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

Renovate needs a project or group access token with the `api` scope (`read_api` is enough for a dry run) stored as a masked CI/CD variable, and `platform=gitlab` set in its own configuration file. Configure the pipeline schedule that triggers this job at Settings > CI/CD > Pipeline schedules. Renovate's own `regexManagers` and its built-in `gitlabci` and `dockerfile` managers can update the pinned digests and SHAs from the section above the same way its `github-actions` manager updates a GitHub workflow; enable the ecosystems the project actually uses rather than every manager by default.

## Branch protection and required review (R-SEC-04)

Give the user the resolved URL: `https://gitlab.com/{namespace}/{project}/-/settings/repository` (swap the host for a self-managed instance) for protected branches, and `https://gitlab.com/{namespace}/{project}/-/settings/merge_requests` for approval rules and merge checks.

Protected branches, including blocking force pushes and restricting who can push or merge, are available on every GitLab tier. Enforced merge request approval rules, the setting that actually blocks a merge until a named number of people approve, need GitLab Premium or Ultimate; on Free, any Developer can approve a merge request but nothing stops a merge with zero approvals. Where the project is on Free, say plainly that required review is not available at the platform level, and give the strongest available substitute: restrict who can push directly to the protected branch to a small group under "Allowed to push and merge," so a merge request is the only path in even without an enforced approval count. Take this fallback only because GitLab Free leaves no other option for R-SEC-04, and revisit it if the project upgrades tier.

Also on Free, GitLab does not read CODEOWNERS for merge request approval at all; both reading the file and enforcing it need Premium or Ultimate. On a tier that supports it, turn on "Require approval from code owners" in the same merge request approvals panel, enforcing the file `oss-community` wrote.

"Pipelines must succeed," the setting that blocks a merge while the pipeline is failing, is available on every tier, at Settings > Merge requests > Merge checks; turn it on regardless of what the approval rule situation allows.

After the user confirms each setting, verify with the protected branches read from Step 2 above, checking `allow_force_push` is `false` and `merge_access_levels` restricts direct push where enforced approvals are not available.

Push rules, the project-level settings that reject unsigned commits, enforce a commit message or branch name pattern, or block secret filenames, are a separate, Premium-or-Ultimate-only control at Settings > Repository > Push rules; they are not required by any R-SEC rule here, so mention them as an available option on a project with that tier rather than a gap on a project without it.

## Signed tags (R-SEC-05)

Identical to GitHub, because the evidence is git's own, not the forge's: import the maintainer's public signing key, then run `git fetch --tags`, `git tag -v {tag}`, and `git cat-file -t {tag}`, expecting `git cat-file` to print `tag`. GitLab has no equivalent of `github.com/{user}.gpg` for fetching a key without authentication; get the maintainer's public key from wherever they publish it, such as a keyserver or their GitLab profile's GPG keys page if they have added one there.

## Read OpenSSF Scorecard results (Step 9)

The same public API also covers GitLab.com projects, at the same host, with `gitlab.com` in place of `github.com`:

```bash
curl -s https://api.scorecard.dev/projects/gitlab.com/{namespace}/{project}
```

Coverage of GitLab.com projects by the weekly scan is much thinner than GitHub's; a result that does exist may be from a single one-off scan rather than a recent weekly run, so check the response's `date` field before treating a score as current. A self-managed GitLab instance is not covered by this API at all, and a project with no result returns `404` with an empty body, the same as on GitHub; treat both as reasons to say no data exists yet rather than to guess at a score. Scorecard's CLI can be run directly against a GitLab project by a maintainer who wants a current, one-off result without waiting for or configuring the weekly scan.
