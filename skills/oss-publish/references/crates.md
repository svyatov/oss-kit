# crates.io

Concrete flow for the decisions `SKILL.md` makes, for a crate published to crates.io. crates.io accepts two trusted publishing providers: GitHub Actions and GitLab CI/CD. Its GitLab CI/CD support covers projects on gitlab.com only, with no path for a self-managed instance; confirm that scope in the documentation linked below before writing the GitLab flow. Trusted publishing requires the crate to already exist on crates.io; the very first publish of a new crate still needs an interactive `cargo publish` with a personal API token, from the maintainer's own machine.

Source: [crates.io Docs, Trusted Publishing](https://crates.io/docs/trusted-publishing) and [Rust Blog, crates.io development update, 2026-01-21](https://blog.rust-lang.org/2026/01/21/crates-io-development-update).

## Gather facts (Step 1)

Read `Cargo.toml`'s `package.repository` field for the owner and repository, falling back to `git remote get-url origin`. Check whether the crate is already published with `curl -s -o /dev/null -w '%{http_code}' https://crates.io/api/v1/crates/<name>` (or check the crate's page directly); anything other than `200` means it needs the first interactive publish before any of the flow below applies.

## Configure trusted publishing (Step 2)

### GitHub Actions

Open `https://crates.io/crates/<name>/settings/new-trusted-publisher`, choose GitHub, and enter:

- Repository owner: the owner from Step 1
- Repository name: the repository name from Step 1
- Workflow filename: the publish workflow's filename only, for example `release.yml`
- Environment: the approval environment name from `SKILL.md` Step 4, for example `release`

In the workflow, the publish job needs:

```yaml
permissions:
  id-token: write
steps:
  - uses: rust-lang/crates-io-auth-action@v1
    id: auth
  - run: cargo publish
    env:
      CARGO_REGISTRY_TOKEN: ${{ steps.auth.outputs.token }}
```

`rust-lang/crates-io-auth-action` exchanges the workflow's OIDC token for a 30-minute publish token; no `CARGO_REGISTRY_TOKEN` secret needs to exist in the repository.

### GitLab CI/CD

At the same settings page, choose GitLab and enter:

- Namespace: the GitLab username or group path (nested groups are supported, for example `group/subgroup`)
- Project: the project name
- Workflow filepath: the full path to the pipeline file, for example `.gitlab-ci.yml`
- Environment: the approval environment name from Step 4

In the pipeline, the publish job needs:

```yaml
environment:
  name: release
id_tokens:
  CRATES_IO_ID_TOKEN:
    aud: crates.io
```

The `environment` name has to match the form's Environment field exactly. crates.io compares the `environment` claim in the OIDC token against what the form recorded, and that string comparison is the whole of the check: GitLab also emits an `environment_protected` claim, and crates.io does not read it, so naming an environment is not on its own a restriction. Make it a protected environment with deploy access restricted to whoever is allowed to release, which GitLab offers on Premium and Ultimate. On a tier without protected environments any job in the project can claim the name, and the claim is then self-asserted. That is the difference between a control and a label here, because the form binds namespace, project, and workflow filepath and no ref at all: with the environment unprotected, a pipeline on any branch a contributor can push satisfies every claim crates.io checks.

crates.io has no equivalent to `crates-io-auth-action` for GitLab; the pipeline exchanges the OIDC token for a publish token itself. The exchange needs `curl` and `jq`. Use a project-controlled release image that contains the project's exact Rust toolchain plus these tools, and pin the image by digest. Build and provenance-check that image before adding `id_tokens` to the job. Do not run `apt-get` after the job has received its OIDC token.

```bash
#!/bin/sh
set -eu
set +x
response=$(curl --fail-with-body --silent --show-error \
  --request POST https://crates.io/api/v1/trusted_publishing/tokens \
  -H "Content-Type: application/json" \
  -H "User-Agent: gitlab-trusted-publishing (<maintainer email>)" \
  --data "$(jq -cn --arg jwt "$CRATES_IO_ID_TOKEN" '{jwt:$jwt}')")
token=$(printf '%s' "$response" | jq -er '.token | select(type == "string" and length > 0)')
export CARGO_REGISTRY_TOKEN=$token
unset token response CRATES_IO_ID_TOKEN
```

Save that as `exchange-token.sh` and source it with `. ./exchange-token.sh` in the same shell that runs `cargo publish`; executing it as a child process loses the exported variable. The script disables command tracing, fails on HTTP or JSON errors, never prints the short-lived token or error response, and removes the original OIDC token from the environment.

Sourcing it also leaves `set -eu` active for the rest of the job's `script:` block, which is not what the reader asked for and is worth knowing before the next command runs. Keep `errexit`: a publish step that continues past a failed command is the failure this whole flow exists to prevent, and GitLab's own default is to stop on a nonzero exit anyway. `nounset` is the one to scope, because the remaining commands are the project's own and any of them reading an unset optional variable now aborts the job with a message about the variable rather than about the publish. Add `set +u` as the script's last line. A subshell is not the fix here: the token has to survive into the parent shell, which is the reason the script is sourced at all.

`--fail-with-body` needs curl 7.76 or later; an older curl rejects it as an unknown option and the exchange fails before it reaches crates.io. Check the release image's curl version when you pin its digest. This follows crates.io's documented exchange endpoint while closing the token leak in its minimal example. Re-read that endpoint's documentation before every implementation, because GitLab support is the newer of the two providers.

## Write the hardened release workflow (Step 3)

Cargo does not accept a prebuilt `.crate` path for publishing. Run `cargo publish --dry-run` in an uncredentialed job so dependency resolution, build scripts, packaging, and verification finish before approval. The publish job then authenticates and runs `cargo publish --no-verify`, which repackages and uploads without building dependencies:

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
      - run: cargo test --all-features  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)
      - run: test "${GITHUB_REF_NAME#v}" = "$(cargo metadata --format-version 1 --no-deps | jq -er --arg n "<crate name>" '.packages[] | select(.name == $n) | .version')"
      - run: cargo publish --dry-run

  publish:
    runs-on: ubuntu-latest
    needs: [test]
    environment: release
    permissions:
      contents: read
      id-token: write
      attestations: write
      artifact-metadata: write
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: rust-lang/crates-io-auth-action@v1
        id: auth
      - run: cargo publish --no-verify
        env:
          CARGO_REGISTRY_TOKEN: ${{ steps.auth.outputs.token }}
      - uses: actions/attest@v4
        with:
          subject-path: target/package/*.crate
```

The version check above names the crate in `<crate name>` and strips one leading `v` from the tag; derive both from what the repository actually does, since a workspace publishes more than one name and a project tagging `1.2.3` has no prefix to strip. `jq -e` is what makes an unmatched name fail the step rather than compare the tag against an empty string. `jq` is preinstalled on GitHub-hosted Ubuntu runners, and on GitLab it comes from the release image the token exchange already requires. Use the package selector and version source discovered in Step 1 for workspaces. The publish command creates the exact `.crate` it uploads under `target/package/`; the following attestation therefore covers the uploaded bytes. `--no-verify` is safe only because the required dry run already succeeded for the same tag commit and toolchain.

`oss-harden` pins every `uses:` line above to a commit SHA and sets the test job's minimal permissions; this skill includes the publish permissions required for authentication and provenance. On GitLab CI/CD, give the publish job the `id_tokens` block above, source `exchange-token.sh`, then run `cargo publish --no-verify`, restricted to version tags with `rules:`. The preceding uncredentialed job must run the same version check and `cargo publish --dry-run`.

If an existing workflow reads a `CARGO_REGISTRY_TOKEN` from repository secrets, remove that now and tell the user to delete the secret and revoke the token on crates.io once the new flow is verified.

## Gate on manual approval (Step 4)

Pin the publish job to `environment: release` as above, and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers, or, on GitLab Premium or Ultimate, as a protected environment with approval rules. GitHub required reviewers work for public repositories on current plans; private or internal repositories need GitHub Enterprise Cloud. crates.io has no registry-side approval fallback, so report R-PUB-04 as unmet when the forge plan provides no native gate.

## Verify provenance (Step 5): a gap, not a check

crates.io publishes no build provenance for this skill to verify against: no cryptographic signature on a published crate, no attestation object, and nothing comparable to npm's `npm audit signatures` or PyPI's PEP 740 integrity endpoint. Read the trusted publishing documentation linked above before reporting that, and treat the closed RFC below as a rejected proposal rather than a pending one. Trusted publishing itself still gives real value here, an OIDC-verified link between the publish action and the repository and workflow that ran it, but that link lives in crates.io's internal audit trail, not in anything the registry serves back for a consumer to check.

Source: [rust-lang/rfcs#3403, Sigstore-based signing for crates.io (closed, not merged)](https://github.com/rust-lang/rfcs/pull/3403).

The strongest substitute on GitHub is the `actions/attest` step in the workflow above. This needs the `gh` CLI installed and authenticated against the host holding the repository; `gh auth status` prints the active account per host. Download the exact published `.crate`, then verify it:

```bash
gh attestation verify <name>-<version>.crate --repo <owner>/<repo>
```

crates.io does not surface or link to that attestation. GitLab CI/CD has no equivalent forge attestation in this skill's scope, so R-PUB-03 remains unmet there. Report both limitations plainly; trusted publishing proves the publishing workflow's identity, not the provenance of the uploaded bytes.
