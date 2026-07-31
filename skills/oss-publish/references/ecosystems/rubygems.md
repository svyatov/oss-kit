# RubyGems

Concrete flow for the decisions `SKILL.md` makes, for a gem published to rubygems.org. RubyGems documents one OIDC provider for trusted publishing: GitHub Actions. There is no staged-publishing equivalent to npm's; the approval gate in Step 4 is entirely the forge environment.

Source: [RubyGems Guides, Trusted Publishing](https://github.com/rubygems/guides/blob/main/trusted-publishing.md).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2)](#configure-trusted-publishing-step-2)
  - [GitHub Actions](#github-actions)
  - [GitLab CI/CD: no supported flow](#gitlab-cicd-no-supported-flow)
- [Write the hardened release workflow (Step 3)](#write-the-hardened-release-workflow-step-3)
- [Gate on manual approval (Step 4)](#gate-on-manual-approval-step-4)
- [Verify provenance (Step 5)](#verify-provenance-step-5)
- [Describe and sign what the release attaches (Step 6)](#describe-and-sign-what-the-release-attaches-step-6)
- [Not yet published gems](#not-yet-published-gems)
- [Multi-gem repositories](#multi-gem-repositories)

## Gather facts (Step 1)

Read every `*.gemspec` in the repository; a repository with more than one needs one trusted publisher per gem. Get the owner and repository from the gemspec's `metadata["source_code_uri"]` or `homepage_uri`, falling back to `git remote get-url origin`. Check whether each gem is already published with `curl -s -o /dev/null -w '%{http_code}' https://rubygems.org/api/v1/gems/<name>.json`; a `404` means it is not, and [Not yet published gems](#not-yet-published-gems) below covers that case.

## Configure trusted publishing (Step 2)

Only one of the two sections below is a flow. RubyGems supports GitHub Actions and names no GitLab provider, so a GitLab project takes the fallback rather than a shorter version of the same setup.

### GitHub Actions

On rubygems.org, open `https://rubygems.org/gems/<name>/trusted_publishers/new` for each gem, logged in as an owner, and enter:

- Repository owner: the owner from Step 1
- Repository name: the repository name from Step 1
- Workflow filename: the publish workflow's filename only, for example `publish.yml`
- Environment: the approval environment name from `SKILL.md` Step 4, for example `release`

Leaving Environment empty means RubyGems mints a token for any run of that workflow, approved or not; it is the field that makes the approval gate load-bearing, not optional.

In the workflow, the publish job needs:

```yaml
permissions:
  contents: read
  id-token: write
```

No `RUBYGEMS_API_KEY` or any other registry secret is needed once the trusted publisher above is configured; the `rubygems/configure-rubygems-credentials` action or the `rubygems/release-gem` action exchanges the workflow's OIDC token for a publish token.

### GitLab CI/CD: no supported flow

RubyGems' own guide names GitHub Actions as the OIDC identity provider throughout and does not mention GitLab CI/CD anywhere. Read that guide before writing this section, and treat GitLab CI/CD as unsupported unless it names GitLab as a provider. An open discussion or a draft pull request is not a shipped provider.

Source: [rubygems/rubygems.org discussion #4845, "trusted publishing with gitlab CI"](https://github.com/rubygems/rubygems.org/discussions/4845).

Where the guide names no GitLab provider, this is the strongest alternative:

Create a scoped API key at `https://rubygems.org/profile/api_keys/new`, restricted to the `Push rubygem` scope for this one gem only. The expiry field is a free datetime picker with a minimum of five minutes from the current time, not a list of preset durations; set it to the shortest value that still fits the release cadence. rubygems.org does not let the expiry be edited after creation, so plan to rotate it on that schedule. Store it as a GitLab CI/CD variable that is both masked and protected, so it is redacted from job logs and only available to pipelines running on a protected branch or tag. Put the publish job behind a GitLab protected environment with required approvers, the same gate Step 4 uses elsewhere, so the key's mere presence in the pipeline is not enough to publish. Sign the built gem: `gem push --attestation` needs the same OIDC token trusted publishing supplies, which is unavailable here, so use the older certificate-based signing instead, with `gem cert --build <email>` to create a signing key and `spec.signing_key` and `spec.cert_chain` in the gemspec to sign every build.

This is below the bar R-PUB-02 sets, because a scoped, expiring key is still a credential that can leak, unlike a trusted publishing flow where nothing is ever stored; take it only while the guide names no GitLab provider, and re-read the guide before each release process is written.

## Write the hardened release workflow (Step 3)

The publish job installs no Gemfile dependencies and uses no Bundler cache anywhere in the workflow, including the test job: a restored cache is a cache-poisoning vector in a tag-triggered publishing workflow, and releases are rare enough that the lost cache costs nothing.

Write the separated workflow below by default. Build the gem in one job, pass the `.gem` file across as an artifact, and sign it explicitly in the publish job with the same tool `release-gem` calls under the hood:

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
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: .ruby-version
          bundler-cache: false
      - run: bundle install
      - run: bundle exec rake test  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: .ruby-version
          bundler-cache: false
      - run: ruby -e 'spec = Gem::Specification.load("path/to/name.gemspec"); abort unless ENV.fetch("GITHUB_REF_NAME").delete_prefix("v") == spec.version.to_s'
      - run: mkdir -p pkg && gem build path/to/name.gemspec --output pkg/package.gem
      - uses: actions/upload-artifact@v7
        with:
          name: built-gem
          path: pkg/package.gem
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
          name: built-gem
          path: pkg/
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '<exact project Ruby version>'
          bundler-cache: false
      - uses: rubygems/configure-rubygems-credentials@main  # oss-harden pins this to a commit SHA
      - run: gem exec --conservative sigstore-cli:0.2.3 sign pkg/package.gem --bundle pkg/package.gem.sigstore.json
      - run: gem push pkg/package.gem --attestation pkg/package.gem.sigstore.json
```

Replace the gemspec path and Ruby version from the repository. Adapt the version comparison to the actual tag format. Use one explicit gemspec per build and publish job; never let a glob choose among multiple gems.

`oss-harden` pins every `uses:` line above to a commit SHA and sets this workflow's `permissions:`, including the `contents: read` this skill left off the test and build jobs above; do not pin them or add permissions here. `configure-rubygems-credentials` documents `@main` and recommends a commit SHA; resolve that SHA directly from its repository. Resolve the `sigstore-cli` version from the Sigstore repository and from what `release-gem` pins, and use that rather than the one written above.

If an existing workflow uses `secrets.RUBYGEMS_API_KEY` or `GEM_HOST_API_KEY`, remove it from the YAML now and tell the user to delete the corresponding secret once the new flow is verified.

RubyGems officially recommends `rubygems/release-gem@v1` instead, which is the escape hatch where the smaller diff matters more than job separation. It runs `bundle exec rake release`, signs with `sigstore-cli`, and pushes the release tag, so it needs `contents: write` and runs the project's full bundle in the credentialed job. Offer it only with that exposure named.

## Gate on manual approval (Step 4)

Pin the publish job to `environment: release` as above, and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers naming at least one person other than an automation account. Required reviewers work for public repositories on current GitHub plans; private or internal repositories need GitHub Enterprise Cloud. RubyGems has no registry-side approval fallback, so report R-PUB-04 as unmet when the repository plan provides no native gate. Require account-level MFA at UI and API level, at `https://rubygems.org/settings/edit`, and add to every gemspec:

```ruby
spec.metadata["rubygems_mfa_required"] = "true"
```

## Verify provenance (Step 5)

The explicit `sigstore-cli` step signs the exact `.gem` downloaded from the build job using the workflow's ambient OIDC identity. `gem push --attestation` uploads that bundle with the same file. Do not rely on implicit signing behavior that varies by RubyGems client version. After the first release, verify the registry record:

```bash
curl -s https://rubygems.org/api/v1/attestations/<name>-<version>.json
```

A non-empty JSON array confirms RubyGems.org serves an attestation for that exact name and version. An empty array is a failed provenance check.

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. The gem this workflow pushes is signed with `sigstore-cli` and pushed with `--attestation` in Step 3, and rubygems.org serves that attestation back, so the gem itself is covered. The source archives GitHub generates for a tag are not built assets. A release that attaches nothing beside the gem goes to Step 7 instead.

This reference names no SBOM generator for Ruby. The ones in common use are third-party tools rather than part of the packaging toolchain, and a tool that reads the dependency tree inside the release workflow is one the maintainer vets before it goes there. Until one is vetted, publish the hashes of what the release attaches and sign those, which needs nothing the runner does not already ship:

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
          name: built-gem
          path: pkg/
      - run: (cd pkg && sha256sum *) > SHA256SUMS
      - uses: actions/attest@v4
        with:
          subject-checksums: SHA256SUMS
      - run: gh release upload "$GITHUB_REF_NAME" pkg/* SHA256SUMS
        env:
          GH_TOKEN: ${{ github.token }}
```

`sha256sum` runs from inside `pkg/` so the names it writes are the names the assets carry on the release. A manifest listing `pkg/package.gem` cannot be checked against a downloaded `package.gem`.

`subject-checksums` makes every file listed in `SHA256SUMS` a subject of the attestation in its own right, by name and digest, and it takes the format `sha256sum` writes. Attesting `SHA256SUMS` itself with `subject-path` instead would leave a consumer able to verify the manifest and nothing about the assets it lists.

A consumer verifies an asset, then checks the rest of the download against the manifest:

```bash
gh attestation verify <asset> --repo <owner>/<repo>
sha256sum -c SHA256SUMS
```

Run the first command against each asset downloaded, never against `SHA256SUMS`, which is a subject of nothing. It proves that this workflow in this repository produced those exact bytes, and it prints the signing workflow it accepted; `--signer-workflow <owner>/<repo>/.github/workflows/release.yml` pins that, so an attestation from any other workflow in the repository fails. The second command is what a consumer without `gh` has. It proves the files match a list published beside them, and nothing about who produced either. These verify the forge release's copy; the gem installed from rubygems.org is verified through the registry record in Step 5.

`gh release upload` fails when no release exists for the tag. Either create it in this job with `gh release create "$GITHUB_REF_NAME" --generate-notes` before the upload, or have the maintainer publish the release from the tag first. This reference does not choose between them, because release notes are the project's own.

A third job is what makes the grants above safe, so copy the job boundary along with them. The build job runs `gem build` against the project's own gemspec, so giving it release-asset writes and an attestation identity is exactly the credential split Step 3 exists to enforce, and it would write assets before the approval gate. The publish job holds the rubygems.org credential. Only a separate job satisfies both, and `needs: [publish]` is what keeps the assets behind the gate.

The four grants above are copied exactly, on this job only. The workflow's top-level block stays `contents: read`. Narrowing anything else, pinning each `uses:` to a commit SHA, and auditing the result are `oss-harden`'s.

## Not yet published gems

Unlike npm, RubyGems does not require a manual first release. Create a pending trusted publisher at `https://rubygems.org/profile/oidc/pending_trusted_publishers/new`, entering the gem name plus the same owner, repository, workflow filename, and `release` environment as above. The first successful push from that workflow claims the name and converts the pending publisher into a normal one, so the very first release already goes through CI with no API key ever created. Confirm the name is actually free before creating it.

## Multi-gem repositories

Every gem needs its own trusted publisher entry pointing at the same repository and the same workflow filename; a gem left out of that list stays unprotected. One workflow can release every gem if versions move together; if gems version independently, tag them separately and match the trigger and the build job to the tag's gem name. `spec.metadata["rubygems_mfa_required"]` goes in every gemspec, not just the first one.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-07-31 against [RubyGems Guides, Trusted Publishing](https://github.com/rubygems/guides/blob/main/trusted-publishing.md), which still names GitHub Actions as the only OIDC provider and does not mention GitLab.
