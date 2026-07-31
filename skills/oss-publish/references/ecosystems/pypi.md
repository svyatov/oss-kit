# PyPI

Concrete flow for the decisions `SKILL.md` makes, for a package published to pypi.org. PyPI accepts four trusted publishing providers: GitHub Actions, GitLab CI/CD, Google Cloud, and ActiveState. This file covers GitHub Actions and GitLab CI/CD, matching `oss-kit`'s forge scope. The self-service GitLab flow below covers gitlab.com projects. A self-managed GitLab instance can use trusted publishing too, but PyPI's own announcement scopes that path to organizations running their own GitLab, not to an individual maintainer's self-hosted instance: the organization emails `support+orgs@pypi.org` with the instance URL and confirms its `/.well-known/openid-configuration` and `/oauth/discovery/keys` endpoints are reachable, and PyPI staff establish the trust relationship by hand. Tell the user about that path if `git remote get-url origin` points at a GitLab host other than gitlab.com and the repository belongs to an organization, rather than assuming the self-service flow below applies to it or that a solo maintainer's personal instance qualifies.

Source: [PyPI Docs, Trusted publishers](https://docs.pypi.org/trusted-publishers/adding-a-publisher/), [PyPI Docs, Using a publisher](https://docs.pypi.org/trusted-publishers/using-a-publisher/), and [PyPI Blog, Trusted Publishing is popular, now for GitLab Self-Managed and Organizations](https://blog.pypi.org/posts/2025-11-10-trusted-publishers-coming-to-orgs/).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2)](#configure-trusted-publishing-step-2)
  - [GitHub Actions](#github-actions)
  - [GitLab CI/CD](#gitlab-cicd)
- [Write the hardened release workflow (Step 3)](#write-the-hardened-release-workflow-step-3)
- [Gate on manual approval (Step 4)](#gate-on-manual-approval-step-4)
- [Verify provenance (Step 5)](#verify-provenance-step-5)
- [Describe and sign what the release attaches (Step 6)](#describe-and-sign-what-the-release-attaches-step-6)
- [Not yet published projects](#not-yet-published-projects)

## Gather facts (Step 1)

Read `pyproject.toml` (the `project.name` and `project.urls` tables), or `setup.cfg` or `setup.py` if the project has not migrated. Get the owner and repository from the project's URL metadata, falling back to `git remote get-url origin`. Check whether the package is already published with `curl -s -o /dev/null -w '%{http_code}' https://pypi.org/pypi/<name>/json`; a `404` means it is not, and [Not yet published projects](#not-yet-published-projects) below covers that case.

## Configure trusted publishing (Step 2)

PyPI supports both forges, so read the section for the forge detected in Step 1 and take the settings from there.

### GitHub Actions

For an already-published project, open `https://pypi.org/manage/project/<name>/settings/publishing/` and enter:

- Owner: the owner from Step 1
- Repository name: the repository name from Step 1
- Workflow name: `release.yml`, the filename rather than the workflow's `name:`
- Environment name: the approval environment name from `SKILL.md` Step 4, which this skill always writes as `release`

In the workflow, the publish job needs:

```yaml
permissions:
  id-token: write
```

Use the maintained action rather than hand-rolling the OIDC exchange:

```yaml
- uses: pypa/gh-action-pypi-publish@release/v1
```

No `PYPI_API_TOKEN` or any other registry secret is needed once the trusted publisher above is configured.

### GitLab CI/CD

At the same settings page, choose GitLab and enter:

- Repository namespace: the GitLab username or group path, matching the `<owner>` from Step 1
- Repository name: the project name
- Workflow filepath: the path to the pipeline file, for example `.gitlab-ci.yml`
- Environment name: the approval environment name from Step 4

In the pipeline, the publish job needs:

```yaml
environment:
  name: release
id_tokens:
  PYPI_ID_TOKEN:
    aud: pypi
```

The `environment` name has to match the form's Environment name field exactly. PyPI compares the `environment` claim in the OIDC token against what the form recorded, and that string comparison is the whole of the check: nothing else about the environment reaches the registry, so naming one is not on its own a restriction. Make it a protected environment with deploy access restricted to whoever is allowed to release, which GitLab offers on Premium and Ultimate. On a tier without protected environments any job in the project can claim the name, and the claim is then self-asserted. That is the difference between a control and a label here, because the form binds namespace, project, and pipeline filepath and no ref at all: with the environment unprotected, a pipeline on any branch a contributor can push satisfies every claim PyPI checks.

With that token present, current Twine uses trusted publishing automatically; no explicit credential handling is needed. Resolve Twine's current release from the PyPA repository before writing the pipeline, then lock that exact version and every transitive dependency with hashes. Do not install `twine -U` in the job that receives the OIDC token.

## Write the hardened release workflow (Step 3)

Build the distribution in a separate job from the one that publishes it, so a compromised build dependency cannot reach the publish credential:

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
      - uses: actions/setup-python@v7
        with:
          python-version: '3.13'
      - run: <frozen project install command from CONTRIBUTING.md>
      - run: pytest  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-python@v7
        with:
          python-version: '3.13'
      - run: <frozen build-tool install command>
      - run: python -c "import os,sys,tomllib; sys.exit(tomllib.load(open('pyproject.toml','rb'))['project']['version'] != os.environ['GITHUB_REF_NAME'].removeprefix('v'))"
      - run: <documented build command>
      - uses: actions/upload-artifact@v7
        with:
          name: dist
          path: dist/
          retention-days: 1

  publish:
    runs-on: ubuntu-latest
    needs: [test, build]
    environment: release
    permissions:
      id-token: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: dist
          path: dist/
      - uses: pypa/gh-action-pypi-publish@release/v1
```

Replace the remaining angle-bracket commands from the repository's contributing guide, lockfiles, and build backend. The version check above reads a static `project.version` and strips one leading `v` from the tag. Derive both halves from what the repository actually does: a project declaring `dynamic = ["version"]` has nothing at that key and the check raises a `KeyError` rather than comparing anything, and a project tagging `1.2.3` has no prefix to strip. Where the version is dynamic, move the comparison after the build step and read it from the built distribution's metadata, which is the only place it exists. Do not assume every project uses editable installs, pytest, or the `build` frontend. If the repository has no frozen build-tool install, add one using the project's existing lock workflow after verifying the build frontend through its upstream documentation.

`oss-harden` pins every `uses:` line above to a commit SHA and sets this workflow's `permissions:`, including the `contents: read` this skill left off the test and build jobs above; do not pin them or add permissions here.

On GitLab CI/CD, use separate build, attestation, and publish jobs. PyPI's official GitLab flow requires the attestation job to request `SIGSTORE_ID_TOKEN` with audience `sigstore`, sign every distribution with `pypi-attestations`, and pass the distributions plus adjacent attestation files to the publish job. The publish job requests `PYPI_ID_TOKEN` with audience `pypi` and runs `twine upload --attestations dist/*`. Prepare hash-locked wheels for both CLIs in an uncredentialed job and install them offline, or use a project-controlled image pinned by digest. A plain `twine upload dist/*` publishes through OIDC but does not upload provenance.

If an existing workflow uses `secrets.PYPI_API_TOKEN`, remove it from the YAML now and tell the user to delete the corresponding secret once the new flow is verified.

## Gate on manual approval (Step 4)

Pin the publish job to `environment: release` as above, and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers, or, on GitLab Premium or Ultimate, as a protected environment with approval rules. GitHub required reviewers work for public repositories on current plans; private or internal repositories need GitHub Enterprise Cloud. If the repository's visibility or plan provides no native approval gate, report R-PUB-04 as unmet. PyPI has no registry-side approval fallback.

PyPI does not require any particular environment name, and `pypi` is what its own examples use. This skill writes `release` for every ecosystem, so the same word means the same thing in every repository it touches. What matters is that the form's Environment name field and the job's `environment:` are the same string; where a repository already has a working publisher entry naming something else, keep it rather than renaming both to match this file.

Create it with the API rather than the form. Reviewers and the tag policy are both settable, so nothing here needs a browser.

```sh
ENV=pypi
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

## Verify provenance (Step 5)

`pypa/gh-action-pypi-publish` generates and uploads a PEP 740 attestation by default when publishing through trusted publishing. The GitLab flow must generate and upload adjacent attestations explicitly as described above. After the first release, first confirm that PyPI serves provenance:

```bash
curl -s https://pypi.org/integrity/<name>/<version>/<filename>/provenance
```

A provenance object confirms the file has attestations; a 404 means it does not. Then cryptographically verify the distribution against the expected repository with the `pypi-attestations` CLI. It is a separate tool this skill does not bundle, published by Trail of Bits, and its own README gives the install command:

```bash
python -m pip install pypi-attestations
```

Install it into a virtual environment rather than the system interpreter, then verify:

```bash
pypi-attestations verify pypi --repository https://<forge>/<owner>/<repo> <distribution-url>
```

Source: [PyPI Docs, Producing attestations](https://docs.pypi.org/attestations/producing-attestations/) and [PyPI Docs, Consuming attestations](https://docs.pypi.org/attestations/consuming-attestations/).

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. The distributions this workflow uploads to PyPI carry the PEP 740 attestations Step 5 verifies, and the source archives GitHub generates for a tag are not built assets, so a project that attaches nothing beside them goes to Step 7 instead.

Two rules apply here and they ask for different things. R-PUB-05 wants an inventory of what went into the asset, in SPDX or CycloneDX. R-PUB-06 wants the assets signed, or listed by hash in a signed manifest. A manifest of hashes answers the second and nothing about the first, so do not report R-PUB-05 as met by publishing one.

This reference names no SBOM generator for Python. The ones in common use are third-party tools rather than part of the packaging toolchain, and a tool that reads the dependency tree inside the release workflow is one the maintainer vets before it goes there. What answers R-PUB-05 without one, on GitHub, is the forge's own export of the repository's dependency graph, which is already SPDX and needs nothing installed. The `gh api` step below writes it into `dist/`, so it ships as a release asset for R-PUB-05 and is listed in `SHA256SUMS` and attested alongside the distributions for R-PUB-06:

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
          name: dist
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

State both of the export's limits to the maintainer rather than leaving them to be discovered. It is GitHub only, so a GitLab project keeps this gap and R-PUB-05 stays unmet there with the reason named. And it covers the repository's declared dependency graph rather than what is inside the asset, which is exact for a pure Python wheel, because a wheel declares its dependencies rather than bundling them, and an approximation for a wheel carrying compiled extensions, whose linked libraries the graph does not see. The graph resolves past the direct dependencies only where a lockfile or a fully hashed requirements file is committed, which R-SEC-08 already requires. Read the output back once with `gh api repos/<owner>/<repo>/dependency-graph/sbom --jq '.sbom.packages | length'` before reporting the rule met: a graph the forge does not parse for this ecosystem returns a near-empty package list rather than an error.

`sha256sum` runs from inside `dist/` so the names it writes are the names the assets carry on the release. A manifest listing `dist/foo.whl` cannot be checked against a downloaded `foo.whl`.

`subject-checksums` makes every file listed in `SHA256SUMS` a subject of the attestation in its own right, by name and digest, and it takes the format `sha256sum` writes. Attesting `SHA256SUMS` itself with `subject-path` instead would leave a consumer able to verify the manifest and nothing about the assets it lists.

A consumer verifies an asset, then checks the rest of the download against the manifest:

```bash
gh attestation verify <asset> --repo <owner>/<repo>
sha256sum -c SHA256SUMS
```

Run the first command against each asset downloaded, never against `SHA256SUMS`, which is a subject of nothing. It proves that this workflow in this repository produced those exact bytes, and it prints the signing workflow it accepted; `--signer-workflow <owner>/<repo>/.github/workflows/release.yml` pins that, so an attestation from any other workflow in the repository fails. The second command is what a consumer without `gh` has. It proves the files match a list published beside them, and nothing about who produced either.

`gh release upload` fails when no release exists for the tag. Either create it in this job with `gh release create "$GITHUB_REF_NAME" --generate-notes` before the upload, or have the maintainer publish the release from the tag first. This reference does not choose between them, because release notes are the project's own.

A third job is what makes the grants above safe, so copy the job boundary along with them. The build job runs the project's own build command, so giving it release-asset writes and an attestation identity is exactly the credential split Step 3 exists to enforce, and it would write assets before the approval gate. The publish job holds the OIDC identity PyPI trusts. Only a separate job satisfies both, and `needs: [publish]` is what keeps the assets behind the gate.

The four grants above are copied exactly, on this job only. The workflow's top-level block stays `contents: read`. Narrowing anything else, pinning each `uses:` to a commit SHA, and auditing the result are `oss-harden`'s.

## Not yet published projects

A trusted publisher can be created before the first release: open `https://pypi.org/manage/account/publishing/` and enter the project name plus the same owner, repository, workflow filename, and environment as above. The first successful publish from that workflow claims the name.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-07-31 against [PyPI Docs, Adding a trusted publisher](https://docs.pypi.org/trusted-publishers/adding-a-publisher/), [PyPI Docs, Using a trusted publisher](https://docs.pypi.org/trusted-publishers/using-a-publisher/), and [PyPI Docs, Digital attestations](https://docs.pypi.org/attestations/).
