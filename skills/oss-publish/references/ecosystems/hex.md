# Hex

Concrete flow for the decisions `SKILL.md` makes, for a package published to hex.pm. Hex documents no OIDC flow and no trusted publishing: its publishing guide names exactly one CI path, a `HEX_API_KEY` in an environment variable. What Hex does offer, and what makes it different from Maven Central's account-scoped token, is a key that can be scoped to a single package. R-PUB-02's own clause admits that as below the bar but permitted, and this file's Step 2 is how to get there.

Two Hex behaviours shape the workflow. `mix hex.publish` builds the tarball it uploads, so build and publish cannot be split across jobs the way they are for npm or RubyGems. And a published version can be replaced for one hour, after which it is fixed.

Source: [Hex, Publishing a package](https://hex.pm/docs/publish) and [Hex docs, mix hex.publish](https://hex.hexdocs.pm/Mix.Tasks.Hex.Publish.html).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2): a scoped key, not a check](#configure-trusted-publishing-step-2-a-scoped-key-not-a-check)
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

## Configure trusted publishing (Step 2): a scoped key, not a check

Hex has no OIDC flow, no trusted publishing, and no equivalent under another name. Read the publishing guide before reporting that: its CI section documents `mix hex.user key generate` and a `HEX_API_KEY` environment variable, and nothing else. This is the checked negative R-PUB-02's clause was written for, so report it as a registry limitation and not as an unconfigured feature.

Source: [Hex, Publishing a package](https://hex.pm/docs/publish).

The strongest documented credential is a key scoped to one package. The guide's own example is broader than it needs to be:

```bash
mix hex.user key generate --key-name publish-ci --permission api:write
```

`api:write` reaches every package the account owns. Narrow it instead. The permission flag takes a `domain:resource` pair and passes both through to hex.pm, and the `package` domain takes a package name as its resource:

```bash
mix hex.user key generate --key-name publish-ci --permission package:<name>
```

hex.pm normalizes a bare name to `hexpm/<name>`, checks that the account actually owns that package before issuing the key, and its release endpoint authorizes publishing on the `api:write` and `package` domains together with a package-owner check. So a key generated that way publishes that one package and nothing else, which is what the fallback asks for.

Two consequences worth telling the maintainer. The package must already exist and be owned by the account before a package-scoped key can be created, so the very first publish of a brand new package needs a broader key or an interactive `mix hex.publish` from the maintainer's own machine. And a repository publishing several packages needs one key per package, or it is back to an account-wide key.

Store the key as a GitHub Actions secret bound to the approval environment from Step 4, not as a repository secret, so it is unreadable by any workflow run that has not been approved. On GitLab CI/CD, store it as a variable that is masked, protected, and scoped to the protected environment.

This sits below R-PUB-02's bar, because a scoped, long-lived key is still a credential that can leak, where an OIDC exchange stores nothing at all. It stays below it while Hex documents no OIDC flow, and it retires the day one ships. Re-read the publishing guide and the Hex client changelog before each release process is written rather than treating the absence as settled.

## Write the hardened release workflow (Step 3)

`mix hex.publish` builds the tarball as part of publishing. There is no equivalent of `npm pack` handing a finished artifact to a credentialed job that does nothing else, so build, package, and publish collapse into the one job that holds the key. That collapse is the security problem this section has to answer, and it cannot be removed, only bounded.

The exposure is specific to Elixir rather than generic. `mix` runs dependency code at compile time through macros, so a job that holds a long-lived Hex key while compiling the dependency tree hands that key's reach to every transitive dependency in it. Hex has no OIDC to shorten the key's life, so a dependency that reads the environment during compilation reads a credential that is valid until somebody revokes it. Treat that as a known residual and say so to the maintainer, rather than presenting the workflow below as a solved problem.

Four controls bound it, and all four are already in this skill's vocabulary:

- A job that does nothing but publish. No tests, no linting, no documentation build, no release-notes step. Those belong in the uncredentialed job above it.
- `mix deps.get` against a committed `mix.lock`, so the tree compiled in the credentialed job is the exact tree CI already compiled and tested without a key. R-SEC-08 is the rule and `oss-harden` owns the lockfile itself.
- The key scoped as narrowly as Hex permits, per Step 2, so what a compromised dependency gets is publish rights on one package rather than on the account.
- The key held in an environment gated by R-PUB-04's approval, so it is not available to every workflow run.

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
      - run: mix deps.get
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
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: erlef/setup-beam@v1
        with:
          version-file: .tool-versions
          version-type: strict
      - run: mix deps.get
      - run: mix hex.publish --yes
        env:
          HEX_API_KEY: ${{ secrets.HEX_API_KEY }}
```

The version check is a file test rather than a property query, because `mix hex.build` names its output `<app>-<version>.tar` from the project configuration: if the tag and `mix.exs` disagree, the expected file is simply not there. Replace `<name>` with the package name from Step 1 and adapt the `v` prefix strip to the repository's actual tag format. `--dry-run` builds the package and runs the local checks without publishing, which is what moves every failure that is not the upload itself into the job with no key. `--yes` publishes without the confirmation prompts, which a non-interactive job cannot answer.

`mix hex.publish` also builds and publishes documentation by running `mix docs`, so the credentialed job runs the documentation toolchain too unless the project splits the two. `mix hex.publish package` publishes the package alone and `mix hex.publish docs` the documentation alone; splitting them lets the docs build run in an uncredentialed job and keeps the credentialed one to the package upload. Offer that split rather than assuming it, because it costs a second key or a second approval.

`oss-harden` pins every `uses:` line above to a commit SHA and sets the test job's minimal permissions. Cache nothing in either job: a restored build cache in a job that compiles dependencies and holds a publish key is the worst version of the exposure this section is about. On GitLab CI/CD the same two jobs apply, with `HEX_API_KEY` as a masked and protected variable and the publish job behind a protected environment with approval rules.

If an existing workflow reads an account-wide `HEX_API_KEY` from repository secrets, replace it with the scoped key from Step 2 and tell the user to revoke the old one from the account's key list on hex.pm once the new flow is verified.

## Gate on manual approval (Step 4)

Pin the publish job to `environment: release` as above, and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers naming at least one person other than an automation account, and with `HEX_API_KEY` as an environment secret rather than a repository secret. Required reviewers work for public repositories on current GitHub plans; private or internal repositories need GitHub Enterprise Cloud. On GitLab Premium or Ultimate, use a protected environment with approval rules.

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

The gate carries more weight here than in most of this directory, because it is also what keeps the long-lived key out of unapproved runs. An environment secret behind required reviewers is the difference between a key any workflow run can read and one only an approved release job can.

## Verify provenance (Step 5): a gap, not a check

hex.pm serves no build provenance. There is no attestation object, no signature on a published tarball, and nothing comparable to npm's `npm audit signatures` or PyPI's Integrity API. The Hex client changelog through `v2.5.2-dev` mentions no OIDC, trusted publishing, attestation, provenance, or Sigstore work at all, so read both before reporting, and treat the absence as current rather than as something nobody looked for.

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

This sits below R-PUB-03, which asks for provenance tied to the exact published artifact and the workflow that built it. Report it as unmet with the registry limitation named. It retires the day hex.pm serves an attestation for a published release.

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. Publishing to hex.pm attaches nothing to the forge, and the source archives the forge generates for a tag are not built assets, so a library that only publishes goes to Step 7 instead. What this section covers is a project that also attaches a compiled release or an escript.

This reference names no SBOM generator for Elixir. The ones in common use are third-party Mix tasks rather than part of the toolchain, and a task that reads the dependency tree inside the release workflow is one the maintainer vets before it goes there. `mix.lock` is the closest thing the project already has, and it is neither SPDX nor CycloneDX, so publishing it does not satisfy R-PUB-05's format requirement; say that rather than presenting the lockfile as a bill of materials.

Until a generator is vetted, publish the hashes of what the release attaches and sign those, in a job after the publish so the assets stay behind the approval gate:

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
          name: build
          path: dist/
      - run: (cd dist && sha256sum *) > SHA256SUMS
      - uses: actions/attest@v4
        with:
          subject-checksums: SHA256SUMS
      - run: gh release upload "$GITHUB_REF_NAME" dist/* SHA256SUMS
        env:
          GH_TOKEN: ${{ github.token }}
```

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

Verified 2026-07-31 against [Hex, Publishing a package](https://hex.pm/docs/publish), [Hex docs, mix hex.publish](https://hex.hexdocs.pm/Mix.Tasks.Hex.Publish.html), [Hex docs, mix hex.build](https://hex.hexdocs.pm/Mix.Tasks.Hex.Build.html), [hexpm/hex, CHANGELOG](https://github.com/hexpm/hex/blob/main/CHANGELOG.md), the permission parsing in [hexpm/hex, lib/mix/tasks/hex.ex](https://github.com/hexpm/hex/blob/main/lib/mix/tasks/hex.ex), the package-domain validation in [hexpm/hexpm, lib/hexpm/accounts/key_permission.ex](https://github.com/hexpm/hexpm/blob/main/lib/hexpm/accounts/key_permission.ex), the authorization plug in [hexpm/hexpm, lib/hexpm_web/controllers/api/release_controller.ex](https://github.com/hexpm/hexpm/blob/main/lib/hexpm_web/controllers/api/release_controller.ex), and the `checksum` field returned by `https://hex.pm/api/packages/<name>/releases/<version>`.
