# NuGet

Concrete flow for the decisions `SKILL.md` makes, for a package published to nuget.org. NuGet documents trusted publishing for GitHub Actions and GitLab CI/CD. On GitHub, the exchange runs through the `NuGet/login` action, which trades the workflow's OIDC token for a temporary API key valid for one hour. Each OIDC token yields exactly one API key and can be used once, so the login step belongs immediately before the push rather than at the top of the job.

Source: [Microsoft Learn, Trusted Publishing on nuget.org](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2)](#configure-trusted-publishing-step-2)
  - [GitHub Actions](#github-actions)
  - [GitLab CI/CD](#gitlab-cicd)
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

HTTP 200 establishes publication. A confirmed 404 means no package is listed; check ID reservations before treating the name as available. Rate limits, authorization errors, server failures, and transport failures leave publication status unknown. Resolve those failures before selecting a first-publication path. nuget.org generally requires unlisting rather than deleting a wrong version, so verify the version before publication.

## Configure trusted publishing (Step 2)

Use the policy and exchange for the repository's forge. Configure the policy scope and package glob for the intended publishing operation.

### GitHub Actions

Sign in to nuget.org, open Trusted Publishing from the username menu, and add a policy. The fields are case-insensitive:

- Repository Owner: the owner from Step 1
- Repository: the repository name from Step 1
- Workflow File: `release.yml`, the filename only, not the `.github/workflows/` path
- Environment: the approval environment name from `SKILL.md` Step 4, for example `release`

Leaving Environment empty means the policy matches any run of that workflow, approved or not. Fill it in, for the same reason the other registries' environment fields exist: it is the field that makes the approval gate in Step 4 part of the registry's identity check rather than a forge convenience.

Choose the individual or organization that owns the packages. Restrict policy scopes to the required publishing operations and its glob to the intended package IDs. Ownership sets the available package set; the scope and glob narrow access within it. Keep the workflow filename and environment specific. A creator who leaves the owning organization can make the policy inactive.

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

### GitLab CI/CD

Add a GitLab policy under nuget.org's federated credentials. Match `namespace_path` and `project_path` to the project, and set the environment to `release`. Restrict policy scopes and its package glob as above. The optional `ref` field accepts a branch name, not a tag; omit that field for this tag-triggered flow.

The publish job consumes packages built and tested in uncredentialed jobs. Use the project's existing SDK image with `curl` and `jq` already available. Install nothing after the job's OIDC token becomes available. Bind a blocking manual job to the protected environment, as Step 4 requires:

```yaml
publish:
  stage: publish
  needs:
    - job: test
    - job: build
      artifacts: true
  environment:
    name: release
  when: manual
  allow_failure: false
  rules:
    - if: '$CI_COMMIT_TAG'
  id_tokens:
    NUGET_ID_TOKEN:
      aud: https://www.nuget.org
  script:
    - |
      set -eu
      API_KEY=$(curl -fsS -X POST https://www.nuget.org/api/v2/token \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer $NUGET_ID_TOKEN" \
        --data "$(jq -n --arg username "$NUGET_USERNAME" '{username: $username, tokenType: "ApiKey"}')")
      API_KEY=$(printf '%s' "$API_KEY" | jq -er '.apiKey | select(type == "string" and length > 0)')
      dotnet nuget push 'dist/*.nupkg' --api-key "$API_KEY" --source https://api.nuget.org/v3/index.json
```

`NUGET_USERNAME` is the nuget.org profile name. Adapt the `test` and `build` job names and artifact path to the existing pipeline. Keep shell tracing off and never print either token. A failed HTTP response or missing API key stops publication. The exchange belongs immediately before pushing the exact built packages.

Checked 2026-10-11 against [NuGet trusted publishing](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing), including GitLab claims and policy scopes.

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

  build:
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
    needs: [test, build]
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

`oss-harden` pins every `uses:` line above to a commit SHA and sets the test and build jobs' minimal permissions, including the `contents: read` this skill left off them. This skill writes only the grants a job needs to authenticate, publish, and attest.

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

A forge attestation can identify the exact `.nupkg` submitted for publication. Attest that original build artifact in the separate publishing or attestation job. Verify the retained original artifact against it:

```bash
gh attestation verify <original-build-artifact>.nupkg --repo <owner>/<repo>
```

nuget.org adds an embedded repository signature after upload, which changes the package bytes. Its downloaded package therefore cannot be verified by a raw digest comparison with the original artifact's attestation. Verify the repository signature separately with the documented NuGet signature-verification command. See [signed packages](https://learn.microsoft.com/en-us/nuget/reference/signed-packages-reference) and [package signature structure](https://github.com/NuGet/Home/wiki/Package-Signatures-Technical-Details).

Report R-PUB-03 unmet unless a documented method establishes the downloaded package's connection to the original build and workflow. An original-artifact attestation and a valid repository signature establish different facts. Neither justifies blindly attesting downloaded bytes or claiming an unchanged artifact.

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. Pushing to nuget.org attaches nothing to the forge, and the source archives GitHub generates for a tag are not built assets, so a project that only publishes goes to Step 7 instead.

Two rules apply here and they ask for different things. R-PUB-05 wants an inventory of what went into the asset, in SPDX or CycloneDX. R-PUB-06 wants the assets signed, or listed by hash in a signed manifest. A manifest of hashes answers the second and nothing about the first, so do not report R-PUB-05 as met by publishing one.

This reference names no SBOM generator for .NET. The ones in common use are separate tools rather than part of the SDK, and a tool that reads the dependency tree inside the release workflow is one the maintainer vets before it goes there. GitHub's SPDX dependency-graph export can supplement an artifact inventory without installing another tool. It does not establish R-PUB-05 coverage by itself. The `gh api` step below writes it into `dist/`, so it ships as supplementary release evidence and is listed in `SHA256SUMS` and attested alongside the packages for R-PUB-06:

```yaml
  github-release:
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

The export describes the repository graph at the time of the request, not necessarily the tagged build or released asset. Read it back to detect an empty or unsupported graph, but a nonzero package count is not proof of coverage. Before passing R-PUB-05, verify that the inventory matches the exact release and includes every bundled dependency, runtime, and linked component. Otherwise generate an SPDX or CycloneDX inventory from the artifact or build, after vetting the required tool. If that coverage remains unproved, report R-PUB-05 unmet on either forge. A package declaration alone does not establish the contents of a compiled asset.

`sha256sum` runs from inside `dist/` so the names it writes are the names the assets carry on the release. `subject-checksums` makes every file in the manifest a subject of the attestation in its own right, by name and digest; attesting `SHA256SUMS` itself with `subject-path` would leave a consumer able to verify the manifest and nothing about the assets it lists.

A consumer verifies an asset, then checks the rest of the download against the manifest:

```bash
gh attestation verify <asset> --repo <owner>/<repo>
sha256sum -c SHA256SUMS
```

Run the first command against each asset downloaded, never against `SHA256SUMS`, which is a subject of nothing. `--signer-workflow <owner>/<repo>/.github/workflows/release.yml` pins which workflow the attestation must have come from.

A third job is what makes the grants above safe, so copy the job boundary along with them. The build job runs `dotnet pack` against the project's own targets, so giving it release-asset writes and an attestation identity is exactly the credential split Step 3 exists to enforce, and it would write assets before the approval gate. The publish job holds the registry key. Only a separate job satisfies both, and `needs: [publish]` is what keeps the assets behind the gate.

The four grants above are copied exactly, on this job only, and the workflow's top-level block stays `contents: read`. Narrowing anything else, pinning each `uses:` to a commit SHA, and auditing the result are `oss-harden`'s. On GitLab CI/CD the forge attestation is unavailable, so a GitLab release can carry the same `SHA256SUMS` with nothing signing it; say that rather than presenting the file as provenance.

## Policies pending full activation

A new trusted publishing policy can start out temporarily active for seven days, which the interface shows, and which usually happens on a private GitHub repository. If no publish happens inside that window the policy goes inactive, and the window can be restarted at any time. The reason is worth passing on to the maintainer rather than treating as a quirk: nuget.org needs the GitHub repository and owner IDs to bind the policy, and it only learns them from a successful publish. Without them, somebody could delete a repository, recreate it under the same name, and publish as if nothing had changed. Once a publish supplies the IDs, the policy becomes permanent.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-07-31 against [Microsoft Learn, Trusted Publishing on nuget.org](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing), [Microsoft Learn, Scoped API keys](https://learn.microsoft.com/en-us/nuget/nuget-org/scoped-api-keys), [Microsoft Learn, Signing NuGet packages](https://learn.microsoft.com/en-us/nuget/create-packages/sign-a-package), and [Microsoft Learn, nuget.org FAQ](https://learn.microsoft.com/en-us/nuget/nuget-org/nuget-org-faq).
