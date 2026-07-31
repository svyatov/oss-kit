# pub.dev

Concrete flow for the decisions `SKILL.md` makes, for a Dart or Flutter package published to pub.dev. pub.dev documents one OIDC provider for automated publishing: GitHub Actions. The publisher is configured on the package's own Admin tab and is bound to a git tag pattern rather than to a workflow filename, which is the field that differs most from every other registry in this directory.

The Dart team maintains a reusable workflow that does the whole publish, and it takes an `environment` input, so the approval gate in Step 4 works without hand-writing the job. That is worth knowing before writing anything, because a job that calls a reusable workflow cannot set `environment:` itself.

Source: [Dart, Automated publishing of packages to pub.dev](https://dart.dev/tools/pub/automated-publishing).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2)](#configure-trusted-publishing-step-2)
  - [GitHub Actions](#github-actions)
  - [GitLab CI/CD: no documented flow](#gitlab-cicd-no-documented-flow)
- [Write the hardened release workflow (Step 3)](#write-the-hardened-release-workflow-step-3)
- [Gate on manual approval (Step 4)](#gate-on-manual-approval-step-4)
- [Verify provenance (Step 5): a gap, not a check](#verify-provenance-step-5-a-gap-not-a-check)
- [Describe and sign what the release attaches (Step 6)](#describe-and-sign-what-the-release-attaches-step-6)
- [Not yet published packages](#not-yet-published-packages)

## Gather facts (Step 1)

Read `pubspec.yaml` for `name` and `version`, and for `repository` or `homepage`, which is where the forge URL usually lives; fall back to `git remote get-url origin`. Note whether the package belongs to a verified publisher, because that decides who can configure automated publishing and what pub.dev displays about the package.

Check whether the package is already published, and read its published versions, from pub.dev's own package endpoint:

```bash
curl -s https://pub.dev/api/packages/<name>
```

The response lists every version with its `version`, `archive_url`, `archive_sha256`, and `retracted` flag. A `404` means the name is free. This endpoint comes from the Hosted Pub Repository Specification V2 rather than from pub.dev's own supported-API list, which is worth knowing before a checker depends on it.

Note whether `pubspec.lock` is committed. Dart writes it by default and documents that an application package should commit it while a library should not, so its absence in a library is correct rather than a gap; R-SEC-08 and `oss-harden` own that.

## Configure trusted publishing (Step 2)

Only one of the two sections below is a flow. pub.dev documents GitHub Actions and says nothing about GitLab, so a GitLab project takes the fallback rather than a shorter version of the same setup.

### GitHub Actions

On pub.dev, open the package's Admin tab and find the Automated publishing section. Enter:

- Repository: the owner and repository as `<owner>/<repo>`
- Tag pattern: a pattern containing `{{version}}`, for example `v{{version}}`

The tag pattern is the whole of the binding. A tag matching `v{{version}}` allows a GitHub Actions run triggered by `git tag v1.2.3` to publish version 1.2.3, and only if `pubspec.yaml` declares that same version. There is no workflow filename field here, so unlike npm, PyPI, RubyGems, crates.io, and NuGet, the identity pub.dev checks does not name which workflow ran.

That makes the optional field the important one. Enable "Require GitHub Actions environment" and set the environment name to `release`. Without it, any workflow in the repository that can produce a matching tag and request an OIDC token can publish. With it, only a run in that environment can, which is what makes the approval gate in Step 4 load-bearing rather than decorative.

pub.dev requires no particular name here and its own examples use `pub.dev`. This skill writes `release` for every ecosystem, so the same word means the same thing in every repository it touches. What matters is that this field and the reusable workflow's `environment` input are the same string; where a repository already has a working entry naming something else, keep it rather than renaming both to match this file.

In the workflow, the publish job needs `permissions: id-token: write`, which is what lets it request the OIDC token pub.dev validates.

### GitLab CI/CD: no documented flow

Dart's automated publishing page documents GitHub Actions in detail, adds Google Cloud Build, and mentions GitLab CI/CD nowhere. Read that page before reporting on it: the absence is silence rather than a documented refusal, and it does not mean a flow exists under another name.

Source: [Dart, Automated publishing of packages to pub.dev](https://dart.dev/tools/pub/automated-publishing).

Where the page names no GitLab provider, this is the strongest documented alternative. Dart's own answer for a CI system with no supported identity is a Google Cloud service account: create one, grant it publishing rights on pub.dev, and exchange its exported key for a pub.dev token.

```bash
gcloud auth activate-service-account --key-file=key-file.json
gcloud auth print-identity-token --audiences=https://pub.dev | dart pub token add https://pub.dev
dart pub publish --force
```

The exported key is a long-lived credential and Dart's documentation says to treat it like a password, because anyone who reads it can publish the package. Store it as a GitLab CI/CD variable that is masked, protected, and scoped to a protected environment with approval rules, so the key is unreadable outside an approved release job.

This is well below the bar R-PUB-02 sets: an exported service account key is a stored credential in exactly the sense the rule exists to eliminate, and it is account-shaped rather than package-shaped. It is also worse than the scoped-token fallbacks elsewhere in this directory, so say so plainly. Take it only while the page names no GitLab provider, and re-read that page before each release process is written.

## Write the hardened release workflow (Step 3)

The Dart team publishes a reusable workflow that does the checkout, SDK setup, dependency resolution, dry run, and publish. Use it rather than hand-rolling the same steps, because it is first-party to the SDK and the OIDC token it requests is provisioned by `dart-lang/setup-dart` inside it:

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
      - uses: dart-lang/setup-dart@v1
      - run: dart pub get --enforce-lockfile
      - run: dart analyze --fatal-infos
      - run: dart test  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)

  publish:
    needs: [test]
    permissions:
      id-token: write
    uses: dart-lang/setup-dart/.github/workflows/publish.yml@v1
    with:
      environment: release
```

`dart pub get --enforce-lockfile` in the test job is R-SEC-08's frozen mode, so a workflow this skill writes with a bare `dart pub get` fails a rule the kit owns. It needs a committed `pubspec.lock`. Dart's own guidance tells a library package not to commit one, and R-SEC-08's second clause places that case outside the rule rather than failing it, so drop the flag for a library and keep it for an application. Do not add the flag and leave the lockfile uncommitted: the job then fails on every run with nothing to fix.

The trigger is `v*` rather than an exact three-part pattern, which is what every other reference in this directory uses and what pub.dev's `v{{version}}` already covers. A narrower workflow trigger adds no safety here, because pub.dev checks the tag against its own pattern and refuses anything that does not match; what it does instead is silently skip a prerelease tag such as `v1.2.3-beta`, which is a valid pub version. The tag trigger still has to be no narrower than the pattern configured in Step 2, since the pattern is what pub.dev checks. There is no separate version comparison step here: `dart pub publish` refuses to publish a version that does not match `pubspec.yaml`, and the tag pattern is what ties the tag to that version, so the comparison happens on the registry's side rather than in a `run:` step.

Two things about that reusable workflow are worth telling the maintainer rather than leaving them to discover. It runs `dart pub get` and `dart pub publish` in the same job that holds the publish identity, so build and publish are not separated the way this skill separates them elsewhere; the bound on that is that Dart's package resolution runs no package-supplied code, so resolving the tree does not execute a dependency. And it installs a Flutter SDK as well as a Dart one, so that a Flutter package and a pure Dart package go through the same path; a pure Dart project is therefore pulling in a toolchain it does not use.

Pin the reusable workflow the way `oss-harden` pins an action, to a commit SHA rather than to `@v1`, and pin the actions in the test job the same way. A job that calls a reusable workflow accepts a narrow set of keys, so `environment:` is passed through the workflow's own `environment` input rather than set on the job, which is exactly what the `with:` block above does.

If an existing workflow reads a pub.dev token from repository secrets, remove it from the YAML now and tell the user to revoke it once the new flow is verified.

## Gate on manual approval (Step 4)

Two settings have to agree, and both are needed.

On the forge, create the environment at `https://github.com/<owner>/<repo>/settings/environments/new`, named `release` to match Step 2, with required reviewers naming at least one person other than an automation account. Required reviewers work for public repositories on current GitHub plans; private or internal repositories need GitHub Enterprise Cloud. Pass the name through the reusable workflow's `environment` input, as above.

Create it with the API rather than the form. Reviewers and the tag policy are both settable, so nothing here needs a browser.

```sh
ENV=pub.dev
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

On pub.dev, enable "Require GitHub Actions environment" with the same name. Without that half, the environment gates the run but pub.dev will still mint a token for a run that skipped it, so the gate is a forge convention rather than part of the registry's identity check.

pub.dev has no registry-side approval gate of its own. Report R-PUB-04 as unmet when the forge plan provides no native gate, rather than substituting an unverified approval action.

## Verify provenance (Step 5): a gap, not a check

pub.dev serves no build provenance. There is no attestation object, no signature on a published archive, and nothing comparable to npm's `npm audit signatures` or PyPI's Integrity API. Its publishing documentation covers who may upload and what the package page displays about the publisher, and says nothing about verifying what was uploaded. Read both pages before reporting, and do not read the verified publisher badge as provenance: it says a domain was verified for the account, not that a particular workflow produced a particular archive.

Source: [Dart, Publishing packages](https://dart.dev/tools/pub/publishing) and [Dart, Automated publishing of packages to pub.dev](https://dart.dev/tools/pub/automated-publishing).

What pub.dev does serve is a digest. Every version in the package endpoint from Step 1 carries `archive_sha256`, the hex-encoded SHA-256 of the archive at `archive_url`, which the repository specification describes as the field that lets a client verify the integrity of what it downloaded:

```bash
curl -s https://pub.dev/api/packages/<name> \
  | jq -r --arg v '<version>' '.versions[] | select(.version == $v) | .archive_sha256'
```

That is integrity, not provenance. It confirms the archive has not changed since publication and says nothing about which commit or workflow produced it. Use it as the release check after the first tag-triggered publish, and report it as what it is.

The strongest substitute for provenance is a forge attestation over the archive the publish produced. `dart pub publish --dry-run` lists what would go into the archive but the reusable workflow does not hand a file to a later job, so attesting the published archive means downloading it from `archive_url` in a job after the publish and attesting those bytes. That is weaker than attesting what the build produced, because it attests what the registry served back; say so rather than presenting it as equivalent.

This sits below R-PUB-03, which asks for provenance tied to the exact published artifact and the workflow that built it. Report it as unmet with the registry limitation named. It retires the day pub.dev serves an attestation for a published version, which is the natural next step for a registry that already validates an OIDC identity at upload.

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. Publishing to pub.dev attaches nothing to the forge, and the source archives GitHub generates for a tag are not built assets, so a package that only publishes goes to Step 7 instead. What this section covers is a project that also attaches compiled Flutter or Dart binaries.

This reference names no SBOM generator for Dart. The ones in common use are third-party tools rather than part of the SDK, and a tool that reads the dependency tree inside the release workflow is one the maintainer vets before it goes there. `pubspec.lock` is the closest thing the project already has, and it is neither SPDX nor CycloneDX, so publishing it does not satisfy R-PUB-05's format requirement; say that rather than presenting the lockfile as a bill of materials. A library that does not commit `pubspec.lock`, which is what Dart's own guidance tells it to do, does not even have that.

Two rules apply here and they ask for different things. R-PUB-05 wants that inventory. R-PUB-06 wants the assets signed, or listed by hash in a signed manifest. A manifest of hashes answers the second and nothing about the first, so do not report R-PUB-05 as met by publishing one.

What answers R-PUB-05 without a generator, on GitHub, is the forge's own export of the repository's dependency graph, which is already SPDX and needs nothing installed. The `gh api` step below writes it into `dist/`, so it ships as a release asset for R-PUB-05 and is listed in `SHA256SUMS` and attested alongside the binaries for R-PUB-06, in a job separate from the one that built them:

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
          name: binaries
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

State both of the export's limits to the maintainer rather than leaving them to be discovered. It is GitHub only, so a GitLab project keeps this gap and R-PUB-05 stays unmet there with the reason named. And it covers the repository's declared dependency graph rather than what is inside the asset, which is exact for the published package, because it declares its dependencies rather than bundling them, and an approximation for a compiled binary attached beside it. The graph resolves past the direct dependencies only where `pubspec.lock` is committed, which a library does not do, so a library's export lists its direct dependencies alone and the report should say so. Read the output back once with `gh api repos/<owner>/<repo>/dependency-graph/sbom --jq '.sbom.packages | length'` before reporting the rule met: a graph the forge does not parse for this ecosystem returns a near-empty package list rather than an error.

`sha256sum` runs from inside `dist/` so the names it writes are the names the assets carry on the release. `subject-checksums` makes every file in the manifest a subject of the attestation in its own right, by name and digest; attesting `SHA256SUMS` itself with `subject-path` would leave a consumer able to verify the manifest and nothing about the assets it lists.

A consumer verifies an asset, then checks the rest of the download against the manifest:

```bash
gh attestation verify <asset> --repo <owner>/<repo>
sha256sum -c SHA256SUMS
```

Run the first command against each asset downloaded, never against `SHA256SUMS`, which is a subject of nothing. `--signer-workflow <owner>/<repo>/.github/workflows/release.yml` pins which workflow the attestation must have come from. On GitLab CI/CD the forge attestation is unavailable, so a GitLab release can carry the same `SHA256SUMS` with nothing signing it; say that rather than presenting the file as provenance.

The four grants above are copied exactly, on this job only, and the workflow's top-level block stays `contents: read`. Narrowing anything else, pinning each `uses:` to a commit SHA, and auditing the result are `oss-harden`'s.

## Not yet published packages

Automated publishing is configured on the package's Admin tab, which does not exist until the package is published once. Have the maintainer publish the first version from their own machine with `dart pub publish`, after `dart pub publish --dry-run` reports clean, then configure Step 2 immediately. That first release has no OIDC identity behind it and every release after it does.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-07-31 against [Dart, Automated publishing of packages to pub.dev](https://dart.dev/tools/pub/automated-publishing), [Dart, Publishing packages](https://dart.dev/tools/pub/publishing), the reusable workflow at [dart-lang/setup-dart, .github/workflows/publish.yml](https://github.com/dart-lang/setup-dart/blob/main/.github/workflows/publish.yml), and the `archive_sha256` field in the [Hosted Pub Repository Specification V2](https://github.com/dart-lang/pub/blob/master/doc/repository-spec-v2.md).
