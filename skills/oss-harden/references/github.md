# GitHub reference

Concrete commands and settings for the decisions `SKILL.md` makes, on GitHub Actions and repository settings. Every path below was checked against current GitHub documentation and, where noted, against a live API response.

## Read the current state (Step 2)

List every `uses:` line in both `.yml` and `.yaml` workflow files. A line matching an external `owner/repo@` or `owner/repo/path@` reference followed by a 40-character SHA is pinned; anything else, including `@main`, `@v4`, or a shorter SHA, is not. A local `uses: ./path` reference comes from the same repository commit and needs no external pin.

Check for an existing updater with `test -f .github/dependabot.yml` or a search for a Renovate configuration (`renovate.json`, `.github/renovate.json`, or a `"renovate"` key in `package.json`).

What guards the default branch lives in one of two places, and neither endpoint reports the other. Read both. Rulesets first, since that is the form to create:

```bash
gh api repos/{owner}/{repo}/rulesets
gh api repos/{owner}/{repo}/rulesets/{ruleset_id}
```

The list call returns id, name, target, and enforcement only. The rules themselves come from the per-ruleset call, so a repository with a ruleset takes two reads. More than one ruleset can match the same branch, and their rules combine, so read every entry whose conditions include the default branch rather than the first one.

Then the classic rule:

```bash
gh api repos/{owner}/{repo}/branches/{branch}/protection
```

This 404s with `Branch not protected` in three different situations that need telling apart: the branch is guarded by a ruleset instead, the branch is genuinely unguarded, or the repository or branch name is wrong. The ruleset read above separates the first from the other two. Confirm the repository and branch exist with `gh api repos/{owner}/{repo}` before reporting an unguarded branch on the strength of this 404 alone.

GitHub's own guidance is to prefer rulesets for a repository being configured today; classic branch protection still works and both this skill and the OpenSSF Scorecard action can read either, but do not set up the classic form on a repository that has neither yet.

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

Give the user the resolved URL for rulesets: `https://github.com/{owner}/{repo}/settings/rules`. Four rule types carry what R-SEC-04 requires:

- `pull_request`, with `required_approving_review_count` at 1 or more. Where CODEOWNERS exists, set `require_code_owner_review` alongside it, so the file `oss-community` wrote is enforced rather than advisory.
- `required_status_checks`, naming every check CI reports. Each entry takes an `integration_id` next to its `context`; supplying it means only that app can satisfy the check, where omitting it lets anything reporting the same context name satisfy it.
- `non_fast_forward`, which blocks force pushes.
- `deletion`, which blocks deleting the branch.

Scope the ruleset with `conditions.ref_name.include` set to `["~DEFAULT_BRANCH"]` rather than the literal branch name, so renaming the default branch cannot leave the ruleset pointing at a branch that no longer exists.

The `pull_request` rule carries four more parameters worth setting even though R-SEC-04 does not require them. `dismiss_stale_reviews_on_push` drops approvals when new commits arrive, so an approval always refers to the code being merged. `require_last_push_approval` goes further and requires the newest push to be approved by somebody other than whoever pushed it, which closes the window where a contributor collects an approval and then adds a commit before merging; `dismiss_stale_reviews_on_push` alone reopens review, where this one also rules out self-approving the follow-up. `required_review_thread_resolution` blocks the merge while a review comment is unresolved. `allowed_merge_methods` takes any non-empty subset of `merge`, `squash`, and `rebase`, and setting it is not redundant with the repository's own merge-method checkboxes: the repository setting is what a maintainer can change in one click, where the ruleset entry is a branch-level control that survives that change and shows up in the ruleset history. Set it to the method the project's history is already written in.

Where the user prefers the API to the settings page, `POST /repos/{owner}/{repo}/rulesets` takes the whole thing at once, which is also how it gets recorded and repeated on the next repository:

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input ruleset.json
```

### The bypass list

A ruleset's bypass list replaces the classic "Do not allow bypassing the above settings" checkbox, inverted: classic protection exempted admins unless the box was ticked, where a ruleset binds everyone unless an actor is listed. Each entry carries an `actor_type`, an `actor_id`, and a `bypass_mode` of either `always` or `pull_request`. Prefer `pull_request`: the actor can merge a pull request that violates the rules, but still cannot push straight to the branch, so every change leaves a reviewable trail.

The case this matters most is a single-maintainer project, and it needs saying before the ruleset goes in rather than after. Nobody can approve their own pull request, so a ruleset requiring one approving review with an empty bypass list makes every change the sole maintainer opens unmergeable. Put Repository admin on the list at `pull_request` mode. The requirement still binds every contributor, which is what R-SEC-04 is for.

The API returns `actor_id` as a bare number with no label, and GitHub documents the constant for `OrganizationAdmin` and not for repository roles, so do not report which role is exempt from the id alone. The create and read responses carry `current_user_can_bypass`, which is direct evidence for the maintainer running the command: `pull_requests_only` confirms both that the id resolves to a role they hold and that the mode is the narrower one. For the role's name, the UI at `/settings/rules` renders it and the API does not.

### Who can merge is a permission, not a rule

A maintainer asking for "contributors can never merge their own pull requests" is asking for something no ruleset expresses. Nothing in a ruleset keys on the identity of whoever clicks merge; the rules describe the state a pull request must reach, and anyone with write access who sees that state satisfied can merge it. Say this plainly rather than approximating it with a rule that does not do it.

The `update` rule is the one that reads like the answer and is not. Its wording covers pushes only, "only users with bypass permissions can push to branches or tags whose name matches the pattern," and a pull request merge is not one of those pushes. Adding it restricts direct pushes, which the `pull_request` rule already does, and changes nothing about who can merge.

What actually gates merging is repository access, so answer the question there. An outside contributor to a public repository works from a fork, holds no write access on the target, and cannot merge no matter how many approvals a pull request collects; this needs no configuration and is the case for most projects. Where the maintainer wants to bring someone in without granting that ability, the Triage role manages issues and pull requests without push access, so it cannot merge, and Write is the line that hands it over. Custom repository roles could carve this finer, but they are an organization feature and are unavailable on a user-owned repository.

Setting `require_last_push_approval` is the closest a ruleset gets, and it addresses a narrower problem: it stops a contributor who already has write access from approving their own follow-up commit after an earlier approval. It does not stop them merging.

### Verify

```bash
gh api repos/{owner}/{repo}/rulesets/{ruleset_id}
```

Confirm `enforcement` is `active` rather than `disabled` or `evaluate`, that the four rule types above are present, that the `pull_request` rule's review count is at least 1, that `required_status_checks` names the CI checks, and that `bypass_actors` holds only actors the project means to exempt.

A repository still on classic protection reports through `gh api repos/{owner}/{repo}/branches/{branch}/protection` instead, where the same intent reads as `required_pull_request_reviews.required_approving_review_count` at 1 or more, `required_status_checks.contexts` or `checks` naming the CI job, and `allow_force_pushes.enabled` and `allow_deletions.enabled` both `false`. That satisfies the rule; leave a working classic rule alone unless the user asks to move it. Migrating means creating the ruleset first, verifying it, and only then deleting the classic rule with `gh api -X DELETE repos/{owner}/{repo}/branches/{branch}/protection`, so the branch is never unguarded in between. Both forms can coexist, and while they do the more restrictive of the two applies.

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

Where the branch is guarded by a ruleset, the `code_scanning` rule is the stronger way to make the analysis binding, and it is worth having alongside the status check rather than instead of it:

```json
{
  "type": "code_scanning",
  "parameters": {
    "code_scanning_tools": [
      { "tool": "CodeQL", "security_alerts_threshold": "high_or_higher", "alerts_threshold": "errors" }
    ]
  }
}
```

A required status check asks whether the analysis reported; this rule asks what it found. It blocks the merge on three distinct conditions: the named tool found an alert at or above either threshold, the tool's analysis is still running, or the tool is not configured for the repository at all. That third condition is what a status check cannot express, since deleting the analysis setup removes the check rather than failing it, and a required check nobody reports stops being a gate.

`security_alerts_threshold` takes `none`, `critical`, `high_or_higher`, `medium_or_higher`, or `all`, and governs security alerts. `alerts_threshold` takes `none`, `errors`, `errors_and_warnings`, or `all`, and governs everything else the tool reports. The two are separate so a project can block on any security finding above a bar while tolerating style-grade alerts. `tool` matches the analysis tool's reported name, `CodeQL` for default setup; confirm the spelling against what the repository actually reports rather than assuming it:

```bash
gh api "repos/{owner}/{repo}/code-scanning/analyses?per_page=5" --jq '[.[] | .tool.name] | unique'
gh api repos/{owner}/{repo}/code-scanning/default-setup --jq '{state, languages}'
```

A `tool` name that matches nothing the repository reports reads as "not configured" and blocks every merge, so verify the name before the rule goes active.

GitHub Code Quality adds a second rule of the same shape, `code_quality`, whose `parameters.severity` names the level at or above which a result blocks the merge; `errors` is the value verified against a live ruleset. Two cautions belong with any recommendation of it. It is absent from the rulesets REST reference, which documents `code_scanning` and not this rule, so the API accepting it is currently better evidence than the reference is. And it is a licensed product that must be turned on per repository or organization and that consumes Actions minutes for its CodeQL passes plus per-seat licensing and AI credits for the rest, so name that cost before proposing it, and do not add the rule to a repository where Code Quality is not already on: a rule requiring a tool that never reports blocks every merge. R-SEC-09 does not require it, and CodeQL default setup with the `code_scanning` rule satisfies the rule on its own.

## Detection controls (R-SEC-10, R-SEC-11)

Three endpoints set everything the two rules need. They do not share a shape, so read the value back from the endpoint that owns it rather than from the one you wrote to.

```bash
gh api -X PATCH repos/{owner}/{repo} \
  -F 'security_and_analysis[secret_scanning][status]=enabled' \
  -F 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
gh api -X PUT repos/{owner}/{repo}/vulnerability-alerts
gh api -X PUT repos/{owner}/{repo}/automated-security-fixes
```

```bash
gh api repos/{owner}/{repo} --jq .security_and_analysis
gh api repos/{owner}/{repo}/vulnerability-alerts -i | head -1
```

The first read returns one object per switch, each with a `status` of `enabled` or `disabled`. The second answers `204 No Content` when alerts are on and `404` when they are off, with no body either way, which is why it needs `-i`. Dependabot security updates report back inside the first object as `dependabot_security_updates`, not through the endpoint that set them.

### The write is not the evidence

The repository `PATCH` answers `200` and returns the full repository object even for a field it will not honour. Setting `secret_scanning_non_provider_patterns` and `secret_scanning_validity_checks` on a public repository without GitHub Secret Protection succeeds by every signal the response gives and leaves both `disabled`. Those two switches are Secret Protection, a paid product; secret scanning, push protection, Dependabot alerts, and Dependabot security updates are free on a public repository. Never report a control enabled on the strength of the write.

### Absent is not disabled

`security_and_analysis` is omitted from `GET /repos/{owner}/{repo}` entirely for a caller without admin on the repository. The switches are still whatever they are; the caller cannot see them. A missing key is an unknown reading, and an audit that prints it as `disabled` reports a gap that may not exist. Say which of the two you got, and where the caller lacks admin, say that the reading needs an admin to resolve.

### Controls with no API

Dependabot malware alerts and grouped security updates are set on `https://github.com/{owner}/{repo}/settings/security_analysis` and have no endpoint, neither to write nor to read. Resolve that URL, name the two checkboxes, wait for the user to confirm, and record that the claim rests on their confirmation rather than on a reading. Automatic dependency submission lives on the same page and covers NuGet, Gradle, Maven, pip, and Poetry, so it is a gap only for a project shipping one of those.

### What the graph actually watches

Enabling alerts covers the ecosystems the dependency graph can parse, and its lockfile support is narrower than its manifest support. Where the project's lockfile is unsupported, the graph falls back to the manifests and reports the direct dependencies alone, with nothing in the security overview distinguishing that from full coverage. Compare the two sets directly:

```bash
gh api repos/{owner}/{repo}/dependency-graph/sbom \
  --jq '[.sbom.packages[].externalRefs[]?.referenceLocator | select(. != null) | split("/")[0]] | group_by(.) | map({(.[0]): length}) | add'
```

This groups the SBOM by purl ecosystem. Read the project's own resolved count out of its lockfile and compare. On this repository the SBOM reports 10 `pkg:npm` packages against 492 resolved in `site/bun.lock`, because `bun.lock` is not a file the graph parses; the 482 residual is the finding, and the fix is a scanner that reads the lockfile rather than a switch. `pkg:githubactions` entries come from the workflow files and cover R-SEC-01's pins.

### When push protection fires

Push protection rejects the push rather than the commit, and the maintainer sees a git error rather than a security message. The output names the detection, the commit holding it, and a one-time link that allows that specific detection. Read the link out of the push output rather than constructing it, and treat a false positive as one allowed detection rather than as a reason to turn the control off.

## Read OpenSSF Scorecard results (Step 13)

Query the public API rather than running the scan:

```bash
curl -s https://api.scorecard.dev/projects/github.com/{owner}/{repo}
```

This returns a JSON object with a top-level `score` and a `checks` array, each entry carrying `name`, `score`, `reason`, and `details`. A repository the weekly scan has not covered, which is most repositories outside roughly the top million by dependency count, or one that has never run the Scorecard GitHub Action with `publish_results: true`, returns `404` with an empty body; treat that as the normal case for a smaller or newer project, not a failure to work around. `api.securityscorecards.dev` is an older hostname for the same API and still resolves; prefer `api.scorecard.dev`, the one the project's own current documentation and badge examples use.

Where a result exists, use `Pinned-Dependencies`, `Token-Permissions`, `Dependency-Update-Tool`, and `Branch-Protection` as dated supplementary evidence for R-SEC-01 through R-SEC-04. `Signed-Releases` examines release artifacts, not git tag signatures, so it is not R-SEC-05 evidence. The weekly scan omits some API-expensive checks, and any individual check can be inconclusive or fail internally. Keep the direct evidence authoritative and quote the result's `reason`, `details`, date, and Scorecard version.

Where no result exists, report that fact without approximating a score or expanding the task into scanner installation.
