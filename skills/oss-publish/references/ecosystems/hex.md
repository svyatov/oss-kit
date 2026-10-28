# Hex

Concrete flow for packages published to hex.pm. Use GitHub Workload Identity for an existing public package. Hex exchanges the job's OIDC token for a short-lived package token. Unsupported providers retain the scoped-key fallback below.

Two Hex behaviours shape the workflow. `mix hex.publish` builds the tarball it uploads, so build and publish cannot be split across jobs the way they are for npm or RubyGems. And a published version can be replaced for one hour, after which it is fixed.

Source: [Hex, Publishing a package](https://hex.pm/docs/publish), [Hex docs, mix hex.publish](https://hex.hexdocs.pm/Mix.Tasks.Hex.Publish.html), and [hexpm/hex, CHANGELOG](https://github.com/hexpm/hex/blob/main/CHANGELOG.md).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2)](#configure-trusted-publishing-step-2)
- [Write the hardened release workflow (Step 3)](#write-the-hardened-release-workflow-step-3)
- [Gate on manual approval (Step 4)](#gate-on-manual-approval-step-4)
- [Verify provenance (Step 5): a gap, not a check](#verify-provenance-step-5-a-gap-not-a-check)
- [Describe and sign what the release attaches (Step 6)](#describe-and-sign-what-the-release-attaches-step-6)
- [The one-hour window](#the-one-hour-window)

## Gather facts (Step 1)

Read `mix.exs`. The `project/0` function carries `:app`, which is the package name unless `:package` overrides it with `:name`, and `:version`. The `:package` keyword also carries `:links`, which is where the repository URL usually lives; fall back to `git remote get-url origin`.

Check whether the package is already published:

```bash
curl -s -o /dev/null -w '%{http_code}' https://hex.pm/api/packages/<name>
```

A `404` means the name is free, or taken and private. An unpublished package cannot take the flow below unchanged: hex.pm refuses to issue a key scoped to a package the account does not yet own, so the first publish needs a broader key or a hand-run publish. Step 2 covers what that forces.

Note whether `mix.lock` is committed. It has to be, for the exposure in Step 3 to be bounded at all.

## Configure trusted publishing (Step 2)

Use Workload Identity on GitHub. Use the scoped-key fallback only for unsupported providers or deployments where the feature is disabled.

### GitHub workload identity

The public package must already exist. Publish its first release interactively, then configure its workload identity as a full owner with two-factor authentication.

Open the package's Workload identities tab. Set the GitHub repository owner and name, workflow filename `release.yml`, and approval environment `release`. Workflow names are case-sensitive. For a private GitHub repository, supply its numeric repository ID from `gh api repos/<owner>/<repo> --jq .id`. Hex binds the owner and repository IDs to prevent a recreated name from inheriting access.

The publish job requests an OIDC token for Hex's advertised audience and exchanges it at `/api/oauth/token`. The returned token expires after 15 minutes and covers only the package named in the scope. Pass it to Mix as `HEX_API_KEY="Bearer <token>"`. Request a new OIDC token for each package exchange; a token cannot be exchanged twice.

Private Hex packages use an organization workload identity with a write role and an explicit package list. Their exchange scope is `package:ORG/PACKAGE`. Unlike a public package identity, this can create a new private package. Read the organization-specific requirements before configuring that branch.

Source: [official Workload Identity source](https://github.com/hexpm/hexpm/blob/main/lib/hexpm_web/templates/docs/workload_identity.html.md), checked 2026-10-11. The publishing page recommends this flow, but its linked `/docs/workload-identity` guide returned 404 on that date. Confirm the tab and exchange are enabled on the target deployment before calling setup complete. A missing tab can also mean the account lacks full ownership.

### Scoped-key fallback

GitLab and other providers have no supported Workload Identity flow. Use a package-scoped, expiring key there, behind the native approval gate. This remains the below-the-bar R-PUB-02 fallback; it is not the default for supported GitHub publishing.

Generate the key in the browser, at `https://hex.pm/dashboard/keys`. The form asks for a name, an expiry, and a set of permissions, and it re-prompts for authentication before it will create one. Set the expiry from the presets, 7, 30, 60, 90, or 365 days, or a custom date, to the shortest value that fits the release cadence, and plan to rotate on that schedule. For permissions, do not tick the whole-API box: that reaches every package the account owns. Tick the single package under Packages instead, which the form lists from the packages the account owns and which records a `package` permission scoped to that name.

A package-scoped key is what the fallback asks for, because hex.pm's release endpoint authorizes publishing on the `api:write` and `package` domains together with a package-owner check, so such a key publishes that one package and nothing else.

Two consequences worth telling the maintainer. The form lists only packages the account already owns, so the very first publish of a brand new package needs a broader key or an interactive `mix hex.publish` from the maintainer's own machine. And a repository publishing several packages needs one key per package, or it is back to an account-wide key.

Do not reach for the OAuth token that `mix hex.user auth` writes into `~/.hex/hex.config` as a substitute. No upstream source documents extracting it for CI, it belongs to an interactive session that Hex refreshes and can invalidate, and treating an undocumented on-disk credential as a publishing token is exactly the improvisation this reference exists to prevent.

An organization publishing to its own repository takes a different command, and that one is current: `mix hex.organization key ORGANIZATION generate [--key-name KEY_NAME] [--permission PERMISSION]` still exists and still parses those flags. It defaults to `repository:ORGANIZATION`, which is read-only access to the organization's repository, so name the permission the publish actually needs rather than accepting the default.

Store the key as a GitHub Actions secret bound to the approval environment from Step 4, not as a repository secret, so it is unreadable by any workflow run that has not been approved. On GitLab CI/CD, store it as a variable that is masked, protected, and scoped to the protected environment.


## Write the hardened release workflow (Step 3)

`mix hex.publish` builds the tarball as part of publishing. There is no equivalent of `npm pack` handing a finished artifact to a credentialed job that does nothing else, so build, package, and publish collapse into the one job that holds the key. That collapse is the security problem this section has to answer, and it cannot be removed, only bounded.

That is also why this is the one file in this directory with no `build` job. `SKILL.md`'s workflow shape gives every other ecosystem one, and here it would have nothing to hand on: `mix hex.publish` accepts no prebuilt tarball path. `mix hex.build` in the test job is the closest thing, and it exists to fail the release before the credentialed job runs rather than to produce an artifact for it.

Mix can execute dependency code during compilation. Workload Identity limits token lifetime but does not remove that exposure in the publish job. Install and compile dependencies before exchanging the token, and run only the required package publication afterward. With a stored-key fallback, malicious dependency code can steal a credential valid until expiry or revocation.

Four controls bound it, and all four are already in this skill's vocabulary:

- A job that does nothing but publish. No tests, no linting, no documentation build, no release-notes step. Those belong in the uncredentialed job above it.
- `mix deps.get --check-locked` against a committed `mix.lock`, so the tree compiled in the credentialed job is the exact tree CI already compiled and tested without a key. R-SEC-08 is the rule, and its `Check:` asks for the frozen mode rather than the plain install, so a bare `mix deps.get` in a workflow this skill writes fails a rule the kit owns and an audit run afterwards will score it. `oss-harden` owns the lockfile itself.
- A package-scoped workload token, or the narrowest fallback key from Step 2.
- The publish job bound to R-PUB-04's approval environment, with the identity policy matching that environment.

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: erlef/setup-beam@v1  # oss-harden pins this to a commit SHA
        with:
          version-file: .tool-versions
          version-type: strict
      - run: mix deps.get --check-locked
      - run: mix test  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)
      - run: mix hex.build
      - run: test -f "<name>-${GITHUB_REF_NAME#v}.tar"
      - run: mix hex.publish --dry-run

  publish:
    runs-on: ubuntu-latest
    needs: [test]
    environment: release
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: erlef/setup-beam@v1
        with:
          version-file: .tool-versions
          version-type: strict
      - run: mix deps.get --check-locked
      - run: mix deps.compile
      - name: Exchange identity and publish
        env:
          HEX_PACKAGE: <name>
        run: |
          set -euo pipefail
          AUDIENCE=$(curl -fsS https://hex.pm/api/oidc/audience | jq -er '.audience | select(type == "string" and length > 0)')
          OIDC_TOKEN=$(curl -fsS \
            -H "Authorization: Bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
            "${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${AUDIENCE}" \
            | jq -er '.value | select(type == "string" and length > 0)')
          printf '::add-mask::%s\n' "$OIDC_TOKEN"
          ACCESS_TOKEN=$(curl -fsS -X POST https://hex.pm/api/oauth/token \
            -H 'Content-Type: application/x-www-form-urlencoded' \
            --data-urlencode 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer' \
            --data-urlencode "assertion=$OIDC_TOKEN" \
            --data-urlencode "scope=package:hexpm/$HEX_PACKAGE" \
            | jq -er '.access_token | select(type == "string" and length > 0)')
          printf '::add-mask::%s\n' "$ACCESS_TOKEN"
          HEX_API_KEY="Bearer $ACCESS_TOKEN" mix hex.publish package --yes
```

The version check is a file test rather than a property query, because `mix hex.build` names its output `<app>-<version>.tar` from the project configuration: if the tag and `mix.exs` disagree, the expected file is simply not there. Replace `<name>` with the package name from Step 1 and adapt the `v` prefix strip to the repository's actual tag format. `--dry-run` builds the package and runs the local checks without publishing, which is what moves every failure that is not the upload itself into the job with no key. `--yes` publishes without the confirmation prompts, which a non-interactive job cannot answer.

`mix hex.publish package` limits the credentialed step to package publication. Build documentation without credentials, and configure its publication separately if the project ships docs. A plain `mix hex.publish` also runs the documentation toolchain while credentials are present. Compilation before exchange reduces that window but cannot prove the publish command executes no project code.

`oss-harden` pins every `uses:` line above to a commit SHA and sets the test job's minimal permissions. Cache nothing in either job: a restored build cache in a job that compiles dependencies and holds a publish key is the worst version of the exposure this section is about. On GitLab CI/CD the same two jobs apply, with `HEX_API_KEY` as a masked and protected variable and the publish job blocking and manual in a protected environment.

After verifying Workload Identity, revoke an old stored `HEX_API_KEY`. For a fallback deployment, replace an account-wide key with the package-scoped key from Step 2 and revoke the old key.

## Gate on manual approval (Step 4)

Pin the publish job to `environment: release` as above, and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers naming at least one person other than an automation account, and match that environment in the workload identity. Only the stored-key fallback needs `HEX_API_KEY` as an environment secret. Required reviewers work for public repositories on current GitHub plans; private or internal repositories need GitHub Enterprise Cloud. On GitLab Premium or Ultimate, use one blocking manual job in a protected environment.

Create it with the API rather than the form. Reviewers and the tag policy are both settable, so nothing here needs a browser.

```sh
ENV=release
GHUID=$(gh api user --jq .id)
gh api -X PUT "repos/{owner}/{repo}/environments/$ENV" \
  -F wait_timer=0 \
  -F prevent_self_review=false \
  -f 'reviewers[][type]=User' -F "reviewers[][id]=$GHUID" \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true'
gh api -X POST "repos/{owner}/{repo}/environments/$ENV/deployment-branch-policies" \
  -f 'name=v*' -f type=tag
```

Three details decide whether that runs. `gh api` substitutes `{owner}` and `{repo}` from the checkout it runs in. Use `-F` for the booleans and the reviewer id, because `-f` sends every value as a string and the endpoint rejects a quoted boolean. Do not name the shell variable `UID`: zsh marks it read only, so the assignment fails before `gh` runs.

`reviewers[][id]` takes a numeric user or team id rather than a login. A team needs `type=Team` and that team's id.

Hex has no registry-side approval gate. The one-hour replacement window below is not one: it runs after the version is already public and installable, so it shortens the damage rather than preventing it. Report R-PUB-04 as unmet when the forge plan provides no native gate, rather than presenting the window as a substitute.

The gate restricts both token issuance through the matched workload identity and access to any fallback environment secret.

## Verify provenance (Step 5): a gap, not a check

Workload Identity authenticates the publisher; it does not by itself supply a cryptographically verifiable artifact attestation. Hex's implementation records OIDC claims with the release, but do not treat those claims or its provenance display as a signed bundle. Verify an attestation for the exact consumer artifact as described below.

Source: [Hex, Publishing a package](https://hex.pm/docs/publish) and [hexpm/hex, CHANGELOG](https://github.com/hexpm/hex/blob/main/CHANGELOG.md).

What hex.pm does serve is a digest. The release endpoint returns a `checksum` field for a published version:

```bash
curl -s https://hex.pm/api/packages/<name>/releases/<version> | jq -r .checksum
```

That is the checksum Hex computes over the release tarball, and it is what `mix.lock` records for a dependency, so a consumer's lockfile and the registry can be compared directly. It is integrity, not provenance: it says the bits have not changed since publication, and nothing about which commit or workflow produced them. Report it that way, and use it as the release check after the first tag-triggered publish, comparing the registry's value against the entry the project's own `mix.lock` records for that version.

The strongest substitute for provenance is a forge attestation over the tarball the publish job built. `mix hex.build` writes `<name>-<version>.tar` without publishing it, so the credentialed job can attest what it uploaded:

```bash
gh attestation verify <name>-<version>.tar --repo <owner>/<repo>
```

hex.pm neither surfaces nor links to that attestation, and a consumer installing through `mix deps.get` never sees it, so it is worth less here than in an ecosystem whose registry serves the record. On GitLab CI/CD there is no equivalent forge attestation in this skill's scope at all.

Verify the exact published package against the expected repository and workflow through the forge attestation. Report R-PUB-03 as met only when that cryptographic verification succeeds, and name the registry-hosting limitation. Otherwise report it as unmet. A locally rebuilt artifact is not evidence for different bytes served by the registry.

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. Publishing to hex.pm attaches nothing to the forge, and the source archives the forge generates for a tag are not built assets, so a library that only publishes goes to Step 7 instead. What this section covers is a project that also attaches a compiled release or an escript.

Build those assets in an uncredentialed `build` job and upload them as the `build` artifact. Add that job to the publish job's existing prerequisites. The asset job below waits for both successful publication and the completed build.

This reference names no SBOM generator for Elixir. The ones in common use are third-party Mix tasks rather than part of the toolchain, and a task that reads the dependency tree inside the release workflow is one the maintainer vets before it goes there. `mix.lock` is the closest thing the project already has, and it is neither SPDX nor CycloneDX, so publishing it does not satisfy R-PUB-05's format requirement; say that rather than presenting the lockfile as a bill of materials.

Two rules apply here and they ask for different things. R-PUB-05 wants that inventory. R-PUB-06 wants the assets signed, or listed by hash in a signed manifest. A manifest of hashes answers the second and nothing about the first, so do not report R-PUB-05 as met by publishing one.

GitHub's SPDX dependency-graph export can supplement an artifact inventory without installing another tool. It does not establish R-PUB-05 coverage by itself. The `gh api` step below writes it into `dist/`, so it ships as supplementary release evidence and is listed in `SHA256SUMS` and attested alongside the assets for R-PUB-06, in a job after the publish so everything stays behind the approval gate:

```yaml
  github-release:
    runs-on: ubuntu-latest
    needs: [publish, build]
    permissions:
      contents: write
      id-token: write
      attestations: write
      artifact-metadata: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: build
          path: dist/
      - run: gh api repos/${{ github.repository }}/dependency-graph/sbom --jq .sbom > dist/sbom.spdx.json
        env:
          GH_TOKEN: ${{ github.token }}
      - run: (cd dist && sha256sum *) > SHA256SUMS
      - uses: actions/attest@v4
        with:
          subject-checksums: SHA256SUMS
      - run: gh release upload "$GITHUB_REF_NAME" dist/* SHA256SUMS
        env:
          GH_TOKEN: ${{ github.token }}
```

The export describes the repository graph at the time of the request, not necessarily the tagged build or released asset. Read it back to detect an empty or unsupported graph, but a nonzero package count is not proof of coverage. Before passing R-PUB-05, verify that the inventory matches the exact release and includes every bundled dependency, runtime, and linked component. Otherwise generate an SPDX or CycloneDX inventory from the artifact or build, after vetting the required tool. If that coverage remains unproved, report R-PUB-05 unmet on either forge. A package declaration alone does not establish the contents of a compiled asset.

`sha256sum` runs from inside `dist/` so the names it writes are the names the assets carry on the release. `subject-checksums` makes every file in the manifest a subject of the attestation in its own right, by name and digest; attesting `SHA256SUMS` itself with `subject-path` would leave a consumer able to verify the manifest and nothing about the assets it lists.

A consumer verifies an asset, then checks the rest of the download against the manifest:

```bash
gh attestation verify <asset> --repo <owner>/<repo>
sha256sum -c SHA256SUMS
```

Run the first command against each asset downloaded, never against `SHA256SUMS`, which is a subject of nothing. The four grants above are copied exactly, on this job only, and the workflow's top-level block stays `contents: read`. Narrowing anything else, pinning each `uses:` to a commit SHA, and auditing the result are `oss-harden`'s.

## The one-hour window

A published version can be republished for up to one hour after its first publication, with `--replace`, and reverted entirely with `mix hex.publish --revert VERSION`; reverting the only version removes the package. After that hour the version is fixed.

Treat this as a window and not as an undo. It is measured from the first publish, not from when somebody noticed, and it does nothing about a version already fetched into somebody's `mix.lock` inside it. `oss-changelog` owns how a withdrawn version gets recorded, under R-CHG-01. What the window is genuinely good for is the case an approval gate cannot catch, a correct release with a broken artifact, and the release process should not be designed around having it.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.


Workload Identity checked 2026-10-11 against [publishing](https://hex.pm/docs/publish) and the [official setup source](https://github.com/hexpm/hexpm/blob/main/lib/hexpm_web/templates/docs/workload_identity.html.md).

Verified 2026-07-31 against the 2.4.0 entry in [hexpm/hex, CHANGELOG](https://github.com/hexpm/hex/blob/main/CHANGELOG.md), recording the OAuth device flow that replaced password authentication; [hexpm/hex, lib/mix/tasks/hex.user.ex](https://github.com/hexpm/hex/blob/main/lib/mix/tasks/hex.user.ex), which declares `@switches []` and dispatches `whoami`, `auth`, and `deauth` alone; [hexpm/hex, lib/hex/state.ex](https://github.com/hexpm/hex/blob/main/lib/hex/state.ex), which still reads `HEX_API_KEY`; [hexpm/hex, lib/mix/tasks/hex.organization.ex](https://github.com/hexpm/hex/blob/main/lib/mix/tasks/hex.organization.ex), which still documents `key ORGANIZATION generate` with `--key-name` and `--permission` and defaults to `repository:ORGANIZATION`; [hexpm/hexpm, lib/hexpm_web/controllers/dashboard/key_controller.ex](https://github.com/hexpm/hexpm/blob/main/lib/hexpm_web/controllers/dashboard/key_controller.ex), whose `create` action is routed at `/dashboard/keys`, whose `munge_expiry` accepts 7, 30, 60, 90, and 365 days or a custom date, and whose `munge_permissions` accepts a `package` domain per owned package; [Hex docs, mix hex.publish](https://hex.hexdocs.pm/Mix.Tasks.Hex.Publish.html); [Hex docs, mix hex.build](https://hex.hexdocs.pm/Mix.Tasks.Hex.Build.html); the package-domain validation in [hexpm/hexpm, lib/hexpm/accounts/key_permission.ex](https://github.com/hexpm/hexpm/blob/main/lib/hexpm/accounts/key_permission.ex); the authorization plug in [hexpm/hexpm, lib/hexpm_web/controllers/api/release_controller.ex](https://github.com/hexpm/hexpm/blob/main/lib/hexpm_web/controllers/api/release_controller.ex); and the `checksum` field returned by `https://hex.pm/api/packages/<name>/releases/<version>`.
