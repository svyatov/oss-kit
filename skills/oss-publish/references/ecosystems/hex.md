# Hex

Concrete flow for the decisions `SKILL.md` makes, for a package published to hex.pm. Hex documents no OIDC flow and no trusted publishing: CI authenticates with a `HEX_API_KEY` in an environment variable and nothing else. What Hex does offer, and what makes it different from Maven Central's account-scoped token, is a key that can be scoped to a single package. R-PUB-02's own clause admits that as below the bar but permitted, and this file's Step 2 is how to get there.

Two Hex behaviours shape the workflow. `mix hex.publish` builds the tarball it uploads, so build and publish cannot be split across jobs the way they are for npm or RubyGems. And a published version can be replaced for one hour, after which it is fixed.

Read Step 2 before running any command hex.pm's publishing guide gives for CI. That guide's key-generation command was removed from the Hex client in 2026 and the guide still carries it, so it is the one place in this file where the registry's own documentation is not the source to follow.

Source: [Hex, Publishing a package](https://hex.pm/docs/publish), [Hex docs, mix hex.publish](https://hex.hexdocs.pm/Mix.Tasks.Hex.Publish.html), and [hexpm/hex, CHANGELOG](https://github.com/hexpm/hex/blob/main/CHANGELOG.md).

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

Hex has no OIDC flow, no trusted publishing, and no equivalent under another name. What CI authenticates with is a stored key in the `HEX_API_KEY` environment variable. This is the checked negative R-PUB-02's clause was written for, so report it as a registry limitation and not as an unconfigured feature.

**Do not take the CI section of hex.pm's publishing guide at face value.** It documents `mix hex.user key generate --key-name ... --permission ...`, and that command no longer exists. Hex 2.4.0, released 2026-03-14, replaced password based authentication with an OAuth device flow, and the `key` subcommand went with it. On Hex 2.5.1 the task's source declares `@switches []` and accepts three subcommands only, `whoami`, `auth`, and `deauth`, so every invocation the guide gives fails with `--key-name : Unknown option`. Upstream's own `hex.organization` documentation still refers to "the `hex.user key` commands" in passing, which is the same staleness in a second place. `HEX_API_KEY` itself is unaffected: the client still reads it, as `api_key` in `lib/hex/state.ex`, so a stored key remains how CI authenticates and only the way one is created has moved.

Reported upstream as [hexpm/hexpm#1787](https://github.com/hexpm/hexpm/issues/1787), with the documentation fix in [hexpm/hexpm#1788](https://github.com/hexpm/hexpm/pull/1788). Where those have merged, the guide and this section agree again; where they have not, this section is the current one.

Generate the key in the browser, at `https://hex.pm/dashboard/keys`. The form asks for a name, an expiry, and a set of permissions, and it re-prompts for authentication before it will create one. Set the expiry from the presets, 7, 30, 60, 90, or 365 days, or a custom date, to the shortest value that fits the release cadence, and plan to rotate on that schedule. For permissions, do not tick the whole-API box: that reaches every package the account owns. Tick the single package under Packages instead, which the form lists from the packages the account owns and which records a `package` permission scoped to that name.

A package-scoped key is what the fallback asks for, because hex.pm's release endpoint authorizes publishing on the `api:write` and `package` domains together with a package-owner check, so such a key publishes that one package and nothing else.

Two consequences worth telling the maintainer. The form lists only packages the account already owns, so the very first publish of a brand new package needs a broader key or an interactive `mix hex.publish` from the maintainer's own machine. And a repository publishing several packages needs one key per package, or it is back to an account-wide key.

Do not reach for the OAuth token that `mix hex.user auth` writes into `~/.hex/hex.config` as a substitute. No upstream source documents extracting it for CI, it belongs to an interactive session that Hex refreshes and can invalidate, and treating an undocumented on-disk credential as a publishing token is exactly the improvisation this reference exists to prevent.

An organization publishing to its own repository takes a different command, and that one is current: `mix hex.organization key ORGANIZATION generate [--key-name KEY_NAME] [--permission PERMISSION]` still exists and still parses those flags. It defaults to `repository:ORGANIZATION`, which is read-only access to the organization's repository, so name the permission the publish actually needs rather than accepting the default.

Store the key as a GitHub Actions secret bound to the approval environment from Step 4, not as a repository secret, so it is unreadable by any workflow run that has not been approved. On GitLab CI/CD, store it as a variable that is masked, protected, and scoped to the protected environment.

This sits below R-PUB-02's bar, because a scoped, long-lived key is still a credential that can leak, where an OIDC exchange stores nothing at all. It stays below it while Hex documents no OIDC flow, and it retires the day one ships. [hexpm/hexpm#1785](https://github.com/hexpm/hexpm/pull/1785), "feat: trusted publisher", is open and is the change to watch: it would move Hex onto the same track as npm and PyPI and make this whole section a fallback of last resort. Re-read the Hex client changelog and that pull request before each release process is written rather than treating the absence as settled.

## Write the hardened release workflow (Step 3)

`mix hex.publish` builds the tarball as part of publishing. There is no equivalent of `npm pack` handing a finished artifact to a credentialed job that does nothing else, so build, package, and publish collapse into the one job that holds the key. That collapse is the security problem this section has to answer, and it cannot be removed, only bounded.

The exposure is specific to Elixir rather than generic. `mix` runs dependency code at compile time through macros, so a job that holds a long-lived Hex key while compiling the dependency tree hands that key's reach to every transitive dependency in it. Hex has no OIDC to shorten the key's life, so a dependency that reads the environment during compilation reads a credential that is valid until somebody revokes it. Treat that as a known residual and say so to the maintainer, rather than presenting the workflow below as a solved problem.

Four controls bound it, and all four are already in this skill's vocabulary:

- A job that does nothing but publish. No tests, no linting, no documentation build, no release-notes step. Those belong in the uncredentialed job above it.
- `mix deps.get --check-locked` against a committed `mix.lock`, so the tree compiled in the credentialed job is the exact tree CI already compiled and tested without a key. R-SEC-08 is the rule, and its `Check:` asks for the frozen mode rather than the plain install, so a bare `mix deps.get` in a workflow this skill writes fails a rule the kit owns and an audit run afterwards will score it. `oss-harden` owns the lockfile itself.
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
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: erlef/setup-beam@v1
        with:
          version-file: .tool-versions
          version-type: strict
      - run: mix deps.get --check-locked
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

Two rules apply here and they ask for different things. R-PUB-05 wants that inventory. R-PUB-06 wants the assets signed, or listed by hash in a signed manifest. A manifest of hashes answers the second and nothing about the first, so do not report R-PUB-05 as met by publishing one.

What answers R-PUB-05 without a generator, on GitHub, is the forge's own export of the repository's dependency graph, which is already SPDX and needs nothing installed and, in particular, nothing added to the credentialed job. The `gh api` step below writes it into `dist/`, so it ships as a release asset for R-PUB-05 and is listed in `SHA256SUMS` and attested alongside the assets for R-PUB-06, in a job after the publish so everything stays behind the approval gate:

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

State both of the export's limits to the maintainer rather than leaving them to be discovered. It is GitHub only, so a GitLab project keeps this gap and R-PUB-05 stays unmet there with the reason named. And it covers the repository's declared dependency graph rather than what is inside the asset, which is close for a compiled release, because it is assembled from the applications in that same graph, and silent about the Erlang and Elixir runtime bundled beside them. The graph resolves past the direct dependencies only where `mix.lock` is committed, which R-SEC-08 already requires. Read the output back once with `gh api repos/<owner>/<repo>/dependency-graph/sbom --jq '.sbom.packages | length'` before reporting the rule met: a graph the forge does not parse for this ecosystem returns a near-empty package list rather than an error.

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

Step 2 is deliberately not verified against [Hex, Publishing a package](https://hex.pm/docs/publish), because that page is the document that is wrong. It is verified against the client and the hex.pm source instead.

Verified 2026-07-31 against the 2.4.0 entry in [hexpm/hex, CHANGELOG](https://github.com/hexpm/hex/blob/main/CHANGELOG.md), recording the OAuth device flow that replaced password authentication; [hexpm/hex, lib/mix/tasks/hex.user.ex](https://github.com/hexpm/hex/blob/main/lib/mix/tasks/hex.user.ex), which declares `@switches []` and dispatches `whoami`, `auth`, and `deauth` alone; [hexpm/hex, lib/hex/state.ex](https://github.com/hexpm/hex/blob/main/lib/hex/state.ex), which still reads `HEX_API_KEY`; [hexpm/hex, lib/mix/tasks/hex.organization.ex](https://github.com/hexpm/hex/blob/main/lib/mix/tasks/hex.organization.ex), which still documents `key ORGANIZATION generate` with `--key-name` and `--permission` and defaults to `repository:ORGANIZATION`; [hexpm/hexpm, lib/hexpm_web/controllers/dashboard/key_controller.ex](https://github.com/hexpm/hexpm/blob/main/lib/hexpm_web/controllers/dashboard/key_controller.ex), whose `create` action is routed at `/dashboard/keys`, whose `munge_expiry` accepts 7, 30, 60, 90, and 365 days or a custom date, and whose `munge_permissions` accepts a `package` domain per owned package; [Hex docs, mix hex.publish](https://hex.hexdocs.pm/Mix.Tasks.Hex.Publish.html); [Hex docs, mix hex.build](https://hex.hexdocs.pm/Mix.Tasks.Hex.Build.html); the package-domain validation in [hexpm/hexpm, lib/hexpm/accounts/key_permission.ex](https://github.com/hexpm/hexpm/blob/main/lib/hexpm/accounts/key_permission.ex); the authorization plug in [hexpm/hexpm, lib/hexpm_web/controllers/api/release_controller.ex](https://github.com/hexpm/hexpm/blob/main/lib/hexpm_web/controllers/api/release_controller.ex); and the `checksum` field returned by `https://hex.pm/api/packages/<name>/releases/<version>`.
