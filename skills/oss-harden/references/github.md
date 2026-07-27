# GitHub reference

Concrete commands and settings for the decisions `SKILL.md` makes, on GitHub Actions and repository settings. Every path below was checked against current GitHub documentation and, where noted, against a live API response.

## Read the current state (Step 2)

List every `uses:` line in both `.yml` and `.yaml` workflow files. A line matching an external `owner/repo@` or `owner/repo/path@` reference followed by a 40-character SHA is pinned; anything else, including `@main`, `@v4`, or a shorter SHA, is not. A local `uses: ./path` reference comes from the same repository commit and needs no external pin.

Check for an existing updater with `test -f .github/dependabot.yml` or a search for a Renovate configuration (`renovate.json`, `.github/renovate.json`, or a `"renovate"` key in `package.json`).

Read the live branch protection for the default branch:

```bash
gh api repos/{owner}/{repo}/branches/{branch}/protection
```

This 404s both when the branch has no classic protection and when the repository or branch name is wrong, so confirm the repository exists first with `gh api repos/{owner}/{repo}` if the protection call 404s unexpectedly. A repository using the newer rulesets instead of classic branch protection needs a second call, since a ruleset does not show up in the classic endpoint:

```bash
gh api repos/{owner}/{repo}/rulesets
```

GitHub's own guidance is to prefer rulesets for a repository being configured today; classic branch protection still works and both this skill and the OpenSSF Scorecard action can read either, but there is no need to set up the classic form on a repository that has neither yet.

## Pin external actions and reusable workflows to a commit SHA (R-SEC-01)

Resolve the version the workflow already selects. Do not silently turn pinning into a major-version upgrade. Read the newest release in the selected release line and the newest release overall so the report can distinguish a compatible update from a potential breaking upgrade:

```bash
gh api repos/{owner}/{repo}/releases/latest --jq '.tag_name'
```

This endpoint returns the newest non-draft, non-prerelease release overall. It does not identify the newest compatible backport for a workflow that deliberately stays on an older major. Inspect the release list or immutable version tags for that comparison. A project that tags releases without cutting GitHub Releases returns 404 here; inspect its immutable release tags instead of assuming a moving major tag is a release.

Where the current major is ahead of the one the workflow uses, say so and name both versions rather than pinning the old major to a SHA silently. The upgrade is the user's call, since a major bump can change the action's inputs, but a pin recorded without that observation buries the staleness under a line that now looks deliberate and audited.

Resolve the chosen tag to the commit it points at with `gh api`:

```bash
gh api repos/{owner}/{repo}/git/refs/tags/{tag} --jq '.object.sha'
```

A lightweight tag's `object.sha` is already the commit SHA. An annotated tag's `object.sha` is the SHA of the tag object, not the commit, and using it directly pins to the wrong thing. When `.object.type` in the same response is `tag` rather than `commit`, make a second call against the tag object to get the commit it points at:

```bash
gh api repos/{owner}/{repo}/git/tags/{tag-object-sha} --jq '.object.sha'
```

The `^{}` peeled-ref suffix does not work here. It is git wire-protocol syntax, not a REST path segment, so `git/refs/tags/{tag}^{}` returns 404.

Where the action's repository is not the one being audited, `git ls-remote` avoids a second `gh` context: `git ls-remote https://github.com/{owner}/{repo} refs/tags/{tag}` prints the commit SHA directly for a lightweight tag, or the tag object's SHA for an annotated one; append `refs/tags/{tag}^{}` to the same command to get the dereferenced commit SHA for an annotated tag in one call.

Write the result as `uses: owner/repo@<40-char-sha>  # tag`, keeping the tag in a trailing comment. This is not decoration: Dependabot's `github-actions` ecosystem (Step 5 below) reads that comment and updates both the SHA and the comment together when a new release ships, so a pin with no comment loses its human-readable version and a pin with the comment in the wrong place is not recognized as an update target.

Pin every external action and reusable workflow this way, including actions under `actions/` and `github/`. Leave local actions such as `uses: ./path` unchanged because they already come from the checked-out commit. For a reusable workflow in the same repository written as `uses: ./.github/workflows/file.yml`, the caller and called workflow also share a commit.

GitHub also offers an organization or repository level Actions permissions setting that requires every action used to already be pinned to a full commit SHA before the workflow is allowed to run at all, turning this rule into a platform-enforced gate rather than a convention. Where the user wants that enforced, point them at Settings > Actions > General for the repository, or the organization-level equivalent, rather than relying on this skill's edits alone to keep it true over time.

## Set least-privilege permissions (R-SEC-02)

With no `permissions:` key at all, a workflow triggered from within the repository (not a fork pull request) gets the repository's default `GITHUB_TOKEN` permissions, which for a repository or organization created since the platform-wide default changed is read-only across the board; an older repository or one in an organization that has not adopted the new default can still get broad, in places write, permissions with no `permissions:` key present. Do not rely on assuming the safe default already applies; write the block down so the workflow's behavior does not depend on an account-level setting the workflow file itself cannot show.

```yaml
permissions:
  contents: read
```

Place that at the top level of the workflow. A job needing more, such as the OpenSSF Scorecard action's own workflow needing `security-events: write` to upload SARIF, declares the extra scope at the job level instead of widening the top-level block:

```yaml
jobs:
  scan:
    permissions:
      contents: read
      security-events: write
```

Every permission not named in a `permissions:` block is set to `none`, not left at whatever the default would have been; a block naming only `contents: read` also implicitly drops every other scope, which is the intended effect.

## Automated dependency updates (R-SEC-03)

`dependabot.yml` version 2 needs one `updates` entry per ecosystem, each with `package-ecosystem`, `directory`, and `schedule.interval`:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
```

`github-actions` scans every `.github/workflows/*.yml` file regardless of the `directory` value, so `directory: "/"` is correct even for a monorepo with workflows only at the root. `schedule.interval` accepts `daily`, `weekly`, `monthly`, `quarterly`, `semiannually`, or `yearly`, or a `cron` schedule for finer control; `daily` runs on weekdays only. Add one `package-ecosystem` entry per manifest ecosystem the project actually uses; do not add an ecosystem the repository has no manifest for.

A workflow step that installs a tool with `pip install <package>` with no version pin, or `uv tool install git+<url>` with no ref, is not covered by the `github-actions` ecosystem above; Dependabot updates what a `uses:` line or a manifest names, not an arbitrary shell command. Pinning and updating that kind of install is the supply-chain observation `SKILL.md` Step 3 describes; note it in the summary rather than assuming `github-actions` coverage extends to it.

## Branch protection and rulesets (R-SEC-04)

Give the user the resolved URL for the default branch's protection settings: `https://github.com/{owner}/{repo}/settings/branches`. The settings needed are: require a pull request before merging with at least one approving review, require the status check this repository's CI job reports, and, in the same panel, block force pushes and branch deletion. Where CODEOWNERS exists, the same panel has "Require review from Code Owners"; turn it on alongside the approval requirement so the file `oss-community` wrote is actually enforced.

After the user confirms, verify with the same read used in Step 2:

```bash
gh api repos/{owner}/{repo}/branches/{branch}/protection
```

Confirm `required_pull_request_reviews.required_approving_review_count` is at least 1, `required_status_checks.contexts` (or `checks`) names the CI job, `allow_force_pushes.enabled` is `false`, and `allow_deletions.enabled` is `false`. A repository configured through rulesets instead reports through `gh api repos/{owner}/{repo}/rulesets/{ruleset_id}` instead, with the same intent expressed as a `pull_request` rule, a `required_status_checks` rule, a `non_fast_forward` rule, and a `deletion` rule.

## Signed tags (R-SEC-05)

First identify the tag's signature format and establish a maintainer-controlled trust source. For OpenPGP, GitHub serves the keys attached to an account at `https://github.com/{username}.gpg`:

```bash
curl -fsSL https://github.com/{username}.gpg | gpg --import
git fetch --tags
git tag -v {tag}
git cat-file -t {tag}
```

`git tag -v` succeeding and `git cat-file -t {tag}` printing `tag` together confirm a trusted signature on an annotated tag. For SSH, set `gpg.format=ssh` and point `gpg.ssh.allowedSignersFile` at an allowed-signers file containing the maintainer's verified public key. For X.509, set `gpg.format=x509` and configure the certificate trust chain. Do not treat any key found by username alone as trusted without confirming the maintainer controls it.

## Untrusted input (R-SEC-07)

GitHub evaluates expressions before handing a `run:` block to the shell. Keep user-controlled event fields out of generated shell text:

```yaml
- name: Check title
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: ./scripts/check-title "$PR_TITLE"
```

Quoting the expression directly inside `run:` is not sufficient because expression substitution happens first. Also inspect every `pull_request_target` and `workflow_run` workflow. A privileged workflow must not check out or execute the contributor-controlled ref, including package scripts from that ref.

## Static analysis (R-SEC-09)

For a public repository in a CodeQL-supported language, prefer CodeQL default setup and confirm its pull request analysis appears as a required status check. Private repositories require GitHub Code Security on an eligible GitHub Team or Enterprise plan. If CodeQL does not support the language, use the project's established analyzer and require its pull request result rather than adding a no-op CodeQL configuration.

## Read OpenSSF Scorecard results (Step 12)

Query the public API rather than running the scan:

```bash
curl -s https://api.scorecard.dev/projects/github.com/{owner}/{repo}
```

This returns a JSON object with a top-level `score` and a `checks` array, each entry carrying `name`, `score`, `reason`, and `details`. A repository the weekly scan has not covered, which is most repositories outside roughly the top million by dependency count, or one that has never run the Scorecard GitHub Action with `publish_results: true`, returns `404` with an empty body; treat that as the normal case for a smaller or newer project, not a failure to work around. `api.securityscorecards.dev` is an older hostname for the same API and still resolves; prefer `api.scorecard.dev`, the one the project's own current documentation and badge examples use.

Where a result exists, use `Pinned-Dependencies`, `Token-Permissions`, `Dependency-Update-Tool`, and `Branch-Protection` as dated supplementary evidence for R-SEC-01 through R-SEC-04. `Signed-Releases` examines release artifacts, not git tag signatures, so it is not R-SEC-05 evidence. The weekly scan omits some API-expensive checks, and any individual check can be inconclusive or fail internally. Keep the direct evidence authoritative and quote the result's `reason`, `details`, date, and Scorecard version.

Where no result exists, report that fact without approximating a score or expanding the task into scanner installation.
