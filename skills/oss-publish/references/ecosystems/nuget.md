# NuGet

Concrete flow for the decisions `SKILL.md` makes, for a package published to nuget.org. NuGet documents one OIDC provider for trusted publishing: GitHub Actions. The exchange runs through the `NuGet/login` action, which trades the workflow's OIDC token for a temporary API key valid for one hour. Each OIDC token yields exactly one API key and can be used once, so the login step belongs immediately before the push rather than at the top of the job.

Rollout is gradual. NuGet's own documentation says the Trusted Publishing option "might not be available to you yet", so confirm it appears under the account menu on nuget.org before writing a workflow that depends on it, and fall back to Step 2's stored-key path only when it does not.

Source: [Microsoft Learn, Trusted Publishing on nuget.org](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2)](#configure-trusted-publishing-step-2)
  - [GitHub Actions](#github-actions)
  - [GitLab CI/CD: no documented flow](#gitlab-cicd-no-documented-flow)
- [Write the hardened release workflow (Step 3)](#write-the-hardened-release-workflow-step-3)
- [Gate on manual approval (Step 4)](#gate-on-manual-approval-step-4)
- [Verify provenance (Step 5): a gap, not a check](#verify-provenance-step-5-a-gap-not-a-check)
- [Describe and sign what the release attaches (Step 6)](#describe-and-sign-what-the-release-attaches-step-6)
- [Policies pending full activation](#policies-pending-full-activation)

## Gather facts (Step 1)

Read every project file the repository packs: `*.csproj`, `*.fsproj`, or `*.vbproj`. The package identity is the `PackageId` property, falling back to the assembly name when it is unset, and the version is the `Version` property or the `VersionPrefix` and `VersionSuffix` pair. A solution with more than one packable project publishes more than one package; enumerate them, since a trusted publishing policy is owned per account or organization and each package still has its own owners.

Get the owner and repository from `RepositoryUrl` in the project file, falling back to `git remote get-url origin`. Note the nuget.org profile name of the account that will own the policy, because the `NuGet/login` action takes that username and not an email address.

Check whether a package is already published:

```bash
curl -s -o /dev/null -w '%{http_code}' https://api.nuget.org/v3-flatcontainer/<lowercased id>/index.json
```

Anything other than `200` means the ID is unclaimed on nuget.org, or reserved under somebody else's ID prefix reservation. Note also that nuget.org does not support deleting a published package in the general case, so a wrong version is unlisted rather than removed; that is what makes the gate in Step 4 load-bearing here.

## Configure trusted publishing (Step 2)

Only one of the two sections below is a flow. NuGet documents GitHub Actions and says nothing about GitLab, so a GitLab project takes the fallback rather than a shorter version of the same setup.

### GitHub Actions

Sign in to nuget.org, open Trusted Publishing from the username menu, and add a policy. The fields are case-insensitive:

- Repository Owner: the owner from Step 1
- Repository: the repository name from Step 1
- Workflow File: the publish workflow's filename only, for example `release.yml`, not the `.github/workflows/` path
- Environment: the approval environment name from `SKILL.md` Step 4, for example `release`

Leaving Environment empty means the policy matches any run of that workflow, approved or not. Fill it in, for the same reason the other registries' environment fields exist: it is the field that makes the approval gate in Step 4 part of the registry's identity check rather than a forge convenience.

A policy is owned by an individual user or by an organization, and it applies to every package that owner owns. That is a wider blast radius than the per-package trusted publisher entries npm, PyPI, and RubyGems use, and it is worth saying out loud to the maintainer: one policy plus one compromised workflow file reaches the whole account. Choose the owner deliberately, and keep the workflow filename specific. A policy whose creator later leaves the owning organization goes inactive until they are added back.

In the workflow, the publish job needs:

```yaml
permissions:
  contents: read
  id-token: write
steps:
  - uses: NuGet/login@v1
    id: login
    with:
      user: ${{ secrets.NUGET_USER }}  # the nuget.org profile name, not an email address
```

The step's `NUGET_API_KEY` output is the temporary key, consumed as `${{ steps.login.outputs.NUGET_API_KEY }}`. No long-lived `NUGET_API_KEY` secret needs to exist in the repository. The username in `user:` is not a credential, and the documentation recommends holding it in a secret anyway; either is defensible, so present it as the maintainer's choice rather than a requirement.

### GitLab CI/CD: no documented flow

NuGet's trusted publishing documentation describes GitHub Actions throughout and mentions GitLab CI/CD nowhere. That is silence, not a documented refusal, so read the page before reporting on it and do not assume a GitLab flow exists because other registries have one.

Source: [Microsoft Learn, Trusted Publishing on nuget.org](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing).

Where the documentation names no GitLab provider, this is the strongest alternative:

Create a scoped API key on nuget.org, from the API Keys page under the username menu. Select the narrowest scope that still publishes, which is push only new package versions where the package already exists, and set the glob pattern to the exact package ID rather than to `*`. Every key carries an expiry; set the shortest one that fits the release cadence, and note that the scope cannot be edited afterwards while the package list can. Store the key as a GitLab CI/CD variable that is both masked and protected, so it is redacted from job logs and reachable only from a protected branch or tag. Put the publish job behind a GitLab protected environment with approval rules, the same gate Step 4 uses elsewhere, so the key's presence in the pipeline is not on its own enough to publish. Register a code signing certificate and sign the package, so the uploaded bytes carry an identity the key alone does not give them.

Source for the key scopes and the glob pattern: [Microsoft Learn, Scoped API keys](https://learn.microsoft.com/en-us/nuget/nuget-org/scoped-api-keys).

This is below the bar R-PUB-02 sets, because a scoped, expiring key is still a credential that can leak, where trusted publishing stores nothing at all. Take it only while the documentation names no GitLab provider, and re-read that page before each release process is written.

## Write the hardened release workflow (Step 3)

The publish job restores nothing, builds nothing, and calls no third-party action beyond the login above and the artifact download: anything running in a job that holds a NuGet API key can publish the package. Pack in a separate job, hand the `.nupkg` and its symbol package across as an artifact, and let the publish job push exactly those bytes.

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
      - uses: actions/setup-dotnet@v6
        with:
          dotnet-version: '<the exact SDK version from global.json>'
          cache: false
      - run: dotnet restore --locked-mode
      - run: dotnet test --no-restore  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)

  pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-dotnet@v6
        with:
          dotnet-version: '<the exact SDK version from global.json>'
          cache: false
      - run: dotnet restore --locked-mode
      - run: dotnet pack --no-restore -c Release -o artifacts
      - run: test -f "artifacts/<PackageId>.${GITHUB_REF_NAME#v}.nupkg"
      - uses: actions/upload-artifact@v7
        with:
          name: nupkg
          path: artifacts/
          retention-days: 1

  publish:
    runs-on: ubuntu-latest
    needs: [test, pack]
    environment: release
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: nupkg
          path: artifacts/
      - uses: actions/setup-dotnet@v6
        with:
          dotnet-version: '<the exact SDK version from global.json>'
          cache: false
      - uses: NuGet/login@v1
        id: login
        with:
          user: ${{ secrets.NUGET_USER }}
      - run: >
          dotnet nuget push "artifacts/*.nupkg"
          --api-key ${{ steps.login.outputs.NUGET_API_KEY }}
          --source https://api.nuget.org/v3/index.json
```

The version check is the file test rather than a property query, because `dotnet pack` names the output `<PackageId>.<Version>.nupkg`: if the tag and the project version disagree, the expected file is simply not there. Replace `<PackageId>` with the identity from Step 1 and adapt the `v` prefix strip to the repository's actual tag format. A solution packing several packages needs one test per package, not a glob.

`--locked-mode` needs `packages.lock.json` committed, which NuGet does not create unless asked; R-SEC-08 and `oss-harden` own that decision, including NuGet's own guidance that a library other projects depend on should not check the lock file in. Drop the flag rather than inventing a lock file here, and hand the gap to `oss-harden`.

`oss-harden` pins every `uses:` line above to a commit SHA and sets the test and pack jobs' minimal permissions, including the `contents: read` this skill left off them. This skill writes only the grants a job needs to authenticate, publish, and attest.

If an existing workflow reads a `NUGET_API_KEY` from repository secrets, remove it from the YAML now and tell the user to delete the secret and revoke the key on nuget.org once the new flow is verified.

## Gate on manual approval (Step 4)

Pin the publish job to `environment: release` as above, and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers naming at least one person other than an automation account. Required reviewers work for public repositories on current GitHub plans; private or internal repositories need GitHub Enterprise Cloud.

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

nuget.org has no registry-side approval gate: there is no staging area a maintainer approves out of, and a successful push is immediately live. Report R-PUB-04 as unmet when the forge plan provides no native gate, rather than substituting an unverified approval action. The approval matters more here than in a registry with an unpublish window, because nuget.org does not support deleting a published package in the general case.

Because the trusted publishing policy carries an Environment field, the environment is doing double duty: it gates the run and it narrows which runs the registry will mint a key for. Set both, and check that the string matches exactly.

## Verify provenance (Step 5): a gap, not a check

nuget.org serves no build provenance. There is no attestation object, no SLSA statement, and nothing comparable to npm's `npm audit signatures` or PyPI's Integrity API. What it does serve is signatures, and the difference is worth stating precisely to the maintainer, because a signed package reads like provenance and is not: a signature says an identity vouched for these bytes, and provenance says which commit and workflow produced them.

Two signatures exist. An author signature is one the project applies itself with `dotnet nuget sign`, using a code signing certificate from a public certificate authority; nuget.org rejects self-issued certificates, and the certificate must be registered on the account before a signed package is accepted. A repository signature is one nuget.org adds, and it records the owning account, which is why nuget.org's own documentation warns that renaming an account leaves the old username embedded in the repository signature of every version already published.

Source: [Microsoft Learn, Signing NuGet packages](https://learn.microsoft.com/en-us/nuget/create-packages/sign-a-package) and [Microsoft Learn, nuget.org FAQ](https://learn.microsoft.com/en-us/nuget/nuget-org/nuget-org-faq).

The strongest substitute for provenance is a forge attestation over the exact `.nupkg` that was pushed. Add it in a job after the publish, attesting the same artifact the publish job downloaded, and verify it against the downloaded package:

```bash
gh attestation verify <id>.<version>.nupkg --repo <owner>/<repo>
```

nuget.org does not surface or link to that attestation, so a consumer has to know to look for it. Signing the package as well is worth doing where the project already holds a certificate, because the signature travels with the package and the attestation does not.

This sits below R-PUB-03, which asks for provenance tied to the exact published artifact. Report it as unmet with the registry limitation named. It retires the day nuget.org serves an attestation for a published version.

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. Pushing to nuget.org attaches nothing to the forge, and the source archives GitHub generates for a tag are not built assets, so a project that only publishes goes to Step 7 instead.

Two rules apply here and they ask for different things. R-PUB-05 wants an inventory of what went into the asset, in SPDX or CycloneDX. R-PUB-06 wants the assets signed, or listed by hash in a signed manifest. A manifest of hashes answers the second and nothing about the first, so do not report R-PUB-05 as met by publishing one.

This reference names no SBOM generator for .NET. The ones in common use are separate tools rather than part of the SDK, and a tool that reads the dependency tree inside the release workflow is one the maintainer vets before it goes there. What answers R-PUB-05 without one, on GitHub, is the forge's own export of the repository's dependency graph, which is already SPDX and needs nothing installed. The `gh api` step below writes it into `dist/`, so it ships as a release asset for R-PUB-05 and is listed in `SHA256SUMS` and attested alongside the packages for R-PUB-06:

```yaml
  release:
    runs-on: ubuntu-latest
    needs: [publish]
    permissions:
      contents: write
      id-token: write
      attestations: write
      artifact-metadata: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: nupkg
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

State both of the export's limits to the maintainer rather than leaving them to be discovered. It is GitHub only, so a GitLab project keeps this gap and R-PUB-05 stays unmet there with the reason named. And it covers the repository's declared dependency graph rather than what is inside the asset, which is exact for a `.nupkg` that declares its dependencies rather than bundling them, and an approximation where the build embeds them. The graph resolves past the direct dependencies only where `packages.lock.json` is committed; R-SEC-08 places a library package, which NuGet's own guidance tells not to commit one, outside that requirement, so a library's export lists its direct dependencies alone and the report should say which of the two it is. Read the output back once with `gh api repos/<owner>/<repo>/dependency-graph/sbom --jq '.sbom.packages | length'` before reporting the rule met: a graph the forge does not parse for this ecosystem returns a near-empty package list rather than an error.

`sha256sum` runs from inside `dist/` so the names it writes are the names the assets carry on the release. `subject-checksums` makes every file in the manifest a subject of the attestation in its own right, by name and digest; attesting `SHA256SUMS` itself with `subject-path` would leave a consumer able to verify the manifest and nothing about the assets it lists.

A consumer verifies an asset, then checks the rest of the download against the manifest:

```bash
gh attestation verify <asset> --repo <owner>/<repo>
sha256sum -c SHA256SUMS
```

Run the first command against each asset downloaded, never against `SHA256SUMS`, which is a subject of nothing. `--signer-workflow <owner>/<repo>/.github/workflows/release.yml` pins which workflow the attestation must have come from.

A third job is what makes the grants above safe, so copy the job boundary along with them. The pack job runs `dotnet pack` against the project's own targets, so giving it release-asset writes and an attestation identity is exactly the credential split Step 3 exists to enforce, and it would write assets before the approval gate. The publish job holds the registry key. Only a separate job satisfies both, and `needs: [publish]` is what keeps the assets behind the gate.

The four grants above are copied exactly, on this job only, and the workflow's top-level block stays `contents: read`. Narrowing anything else, pinning each `uses:` to a commit SHA, and auditing the result are `oss-harden`'s. On GitLab CI/CD the forge attestation is unavailable, so a GitLab release can carry the same `SHA256SUMS` with nothing signing it; say that rather than presenting the file as provenance.

## Policies pending full activation

A new trusted publishing policy can start out temporarily active for seven days, which the interface shows, and which usually happens on a private GitHub repository. If no publish happens inside that window the policy goes inactive, and the window can be restarted at any time. The reason is worth passing on to the maintainer rather than treating as a quirk: nuget.org needs the GitHub repository and owner IDs to bind the policy, and it only learns them from a successful publish. Without them, somebody could delete a repository, recreate it under the same name, and publish as if nothing had changed. Once a publish supplies the IDs, the policy becomes permanent.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-07-31 against [Microsoft Learn, Trusted Publishing on nuget.org](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing), [Microsoft Learn, Scoped API keys](https://learn.microsoft.com/en-us/nuget/nuget-org/scoped-api-keys), [Microsoft Learn, Signing NuGet packages](https://learn.microsoft.com/en-us/nuget/create-packages/sign-a-package), and [Microsoft Learn, nuget.org FAQ](https://learn.microsoft.com/en-us/nuget/nuget-org/nuget-org-faq).
