# Go modules

Concrete flow for the decisions `SKILL.md` makes, for a Go module. Go modules run on the tag-published track: there is no registry account, no publish endpoint, and no credential of any kind. A version is published by pushing a git tag, which `proxy.golang.org` fetches on demand the first time somebody asks for it. `STANDARD.md`'s release preamble places R-PUB-01 through R-PUB-04 outside that track as a whole, so four of the six sections below record why the step does not exist here rather than how to configure it. What stands where the approval gate would stand is R-SEC-13's restriction on who may create a tag, because on this track creating the tag is the publish.

Source: [Go, Publishing a module](https://go.dev/doc/modules/publishing), [proxy.golang.org](https://proxy.golang.org/), and [Go Modules Reference](https://go.dev/ref/mod).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2): no credential exists to configure](#configure-trusted-publishing-step-2-no-credential-exists-to-configure)
- [Write the hardened release workflow (Step 3)](#write-the-hardened-release-workflow-step-3)
- [Gate on manual approval (Step 4): the gate is on tag creation](#gate-on-manual-approval-step-4-the-gate-is-on-tag-creation)
- [Verify provenance (Step 5): a gap, not a check](#verify-provenance-step-5-a-gap-not-a-check)
- [Describe and sign what the release attaches (Step 6)](#describe-and-sign-what-the-release-attaches-step-6)
- [Withdrawing a bad version](#withdrawing-a-bad-version)

## Gather facts (Step 1)

Read `go.mod`. The `module` line is the module path and the whole of the package identity, including any major version suffix such as `/v2`; R-CHG-07 covers keeping that suffix and the released major in step, and `oss-changelog` owns it. Get the owner and repository from that path when it names the forge host directly, falling back to `git remote get-url origin`.

A module path whose host is not the repository host is served through a vanity import path, which the module reference resolves by fetching an HTML document from that host carrying `<meta name="go-import" content="root-path vcs repo-url">`. Treat that host as part of the release surface: whoever serves that document decides which repository the module resolves to, and no forge control reaches it.

Check whether a version already exists, which is also the command that prompts the index to notice a new one:

```bash
GOPROXY=proxy.golang.org go list -m <module path>@<version>
```

`@latest` in place of the version reports the newest version the index knows about. A module that has never been fetched is absent from the proxy rather than unpublished; the tag is what exists, and the proxy is a cache in front of it.

## Configure trusted publishing (Step 2): no credential exists to configure

There is nothing to configure and nothing to store. The publishing guide's whole procedure is `go mod tidy`, `go test ./...`, `git tag`, `git push origin <tag>`, and the `go list -m` call above to prompt the index. The three services at `proxy.golang.org`, the module mirror, `sum.golang.org`, and `index.golang.org`, offer no registration, no account, and no ownership record; fetching is demand-triggered.

Source: [proxy.golang.org](https://proxy.golang.org/).

R-PUB-02 is therefore not reached rather than met, and neither is R-PUB-07: that rule asks where the credential behind a registry entry update lives, and its own `Check:` places an ecosystem with no registry entry to update outside it. Report both that way rather than as passes. Anything a Go release workflow does hold a token for, such as attaching binaries to a forge release, is the forge's own token and belongs to Step 6.

The one thing that behaves like a publishing credential here is push access to a tag. That is R-SEC-13 and `oss-harden` configures it.

## Write the hardened release workflow (Step 3)

There is no publish job, so the workflow's job is to make the tag safe to create rather than to upload anything. Run these checks on every change, not only at release time, because once the tag is pushed the version is fixed for good.

This is the one departure from the workflow shape `SKILL.md` states, and it is the tag-published track's, not this ecosystem's. The jobs below stay in `.github/workflows/ci.yml` under `name: CI`, with no `Release` workflow and no `release` environment, because pushing the tag is the publish and there is nothing left for a separate workflow to do. `test` and `build` keep their names, and the asset job is still `github-release`.

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-go@v7
        with:
          go-version-file: go.mod
          cache: false
      - run: go mod tidy && git diff --exit-code go.mod go.sum
      - run: go vet ./...
      - run: go test ./...  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)
```

The `go mod tidy` check is the one that matters most at release time: `go.sum` is what a consumer's build verifies against, and a tag pushed with a stale `go.sum` is not fixable afterwards. `oss-ci` owns what else runs here and `oss-harden` pins each `uses:` line to a commit SHA.

The release itself is two commands on the maintainer's machine, or a job triggered by whatever creates the tag:

```bash
git tag v1.2.3
git push origin v1.2.3
GOPROXY=proxy.golang.org go list -m <module path>@v1.2.3
```

Never move or delete a tag after pushing it. The publishing guide states the consequence plainly: change a tagged version after publishing and Go tools return a security error, because the checksum database has already recorded the bits that version resolved to. The proxy makes it worse in the other direction, since a bad release can stay served from the mirror after the repository is deleted. R-SEC-13 is the rule, and it is a security rule rather than a release rule for exactly this reason.

If a workflow creates the tag, give it a token scoped to that and nothing else, and keep the version check that every other ecosystem runs before publishing: compare the tag against whatever the repository treats as the declared version, since Go itself declares no version anywhere in `go.mod`.

## Gate on manual approval (Step 4): the gate is on tag creation

R-PUB-04 is not applicable on the tag-published track, because there is no run to approve between building and public availability. Pushing the tag is the publish, and the proxy serves it as soon as anybody asks.

That is why R-SEC-13 carries a tag-creation clause. Restrict `refs/tags/*` on GitHub with a repository ruleset that blocks tag update and tag deletion and restricts tag creation to named principals, or on GitLab with protected tags covering the release tag pattern. `oss-harden` writes both. Report R-PUB-04 as not applicable and R-SEC-13 as the control standing in its place, rather than reporting an approval gate that is not there.

## Verify provenance (Step 5): a gap, not a check

Nothing in the Go module ecosystem serves build provenance, and the thing that looks closest is not it. `sum.golang.org` is a checksum database: it records the hashes a module version resolved to and guarantees that those bits do not change from one day to the next, even if the author later alters the tags. That is integrity for a version, and it says nothing about who built the code or which workflow produced it. There is no build to attest in the first place, because the consumer's own toolchain compiles the source.

Source: [Go Modules Reference](https://go.dev/ref/mod) and [Go, Publishing a module](https://go.dev/doc/modules/publishing).

The strongest available substitute is the pair the ecosystem does offer. A consumer can verify the downloaded module cache against the checksum database with `go mod verify`, and the repository can sign its release tags so the commit the version resolves to carries an identity. Tag signing is R-SEC-05 and `oss-harden` owns it.

This sits below R-PUB-03, which asks for provenance tied to the repository and the workflow that built the artifact. It stays below it while the published artifact is source that the consumer builds, and it would retire the day Go's toolchain or the mirror served an attestation for a module version. Compiled binaries a Go project attaches to a forge release are a different artifact and Step 6 covers them.

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. Publishing the module attaches nothing, and the source archives the forge generates for a tag are not built assets, so a library goes straight to Step 7. A Go project shipping a command-line tool commonly attaches compiled binaries, and those are what this section covers.

Go ships its own bill of materials, so no third-party tool enters the release workflow. `go version -m <binary>` reads the module information the linker embedded, and `go mod` metadata is in the binary whether or not anybody asks for it. For a release asset, produce the inventory in the build job beside the binary it describes:

```yaml
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-go@v7
        with:
          go-version-file: go.mod
          cache: false
      - run: mkdir -p dist && go build -trimpath -o dist/ ./cmd/...
      - run: go version -m dist/* > dist/SBOM.txt
      - uses: actions/upload-artifact@v7
        with:
          name: binaries
          path: dist/
          retention-days: 1
```

`go version -m` output is not SPDX or CycloneDX, so it does not satisfy R-PUB-05 on its own; publish it as the human-readable inventory and say plainly that the rule's format requirement is unmet until an SBOM generator the maintainer has vetted produces one of the two formats. `-trimpath` keeps absolute build paths out of the binary, which is what makes two builds of the same commit comparable.

Attach and attest in a separate job, which is the same job boundary the other ecosystems use, for the same reason: a job that can write release assets should not be the job that builds them.

```yaml
  github-release:
    runs-on: ubuntu-latest
    needs: [build]
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

Run the first command against each asset downloaded, never against `SHA256SUMS`, which is a subject of nothing. `--signer-workflow <owner>/<repo>/.github/workflows/release.yml` pins which workflow the attestation must have come from. On GitLab CI/CD the forge attestation above is unavailable, so a GitLab release can carry the same `SHA256SUMS` with nothing signing it; say that rather than presenting the file as provenance.

`gh release upload` fails when no release exists for the tag. Either create it in this job with `gh release create "$GITHUB_REF_NAME" --generate-notes` first, or have the maintainer publish the release from the tag. This reference does not choose between them, because release notes are the project's own.

## Withdrawing a bad version

A published version cannot be unpublished; deleting the tag does not remove it from the mirror. The documented remedy is the `retract` directive: add it to `go.mod` and publish a new version containing it, higher than every other release or pre-release. Retracted versions stay available so existing builds keep working, drop out of `@latest` and range queries, hide from `go list -m -versions` unless `-retracted` is passed, and surface to users on `go list -m -u`. `oss-changelog` owns how that gets recorded, under R-CHG-01.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-07-31 against [Go, Publishing a module](https://go.dev/doc/modules/publishing), [Go Modules Reference](https://go.dev/ref/mod), and [proxy.golang.org](https://proxy.golang.org/).
