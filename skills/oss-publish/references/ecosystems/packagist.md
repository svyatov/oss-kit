# Packagist

Concrete flow for the decisions `SKILL.md` makes, for a PHP package listed on packagist.org. Packagist runs on the tag-published track: a package is registered once by submitting its repository URL, and every version after that comes from a tag Packagist reads out of the repository. Packagist's own words are that new versions "are automatically fetched from tags you create in your VCS repository". Nothing is uploaded and no publish command exists, so `STANDARD.md`'s release preamble places R-PUB-01 through R-PUB-04 outside this track as a whole. R-PUB-07 is the rule that does apply, and it asks where the credential behind the update link lives. R-SEC-13's restriction on who may create a tag stands where the approval gate would stand, because creating the tag is the publish.

Source: [Packagist, About](https://packagist.org/about).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2)](#configure-trusted-publishing-step-2)
  - [GitHub](#github)
  - [GitLab](#gitlab)
- [Write the hardened release workflow (Step 3)](#write-the-hardened-release-workflow-step-3)
- [Gate on manual approval (Step 4): the gate is on tag creation](#gate-on-manual-approval-step-4-the-gate-is-on-tag-creation)
- [Verify provenance (Step 5): a gap, not a check](#verify-provenance-step-5-a-gap-not-a-check)
- [Describe and sign what the release attaches (Step 6)](#describe-and-sign-what-the-release-attaches-step-6)
- [Registering a package for the first time](#registering-a-package-for-the-first-time)

## Gather facts (Step 1)

Read `composer.json`. Its `name` field is the `vendor/project` identity, and Packagist treats that name as immutable once the package is registered, so a rename is a new package rather than an edit. Get the owner and repository from the `support.source` or `homepage` entry, falling back to `git remote get-url origin`.

A library's `composer.json` should carry no `version` field: the tag is the version, and a hardcoded one goes stale the moment a tag disagrees with it. If the repository has one, say so, because the version check every other ecosystem runs in CI has nothing to compare against here otherwise.

Check whether the package is registered by opening its page at `https://packagist.org/packages/<vendor>/<project>`. Look at that page for the auto-update warning Packagist shows when no hook is set: that warning is the observable evidence R-PUB-07's `Check:` names, and it is the difference between a package updated on every push and one crawled weekly.

## Configure trusted publishing (Step 2)

There is no OIDC exchange and no publish token here, so what this step configures is the link that tells Packagist a new tag exists. R-PUB-07 asks that the link be a forge-side integration the registry itself configures, with no registry API token in CI secrets or in any workflow file. The two forges answer that very differently.

### GitHub

Take the tokenless path, which is the one Packagist recommends. Log in to Packagist via GitHub, grant the Packagist application access to the organizations you publish from, and Packagist installs the hook itself. Nothing is stored on the forge and nothing is stored in CI, so there is no credential to leak, rotate, or scope. A package that has gone stale is fixed by triggering a manual account sync from the Packagist profile rather than by touching the repository.

The manual fallback, for a repository the application cannot cover, is a repository webhook with payload URL `https://packagist.org/api/github?username=<packagist username>`, the Packagist API token as the webhook secret, and push events only. That puts a real token in a forge setting. It is still not a CI variable, so no workflow can read it, which is the distinction R-PUB-07 keys on; prefer the application path anyway, because it stores nothing at all.

### GitLab

There is no tokenless option on GitLab. Configure the integration at the project's Settings, Integrations, Packagist, which requires the Packagist username and API token. GitLab's own integration model declares both as required, and it types the token as a password, so it is write-only in the interface once saved.

Keep the token there and nowhere else. A token in a project integration setting is not readable by a CI job; the same token in a CI/CD variable is readable by every job in the project, which is the exact failure R-PUB-07 exists to catch. Do not add a `curl` step to a pipeline that calls the update endpoint with a masked variable and call it equivalent.

Note that GitLab's rendered documentation page for this integration no longer exists, so the requirement above is confirmed against the integration model in GitLab's source rather than against a docs page. Re-read it before writing this section, and report the GitLab half as met by placement rather than by absence of a credential, because a credential does exist here.

## Write the hardened release workflow (Step 3)

There is no publish job to harden, because no job publishes anything. The workflow's job is to make the tag safe to create, since the tag is what ships:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    container: php:<the version composer.json requires>-cli  # pin by digest once chosen
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - run: composer validate --strict
      - run: composer install --no-interaction --no-progress
      - run: composer run test  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)
```

GitHub-hosted runners ship a PHP release, and most PHP projects reach for a third-party setup action instead so they can choose the version. This reference names none, because it would be naming a third-party action that runs before the project's own code; a container image the project pins by digest gets the same version control with nothing extra to vet. `oss-ci` decides which of the two the project uses. `composer validate --strict` is what catches a malformed or stale `composer.json` before a tag freezes it.

The release is a tag and a push. Nothing else runs:

```bash
git tag v1.2.3
git push origin v1.2.3
```

Packagist notices it through the hook configured in Step 2, on that push. Without a hook, the package is crawled weekly instead, and a release therefore appears on a schedule nobody chose. The documented manual trigger is a `POST` to `https://packagist.org/api/update-package?username=<username>&apiToken=<token>`; treat it as a one-off repair run by a person, not as a pipeline step, because putting it in a pipeline is what puts the token in CI.

Never move or delete a released tag. Composer resolves a version to a tag, so repointing one changes what every later `composer install` fetches while the version number stays put. R-SEC-13 is the rule and `oss-harden` configures it.

## Gate on manual approval (Step 4): the gate is on tag creation

R-PUB-04 is not applicable on the tag-published track. There is no run between building and public availability to approve, because there is no build and no upload: the tag becomes installable as soon as Packagist reads it.

R-SEC-13's tag-creation clause is the control that remains. Restrict `refs/tags/*` on GitHub with a repository ruleset that blocks tag update and deletion and restricts creation to named principals, or on GitLab with protected tags covering the release tag pattern. `oss-harden` writes both. Report R-PUB-04 as not applicable with R-SEC-13 named as what stands in its place, rather than reporting a gate that does not exist.

## Verify provenance (Step 5): a gap, not a check

Packagist serves no build provenance and no signature. Its own description of itself covers registration, hooks, and crawling; it names no attestation, no signing, and nothing a consumer can verify a downloaded package against beyond what the forge already served. There is also no build to attest: what a consumer installs is the repository contents at the tag, assembled by Composer.

Source: [Packagist, About](https://packagist.org/about).

The strongest available substitute is a signed tag. The tag is the release, so signing it is the only thing that binds a version to an identity, and a consumer can check it directly against the repository. That is R-SEC-05 and `oss-harden` owns it. A forge attestation has nothing to cover here, because no artifact is produced.

This sits below R-PUB-03, which asks for provenance tied to the exact published artifact and the workflow that built it. Report it as unmet with the registry limitation named. It would retire the day Packagist served an attestation or a signature for a version, and not before, since a signed tag proves who tagged the commit and not what any intermediary served.

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. A library installed from Packagist attaches nothing, and the source archives the forge generates for a tag are not built assets, so most packages go straight to Step 7. The case this section covers is a project that also ships a PHP archive or a compiled binary on the forge release.

This reference names no SBOM generator for PHP. The ones in common use are third-party tools rather than part of Composer, and a tool that reads the dependency tree inside a release workflow is one the maintainer vets before it goes there. `composer.lock` is the closest thing the project already has, and it is neither SPDX nor CycloneDX, so publishing it does not satisfy R-PUB-05's format requirement; say that rather than presenting the lockfile as a bill of materials.

Two rules apply here and they ask for different things. R-PUB-05 wants that inventory. R-PUB-06 wants the assets signed, or listed by hash in a signed manifest. A manifest of hashes answers the second and nothing about the first, so do not report R-PUB-05 as met by publishing one.

What answers R-PUB-05 without a generator, on GitHub, is the forge's own export of the repository's dependency graph, which is already SPDX and needs nothing installed. The `gh api` step below writes it into `dist/`, so it ships as a release asset for R-PUB-05 and is listed in `SHA256SUMS` and attested alongside the assets for R-PUB-06:

```yaml
  release:
    runs-on: ubuntu-latest
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

State both of the export's limits to the maintainer rather than leaving them to be discovered. It is GitHub only, so a GitLab project keeps this gap and R-PUB-05 stays unmet there with the reason named. And it covers the repository's declared dependency graph rather than what is inside the asset, which is exact for a PHP package, because it bundles no dependencies and a consumer resolves them from those same declarations. The graph resolves past the direct dependencies only where `composer.lock` is committed, which R-SEC-08 already requires. Read the output back once with `gh api repos/<owner>/<repo>/dependency-graph/sbom --jq '.sbom.packages | length'` before reporting the rule met: a graph the forge does not parse for this ecosystem returns a near-empty package list rather than an error.

`sha256sum` runs from inside `dist/` so the names it writes are the names the assets carry on the release. `subject-checksums` makes every file in the manifest a subject of the attestation in its own right, by name and digest; attesting `SHA256SUMS` itself with `subject-path` would leave a consumer able to verify the manifest and nothing about the assets it lists.

A consumer verifies an asset, then checks the rest of the download against the manifest:

```bash
gh attestation verify <asset> --repo <owner>/<repo>
sha256sum -c SHA256SUMS
```

Run the first command against each asset downloaded, never against `SHA256SUMS`, which is a subject of nothing. On GitLab CI/CD the forge attestation above is unavailable, so a GitLab release can carry the same `SHA256SUMS` with nothing signing it; say that rather than presenting the file as provenance.

The four grants above are copied exactly, on this job only, and the workflow's top-level block stays `contents: read`. Narrowing anything else, pinning each `uses:` to a commit SHA, and auditing the result are `oss-harden`'s.

## Registering a package for the first time

Submit the repository URL at `https://packagist.org/packages/submit`, logged in. Packagist reads `composer.json` from the default branch for the name and reads the existing tags for versions, so a repository that already has release tags arrives with its history rather than starting at the next one. Confirm the `vendor/project` name is the one intended before submitting, because it cannot be changed afterwards. Configure the hook from Step 2 immediately, since a package registered without one is crawled weekly and looks broken to the first person who tags a release and waits.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-07-31 against [Packagist, About](https://packagist.org/about) and GitLab's Packagist integration model at [gitlab-org/gitlab, app/models/integrations/packagist.rb](https://gitlab.com/gitlab-org/gitlab/-/blob/master/app/models/integrations/packagist.rb), which is where the username and token requirement is readable now that GitLab's rendered page for the integration is gone.
