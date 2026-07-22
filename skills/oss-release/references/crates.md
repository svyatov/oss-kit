# crates.io

Concrete flow for the decisions `SKILL.md` makes, for a crate published to crates.io. crates.io accepts two trusted publishing providers: GitHub Actions and GitLab CI/CD. GitLab CI/CD support is in public beta and, like PyPI's, works only for projects on gitlab.com; a self-managed GitLab instance has no path yet. Trusted publishing requires the crate to already exist on crates.io; the very first publish of a new crate still needs an interactive `cargo publish` with a personal API token, from the maintainer's own machine.

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
id_tokens:
  CRATES_IO_ID_TOKEN:
    aud: crates.io
```

crates.io has no equivalent to `crates-io-auth-action` for GitLab; the pipeline exchanges the OIDC token for a publish token itself, with a small script that POSTs to the crates.io API:

```bash
#!/bin/bash
set -e
RESPONSE=$(curl -s -X POST https://crates.io/api/v1/trusted_publishing/tokens \
  -H "Content-Type: application/json" \
  -H "User-Agent: gitlab-trusted-publishing (<maintainer email>)" \
  -d "{\"jwt\": \"$CRATES_IO_ID_TOKEN\"}")
CARGO_REGISTRY_TOKEN=$(echo "$RESPONSE" | jq -r '.token')
if [ "$CARGO_REGISTRY_TOKEN" = "null" ] || [ -z "$CARGO_REGISTRY_TOKEN" ]; then
  echo "Failed to get upload token" >&2
  echo "$RESPONSE" >&2
  exit 1
fi
echo "$CARGO_REGISTRY_TOKEN"
```

Save that as `exchange-token.sh` in the repository. This is crates.io's own documented approach for GitLab, not an improvisation; treat the public beta label as a reason to tell the user it may change, not a reason to skip it.

## Write the hardened release workflow (Step 3)

crates.io publishes a single crate binary from `cargo publish`, so there is no separate build-artifact handoff the way npm or RubyGems needs; keep the publish job to the auth exchange and the publish command, and run tests in a separate job that never sees `id-token: write`:

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6
      - run: cargo test --all-features

  publish:
    runs-on: ubuntu-latest
    needs: [test]
    environment: release
    permissions:
      id-token: write
    steps:
      - uses: actions/checkout@v6
      - uses: rust-lang/crates-io-auth-action@v1
        id: auth
      - run: cargo publish
        env:
          CARGO_REGISTRY_TOKEN: ${{ steps.auth.outputs.token }}
```

`oss-harden` pins every `uses:` line above to a commit SHA; do not pin them here. On GitLab CI/CD, give the publish job the `id_tokens` block above, run `exchange-token.sh` in `before_script:` or `script:` to get `CARGO_REGISTRY_TOKEN`, then `cargo publish`, restricted to tag pushes with `only: [tags]` or an equivalent `rules:` entry.

If an existing workflow reads a `CARGO_REGISTRY_TOKEN` from repository secrets, remove that now and tell the user to delete the secret and revoke the token on crates.io once the new flow is verified.

## Gate on manual approval (Step 4)

Pin the publish job to `environment: release` as above, and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers, or, on GitLab, as a protected environment with approval rules. crates.io's own docs call the environment optional, "for enhanced security"; this skill does not, because crates.io has no registry-side approval step of its own the way npm does.

## Verify provenance (Step 5): a gap, not a check

crates.io has no build provenance mechanism today: no cryptographic signature on a published crate, no attestation object, and nothing comparable to npm's `npm audit signatures` or PyPI's PEP 740 integrity endpoint for this skill to verify against. A Sigstore integration has been proposed (RFC 3403) but is not implemented. Trusted publishing itself still gives real value here, an OIDC-verified link between the publish action and the repository and workflow that ran it, but that link lives in crates.io's internal audit trail, not in anything the registry serves back for a consumer to check.

Source: [rust-lang/rfcs#3403, Sigstore-based signing for crates.io](https://github.com/rust-lang/rfcs/pull/3403).

The strongest substitute available is GitHub's own artifact attestation, produced and verified independently of crates.io:

```yaml
- uses: actions/attest-build-provenance@v4
  with:
    subject-path: target/package/*.crate
```

placed in the build step before `cargo publish`. A consumer can then verify the artifact came from the expected repository and workflow with `gh attestation verify <file> --repo <owner>/<repo>`, but this only works for a `.crate` file downloaded directly; crates.io does not surface or link to the attestation on the crate's own page, so nothing points a consumer at it. GitLab CI/CD has no equivalent build-provenance action in `oss-kit`'s scope. Mark this below the bar: it is independent verification bolted onto the release, not registry-served provenance, and it exists only on the GitHub Actions side. Tell the user this is a real gap in crates.io itself, not a shortcut this skill is taking, and move on; there is no flow to invent here.
