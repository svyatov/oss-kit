# RubyGems

Concrete flow for the decisions `SKILL.md` makes, for a gem published to rubygems.org. RubyGems documents one OIDC provider for trusted publishing: GitHub Actions. There is no staged-publishing equivalent to npm's; the approval gate in Step 4 is entirely the forge environment.

Source: [RubyGems Guides, Trusted Publishing](https://github.com/rubygems/guides/blob/main/trusted-publishing.md).

## Gather facts (Step 1)

Read every `*.gemspec` in the repository; a repository with more than one needs one trusted publisher per gem. Get the owner and repository from the gemspec's `metadata["source_code_uri"]` or `homepage_uri`, falling back to `git remote get-url origin`. Check whether each gem is already published with `curl -s -o /dev/null -w '%{http_code}' https://rubygems.org/api/v1/gems/<name>.json`; a `404` means it is not, and [Not yet published gems](#not-yet-published-gems) below covers that case.

## Configure trusted publishing (Step 2)

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

RubyGems' own guide names GitHub Actions as the OIDC identity provider throughout and does not mention GitLab CI/CD anywhere. A GitLab-hosted gem has no trusted publishing path today. GitLab CI support has an open discussion and a draft, unmerged pull request; do not treat either as shipped, and re-check before relying on this section again.

Source: [rubygems/rubygems.org discussion #4845, "trusted publishing with gitlab CI"](https://github.com/rubygems/rubygems.org/discussions/4845).

The strongest alternative that exists today, given GitLab CI/CD is not a supported provider:

Create a scoped API key at `https://rubygems.org/profile/api_keys/new`, restricted to the `Push rubygem` scope for this one gem only. The expiry field is a free datetime picker with a minimum of five minutes from the current time, not a list of preset durations; set it to the shortest value that still fits the release cadence. rubygems.org does not let the expiry be edited after creation, so plan to rotate it on that schedule. Store it as a GitLab CI/CD variable that is both masked and protected, so it is redacted from job logs and only available to pipelines running on a protected branch or tag. Put the publish job behind a GitLab protected environment with required approvers, the same gate Step 4 uses elsewhere, so the key's mere presence in the pipeline is not enough to publish. Sign the built gem: `gem push --attestation` needs the same OIDC token trusted publishing supplies, which is unavailable here, so use the older certificate-based signing instead, with `gem cert --build <email>` to create a signing key and `spec.signing_key` and `spec.cert_chain` in the gemspec to sign every build.

This is below the bar R-REL-02 sets, because a scoped, expiring key is still a credential that can leak, unlike a trusted publishing flow where nothing is ever stored; take it only because GitLab CI/CD is not a supported provider today, and revisit it once discussion #4845 ships.

## Write the hardened release workflow (Step 3)

The publish job installs no Gemfile dependencies and uses no Bundler cache anywhere in the workflow, including the test job: a restored cache is a cache-poisoning vector in a tag-triggered publishing workflow, and releases are rare enough that the lost cache costs nothing.

The least-effort way to get a real attestation today is `rubygems/release-gem@v1`. Its `action.yml` runs `bundle exec rake release` with `RUBYOPT` pointed at a patch the action ships in the same repository, `rubygems-attestation-patch.rb`, which signs the built gem with `gem exec sigstore-cli:0.2.3 sign ... --bundle` and pushes it with that bundle attached. That is tooling released today, not RubyGems' own unreleased auto-attestation, so it works. It needs `contents: write`, since `rake release` pushes the release tag itself, and it installs the full Gemfile in the job that holds publish credentials, which this skill avoids by default; offer it as the low-effort option and let the user weigh that tradeoff rather than choosing silently.

Where job separation matters more than the smaller diff, build the gem in a separate job, pass the `.gem` file via artifact, and sign it explicitly in the publish job with the same tool `release-gem` calls under the hood:

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
      - run: mkdir -p pkg && gem build *.gemspec --output pkg/gem.gem
      - uses: actions/upload-artifact@v5
        with:
          name: built-gem
          path: pkg/gem.gem
          retention-days: 1

  publish:
    runs-on: ubuntu-latest
    needs: [test, build]
    environment: release
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/download-artifact@v6
        with:
          name: built-gem
          path: pkg/
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: ruby
          bundler-cache: false
      - uses: rubygems/configure-rubygems-credentials@main  # oss-harden pins this to a commit SHA
      - run: gem exec --conservative sigstore-cli:0.2.3 sign pkg/gem.gem --bundle pkg/gem.gem.sigstore.json
      - run: gem push pkg/gem.gem --attestation pkg/gem.gem.sigstore.json
```

`oss-harden` pins every `uses:` line above to a commit SHA and sets this workflow's `permissions:`, including the `contents: read` this skill left off the test and build jobs above; do not pin them or add permissions here. `configure-rubygems-credentials` documents `@main` itself and recommends pinning it to a commit SHA rather than a version tag; the repository has no floating major tag, only the point releases `v1.0.0`, `v2.0.0`, and `v2.1.0`, so `@main` is the only ref name stable enough to hand to `oss-harden`. `sigstore-cli` is pinned to `0.2.3`, the exact version published to rubygems.org and the one `release-gem@v1.4.0`'s own patch calls, so it needs no separate SHA pin.

If an existing workflow uses `secrets.RUBYGEMS_API_KEY` or `GEM_HOST_API_KEY`, remove it from the YAML now and tell the user to delete the corresponding secret once the new flow is verified.

## Gate on manual approval (Step 4)

Pin the publish job to `environment: release` as above, and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers naming at least one person other than an automation account. RubyGems has no staged-publishing equivalent to npm's, so this environment gate is the entire human approval step, not one layer of several; do not skip it thinking a later registry-side step will catch a mistake. Require account-level MFA at UI and API level, at `https://rubygems.org/settings/edit`, and add to every gemspec:

```ruby
spec.metadata["rubygems_mfa_required"] = "true"
```

## Verify provenance (Step 5)

Neither this job's `gem push` nor the RubyGems that `ruby/setup-ruby@v1` installs auto-attests. The code path that skips `--attestation` and signs automatically whenever the host is rubygems.org and `GITHUB_ACTIONS` is set exists only on `rubygems/rubygems`'s unreleased `master` branch, where `VERSION` is `4.1.0.dev`; the latest released tag, `v4.0.17`, does not have it, confirmed by reading `lib/rubygems/commands/push_command.rb` on both refs directly. The gem `gem update --system` installs is built from that same released source (`rubygems-update` on rubygems.org was at `4.0.17` as of this writing), so pinning a newer RubyGems inside the job does not reach this feature either; nothing shipped today reaches it from a released version.

What does work, and is what the workflow above does: `gem exec sigstore-cli:0.2.3 sign` builds a sigstore bundle using the job's own OIDC token, the same `ACTIONS_ID_TOKEN_REQUEST_TOKEN` / `ACTIONS_ID_TOKEN_REQUEST_URL` ambient-credential detection cosign and other sigstore clients use (source: `sigstore/sigstore-ruby`'s `cli/lib/sigstore/cli/id_token.rb`), gated on the `id-token: write` permission this job already has; `gem push --attestation` then reads that bundle and uploads it alongside the gem, a flag the released push command has always supported. `rubygems/release-gem@v1` runs the identical `sigstore-cli` call through its own `RUBYOPT`-injected patch instead of this explicit step. Both routes are genuine attestations, verified against the sigstore-ruby CLI source and the released RubyGems push command, not against RubyGems' own unreleased feature. If the sign step is skipped or the bundle path is wrong, `gem push --attestation` fails outright on a released RubyGems: `v4.0.17`'s attestation code path has no rescue around a missing file the way the unreleased `master` branch does, so the step, and the job, fails instead of quietly shipping without provenance. After the first release, verify the attestation with:

```bash
curl -s https://rubygems.org/api/v1/attestations/<name>-<version>.json
```

A non-empty JSON array of attestation bodies confirms the registry served it; an empty `[]` means the sign or push step failed, or Step 3 was skipped, not that provenance is optional.

## Not yet published gems

Unlike npm, RubyGems does not require a manual first release. Create a pending trusted publisher at `https://rubygems.org/profile/oidc/pending_trusted_publishers/new`, entering the gem name plus the same owner, repository, workflow filename, and `release` environment as above. The first successful push from that workflow claims the name and converts the pending publisher into a normal one, so the very first release already goes through CI with no API key ever created. Confirm the name is actually free before creating it.

## Multi-gem repositories

Every gem needs its own trusted publisher entry pointing at the same repository and the same workflow filename; a gem left out of that list stays unprotected. One workflow can release every gem if versions move together; if gems version independently, tag them separately and match the trigger and the build job to the tag's gem name. `spec.metadata["rubygems_mfa_required"]` goes in every gemspec, not just the first one.
