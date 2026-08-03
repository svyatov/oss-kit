# GitHub reference

Concrete commands and settings for the decisions `SKILL.md` makes, on GitHub Actions and repository settings. Every path below was checked against current GitHub documentation and, where noted, against a live API response.

## Contents

- [Read the current state (Step 2)](#read-the-current-state-step-2)
- [Pin external actions and reusable workflows to a commit SHA (R-SEC-01)](#pin-external-actions-and-reusable-workflows-to-a-commit-sha-r-sec-01)
- [Set least-privilege permissions (R-SEC-02)](#set-least-privilege-permissions-r-sec-02)
- [Automated dependency updates (R-SEC-03)](#automated-dependency-updates-r-sec-03)
- [Branch protection and rulesets (R-SEC-04, R-SEC-12)](#branch-protection-and-rulesets-r-sec-04-r-sec-12)
  - [Deriving the required checks](#deriving-the-required-checks)
  - [Updating an existing ruleset](#updating-an-existing-ruleset)
  - [The bypass list](#the-bypass-list)
  - [Who can merge is a permission, not a rule](#who-can-merge-is-a-permission-not-a-rule)
  - [Verify](#verify)
- [Signed tags (R-SEC-05)](#signed-tags-r-sec-05)
  - [Resolve which account publishes the key](#resolve-which-account-publishes-the-key)
  - [SSH](#ssh)
  - [OpenPGP](#openpgp)
  - [A configuration error is not a bad signature](#a-configuration-error-is-not-a-bad-signature)
- [Tag rulesets (R-SEC-13)](#tag-rulesets-r-sec-13)
- [Untrusted input (R-SEC-07)](#untrusted-input-r-sec-07)
- [Static analysis (R-SEC-09)](#static-analysis-r-sec-09)
- [Detection controls (R-SEC-10, R-SEC-11)](#detection-controls-r-sec-10-r-sec-11)
  - [The write is not the evidence](#the-write-is-not-the-evidence)
  - [Absent is not disabled](#absent-is-not-disabled)
  - [Controls with no API](#controls-with-no-api)
  - [What the graph actually watches](#what-the-graph-actually-watches)
  - [When push protection fires](#when-push-protection-fires)
- [Read OpenSSF Scorecard results (Step 13)](#read-openssf-scorecard-results-step-13)

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

A job that calls a reusable workflow is the one place where trimming a scope breaks the run rather than tightening it. The called workflow declares its own `permissions:`, and granting it less fails the whole run before any job starts, with `The workflow is requesting 'security-events: write', but is only allowed 'security-events: none'.` An input that disables the step needing the scope does not change this, because the check compares the two declarations rather than what the run goes on to do. Read the called workflow's top-level block and grant exactly that, then narrow what it does through its inputs.

## Automated dependency updates (R-SEC-03, R-SEC-14)

`dependabot.yml` version 2 needs one `updates` entry per ecosystem, each with `package-ecosystem`, `directory`, and `schedule.interval`, and a `cooldown` for R-SEC-14:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      default-days: 7
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      default-days: 7
```

`github-actions` scans every `.github/workflows/*.yml` file regardless of the `directory` value, so `directory: "/"` is correct even for a monorepo with workflows only at the root. `schedule.interval` accepts `daily`, `weekly`, `monthly`, `quarterly`, `semiannually`, or `yearly`, or a `cron` schedule for finer control; `daily` runs on weekdays only. Add one `package-ecosystem` entry per manifest ecosystem the project actually uses; do not add an ecosystem the repository has no manifest for.

`cooldown` delays a version update by the number of days given, and Dependabot's own default inside the block is 3 days where `default-days` is absent. Write the number anyway, because a reader cannot tell an intended 3 from a forgotten key. `semver-major-days`, `semver-minor-days`, and `semver-patch-days` refine it for the ecosystems that track semantic versioning, and `include` and `exclude` take up to 150 entries each with wildcards, `exclude` winning. What the block does not do is delay a security update, which is the point: an advisory-driven fix still arrives the day it is published, so raising the cooldown costs the project nothing it wanted. Seven days is a defensible starting value and the standard asks only for at least a day; set it against how quickly the project actually merges bumps, since a cooldown longer than the gap between merges changes nothing.

A workflow step that installs a tool with `pip install <package>` with no version pin, or `uv tool install git+<url>` with no ref, is not covered by the `github-actions` ecosystem above; Dependabot updates what a `uses:` line or a manifest names, not an arbitrary shell command. Pinning and updating that kind of install is the supply-chain observation `SKILL.md` Step 3 describes; note it in the summary rather than assuming `github-actions` coverage extends to it.

## Branch protection and rulesets (R-SEC-04, R-SEC-12)

Give the user the resolved URL for rulesets: `https://github.com/{owner}/{repo}/settings/rules`. Four rule types carry what R-SEC-04 requires:

- `pull_request`, which is what makes a pull request the only path onto the branch. It does that with `required_approving_review_count` at 0, so this rule type carries R-SEC-04 on a repository R-SEC-12 does not reach.
- `required_status_checks`, naming every check CI reports. Each entry takes an `integration_id` next to its `context`; supplying it means only that app can satisfy the check, where omitting it lets anything reporting the same context name satisfy it.
- `non_fast_forward`, which blocks force pushes.
- `deletion`, which blocks deleting the branch.

Scope the ruleset with `conditions.ref_name.include` set to `["~DEFAULT_BRANCH"]` rather than the literal branch name, so renaming the default branch cannot leave the ruleset pointing at a branch that no longer exists.

R-SEC-12 adds review to the same `pull_request` rule, on a repository where two or more principals can merge. Set `required_approving_review_count` to 1 or more, and where CODEOWNERS exists set `require_code_owner_review` alongside it, so the file `oss-community` wrote is enforced rather than advisory. Two further parameters belong with these and are worth setting past what the rule requires. `dismiss_stale_reviews_on_push` drops approvals when new commits arrive, so an approval always refers to the code being merged. `require_last_push_approval` goes further and requires the newest push to be approved by somebody other than whoever pushed it, which closes the window where a contributor collects an approval and then adds a commit before merging; `dismiss_stale_reviews_on_push` alone reopens review, where this one also rules out self-approving the follow-up. All four are review controls, so leave all four off where R-SEC-12 does not reach the repository.

Two more `pull_request` parameters are worth setting on any repository, and neither needs a second person. `required_review_thread_resolution` blocks the merge while a review comment is unresolved, including one the maintainer left themselves. `allowed_merge_methods` takes any non-empty subset of `merge`, `squash`, and `rebase`, and setting it is not redundant with the repository's own merge-method checkboxes: the repository setting is what a maintainer can change in one click, where the ruleset entry is a branch-level control that survives that change and shows up in the ruleset history. Set it to the method the project's history is already written in.

Where the user prefers the API to the settings page, `POST /repos/{owner}/{repo}/rulesets` takes the whole thing at once, which is also how it gets recorded and repeated on the next repository. This is the complete body, written for a repository R-SEC-12 does not reach:

```json
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "require_code_owner_review": false,
        "dismiss_stale_reviews_on_push": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "<check name from the derivation below>", "integration_id": 15368 }
        ]
      }
    },
    { "type": "required_linear_history" },
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ]
}
```

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input ruleset.json
```

Copy exactly: `target`, `enforcement`, the `~DEFAULT_BRANCH` condition, the empty `bypass_actors`, and the `non_fast_forward` and `deletion` rules. Those are what R-SEC-04 asks for and none of them is a preference.

The reader sets five things. `name` is theirs. `allowed_merge_methods` takes any non-empty subset of `merge`, `squash`, and `rebase`; set it to the method the project's history is already written in. `required_linear_history` belongs only where that method is `squash` or `rebase`, so drop it on a project that merges. `strict_required_status_checks_policy` at `true` additionally requires the branch to be current with its base before merging, which catches a change that passes alone and fails against what landed meanwhile, at the cost of an update per merge; drop it to `false` on a busy repository where that becomes a queue. `required_status_checks` is derived, below.

The four review fields sit at their off values because that is correct where one principal holds every merge path, and they are in the body rather than omitted so a reader can see what they are turning on. Once two or more principals can merge, R-SEC-12 applies and those values are wrong: raise `required_approving_review_count` to 1 or more, and set `require_code_owner_review` where CODEOWNERS exists. `dismiss_stale_reviews_on_push` and `require_last_push_approval` go on with them, for the reasons above. A body shipped with all four off to a multi-principal repository reads like the kit's complete answer and is not one, which is why they are here rather than left out.

### Deriving the required checks

Read the checks that actually report, twice, and require their union:

```bash
gh api repos/{owner}/{repo}/commits/{ref}/check-runs \
  --jq '[.check_runs[] | {context: .name, integration_id: .app.id}] | unique'
```

Run it once against the default branch and once against the head commit of a recently merged pull request. One read is not enough: the endpoint returns only what reported on the commit named, so a workflow triggered by `pull_request` alone never appears on a default-branch commit and drops out of the ruleset silently. This repository is the worked example, since `.github/workflows/osv-scanner.yml` triggers on `pull_request` and `schedule` only. The checks most often scoped to pull requests are the security scans, and a ruleset that reports complete while the scan gates nothing is the failure R-SEC-04 exists to prevent.

The command returns `integration_id` alongside each context for the reason given above: without it, anything reporting the same context name satisfies the check. A check reported by more than one app is the escape hatch, and takes the bare `context` with no `integration_id`. The known cost of pinning is that a check migrating to a different app makes the requirement unsatisfiable until somebody edits the ruleset.

### Updating an existing ruleset

`POST` creates a new ruleset every time, so a rerun stacks a second one beside the first and both then apply. Read the ruleset list first, and where one already exists for this branch, send `PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}` with the same body instead. The `id` comes from `gh api repos/{owner}/{repo}/rulesets`.

### The bypass list

A ruleset's bypass list replaces the classic "Do not allow bypassing the above settings" checkbox, inverted: classic protection exempted admins unless the box was ticked, where a ruleset binds everyone unless an actor is listed. Each entry carries an `actor_type`, an `actor_id`, and a `bypass_mode` of either `always` or `pull_request`. Prefer `pull_request`: the actor can merge a pull request that violates the rules, but still cannot push straight to the branch, so every change leaves a reviewable trail.

The case this matters most is a single-maintainer project, and it needs saying before the ruleset goes in rather than after. Nobody can approve their own pull request, so a ruleset requiring one approving review with an empty bypass list makes every change the sole maintainer opens unmergeable. A bypass entry is the wrong way out of that. R-SEC-12 does not reach a repository where one principal holds every merge path, so leave `required_approving_review_count` at 0 and leave the bypass list empty. The ruleset then binds the owner as tightly as anyone else, and GitHub stops reporting `BLOCKED` on a pull request nothing is actually blocking. A requirement nobody can meet, undone by an exemption for the one person it named, is weaker than not setting it: it costs the repository an unbypassable ruleset and buys a status that stops nobody.

Add Repository admin at `pull_request` mode only where the requirement does real work against other principals and one person still has to merge past it. Name who that exempts when you report it.

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

Fetch the tags first, then establish what the tag actually is before reaching for a key. A run against a tag the checkout never fetched otherwise fails somewhere further down and reads as a bad signature:

```bash
git fetch --tags
git cat-file -t {tag}
git for-each-ref --format='%(taggeremail:trim) %(contents:signature)' refs/tags/{tag}
```

`git cat-file -t` printing `tag` means the tag is annotated rather than lightweight; anything else and there is no signature to check. The `for-each-ref` read gives both remaining facts at once: the tagger's email, and a signature block whose first line names the format, `SSH SIGNATURE` for SSH and `PGP SIGNATURE` for OpenPGP. `:trim` drops the angle brackets git otherwise wraps the address in.

### Resolve which account publishes the key

The key comes from an account, and the tag does not name one. Ask GitHub what the repository owner is:

```bash
gh api users/{owner} --jq .type
```

On `User`, the owner is that account and R-SEC-05's own command applies as written, with `{owner}` as the account. Do not treat the account as the maintainer on that basis alone: `users/{account}/ssh_signing_keys` proves an account published a key, and never that the human behind it is who the release claims. Confirm that separately, through a channel the maintainer controls.

On `Organization`, the owner has no signing keys of its own and there is nothing to fetch. Report the `%(taggeremail:trim)` already in hand and ask which account publishes the key for it. Do not derive the account from the release publisher or from the tagged commit's author: either can differ from the tagger, and using one has the skill assert an identity it inferred, which is the single thing R-SEC-05 exists to prevent. Once an account is named, the same caveat applies to it: the fetch proves publication, not control.

### SSH

Fetch the account's signing keys, build an allowed-signers file naming the tagger's email, and verify against it:

```bash
gh api users/{account}/ssh_signing_keys --jq '.[].key' > keys.txt
sed 's|^|{tagger-email} namespaces="git" |' keys.txt > allowed_signers
git -c gpg.ssh.allowedSignersFile=allowed_signers tag -v {tag}
```

Each line is the principals field, then options, then the key, space separated. `namespaces="git"` restricts the key to git's own signature namespace, which is the namespace `git tag -v` reports on success.

### OpenPGP

GitHub serves the keys attached to an account at `https://github.com/{username}.gpg`:

```bash
curl -fsSL https://github.com/{username}.gpg | gpg --import
git tag -v {tag}
```

The caveat is at its sharpest here, because the URL takes nothing but a username: a key found by username alone is not a trusted key until the maintainer is confirmed to control the account.

For X.509, set `gpg.format=x509` and configure the certificate trust chain.

### A configuration error is not a bad signature

With SSH signatures and `gpg.ssh.allowedSignersFile` unset, git prints

```
error: gpg.ssh.allowedSignersFile needs to be configured and exist for ssh signature verification
```

and exits 1. That is the same exit status a bad signature gives, so a run that only checks the status reports an unsigned or forged tag when the tag is fine and the verifier is not configured. Read the message before scoring: this text means the check did not run, and R-SEC-05 is unknown rather than failed. Passing the file inline with `-c`, as above, is what keeps this from depending on the machine's git configuration at all.

## Tag rulesets (R-SEC-13)

A tag ruleset is the same object as the branch ruleset above with two fields changed: `target` is `tag` instead of `branch`, and the condition matches the release tag pattern instead of the default branch. It is a separate ruleset, so a repository whose default branch is fully guarded can still have every tag unprotected.

Three rule types carry this rule, and each is documented as a restriction to whoever can bypass: `creation` as "Only users with bypass permissions can create branches or tags whose name matches the pattern you specify", `update` as the same for pushing to a matching ref, and `deletion` as the same for deleting one. `update` is what stops a released tag moving, since repointing a tag is a ref update rather than a force push, so do not reach for `non_fast_forward` to cover it.

Those three do not belong in one ruleset, and the reason is the bypass list. A bypass list is granted for a whole ruleset rather than per rule, so a single ruleset holding all three has one list that exempts its actors from all of them. That list cannot be empty, because `creation` with no bypass actor means nobody can cut a release at all. Filling it hands those actors `update` and `deletion` too, which is exactly the power this rule exists to remove. The two halves want opposite bypass lists, so they want two rulesets. Rulesets aggregate: GitHub documents that "if multiple rulesets target the same branch or tag in a repository, the rules in each of these rulesets are aggregated", and that "if the same rule is defined in different ways across the aggregated rulesets, the most restrictive version of the rule applies".

The first ruleset makes a released tag immutable, and nothing is exempt from it:

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input - <<'JSON'
{
  "name": "tags-immutable",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "rules": [
    { "type": "update" },
    { "type": "deletion" }
  ],
  "bypass_actors": []
}
JSON
```

The second restricts who may cut a release, and its bypass list is the point rather than a hole in it:

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input - <<'JSON'
{
  "name": "tags-creation",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "rules": [{ "type": "creation" }],
  "bypass_actors": [
    { "actor_type": "RepositoryRole", "actor_id": 5, "bypass_mode": "always" }
  ]
}
JSON
```

Name the release principals explicitly there, with the same `actor_type` values the earlier section lists, and keep the list as short as the release process allows. Repository admin is the widest defensible entry and a named team or app is usually narrower.

Match `refs/tags/*` only where the project tags nothing else. Where releases are `v`-prefixed and other tags are not, `refs/tags/v*` protects the releases without freezing every scratch tag someone pushes.

Read it back rather than trusting the write, the same two calls the branch case needs:

```bash
gh api repos/{owner}/{repo}/rulesets --jq '.[] | select(.target == "tag")'
gh api repos/{owner}/{repo}/rulesets/{ruleset_id}
```

The list call reports id, name, target, and enforcement only; the three rule types come from the per-ruleset call. Confirm `enforcement` is `active`, that all three types are present, and that `bypass_actors` holds only the principals the project means to let publish.

This sits beside R-SEC-05 rather than replacing it. A signature says who cut the tag; the ruleset keeps the tag on the commit they cut.

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

Parsing is only one of the two ways coverage goes missing, and it is the one that comparison catches. The other is the updater's own ecosystem table, where an ecosystem listed for version updates and not for security updates leaves its whole advisory feed as the residual rather than the transitive tail of a manifest. Which ecosystems those are, and the SBOM evidence behind each, live in the per-ecosystem files, starting with [ecosystems/hex.md](ecosystems/hex.md) and [ecosystems/npm.md](ecosystems/npm.md).

### When push protection fires

Push protection rejects the push rather than the commit, and the maintainer sees a git error rather than a security message. The output names the detection, the commit holding it, and a one-time link that allows that specific detection. Read the link out of the push output rather than constructing it, and treat a false positive as one allowed detection rather than as a reason to turn the control off.

## Read OpenSSF Scorecard results (Step 13)

Query the public API rather than running the scan:

```bash
curl -s https://api.scorecard.dev/projects/github.com/{owner}/{repo}
```

This returns a JSON object with a top-level `score` and a `checks` array, each entry carrying `name`, `score`, `reason`, and `details`. A repository the weekly scan has not covered, which is most repositories outside roughly the top million by dependency count, or one that has never run the Scorecard GitHub Action with `publish_results: true`, returns `404` with an empty body; treat that as the normal case for a smaller or newer project, not a failure to work around. `api.securityscorecards.dev` is an older hostname for the same API and still resolves; prefer `api.scorecard.dev`, the one the project's own current documentation and badge examples use.

Where a result exists, use `Pinned-Dependencies`, `Token-Permissions`, `Dependency-Update-Tool`, and `Branch-Protection` as dated supplementary evidence for R-SEC-01 through R-SEC-04. `Branch-Protection` is tiered and each tier gates the one above it, so a repository outside R-SEC-12 scores 3 of 10 there and cannot score higher whatever else it sets: review is tier 2 and status checks are tier 3. Report that number as the expected result rather than a regression, and never raise the review requirement to move it. `Signed-Releases` examines release artifacts, not git tag signatures, so it is not R-SEC-05 evidence. The weekly scan omits some API-expensive checks, and any individual check can be inconclusive or fail internally. Keep the direct evidence authoritative and quote the result's `reason`, `details`, date, and Scorecard version.

Where no result exists, report that fact without approximating a score or expanding the task into scanner installation.
