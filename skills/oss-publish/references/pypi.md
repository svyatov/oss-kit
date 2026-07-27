# PyPI

Concrete flow for the decisions `SKILL.md` makes, for a package published to pypi.org. PyPI accepts four trusted publishing providers: GitHub Actions, GitLab CI/CD, Google Cloud, and ActiveState. This file covers GitHub Actions and GitLab CI/CD, matching `oss-kit`'s forge scope. The self-service GitLab flow below covers gitlab.com projects. A self-managed GitLab instance can use trusted publishing too, but PyPI's own announcement scopes the beta to organizations running their own GitLab, not to an individual maintainer's self-hosted instance: the organization emails `support+orgs@pypi.org` with the instance URL and confirms its `/.well-known/openid-configuration` and `/oauth/discovery/keys` endpoints are reachable, and PyPI staff establish the trust relationship by hand. Tell the user about that path if `git remote get-url origin` points at a GitLab host other than gitlab.com and the repository belongs to an organization, rather than assuming the self-service flow below applies to it or that a solo maintainer's personal instance qualifies.

Source: [PyPI Docs, Trusted publishers](https://docs.pypi.org/trusted-publishers/adding-a-publisher/), [PyPI Docs, Using a publisher](https://docs.pypi.org/trusted-publishers/using-a-publisher/), and [PyPI Blog, Trusted Publishing is popular, now for GitLab Self-Managed and Organizations](https://blog.pypi.org/posts/2025-11-10-trusted-publishers-coming-to-orgs/).

## Gather facts (Step 1)

Read `pyproject.toml` (the `project.name` and `project.urls` tables), or `setup.cfg` or `setup.py` if the project has not migrated. Get the owner and repository from the project's URL metadata, falling back to `git remote get-url origin`. Check whether the package is already published with `curl -s -o /dev/null -w '%{http_code}' https://pypi.org/pypi/<name>/json`; a `404` means it is not.

## Configure trusted publishing (Step 2)

### GitHub Actions

For an already-published project, open `https://pypi.org/manage/project/<name>/settings/publishing/` and enter:

- Owner: the owner from Step 1
- Repository name: the repository name from Step 1
- Workflow name: the publish workflow's filename, for example `publish.yml`
- Environment name: the approval environment name from `SKILL.md` Step 4, for example `pypi`

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
id_tokens:
  PYPI_ID_TOKEN:
    aud: pypi
```

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
      - run: <project-specific tag and version equality check>
      - run: <documented build command>
      - uses: actions/upload-artifact@v7
        with:
          name: dist
          path: dist/
          retention-days: 1

  publish:
    runs-on: ubuntu-latest
    needs: [test, build]
    environment: pypi
    permissions:
      id-token: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: dist
          path: dist/
      - uses: pypa/gh-action-pypi-publish@release/v1
```

Replace the angle-bracket commands from the repository's contributing guide, lockfiles, build backend, and version source. Do not assume every project uses editable installs, pytest, a static `project.version`, or the `build` frontend. If the repository has no frozen build-tool install, add one using the project's existing lock workflow after verifying the build frontend through its upstream documentation.

`oss-harden` pins every `uses:` line above to a commit SHA and sets this workflow's `permissions:`, including the `contents: read` this skill left off the test and build jobs above; do not pin them or add permissions here.

On GitLab CI/CD, use separate build, attestation, and publish jobs. PyPI's official GitLab flow requires the attestation job to request `SIGSTORE_ID_TOKEN` with audience `sigstore`, sign every distribution with `pypi-attestations`, and pass the distributions plus adjacent attestation files to the publish job. The publish job requests `PYPI_ID_TOKEN` with audience `pypi` and runs `twine upload --attestations dist/*`. Prepare hash-locked wheels for both CLIs in an uncredentialed job and install them offline, or use a project-controlled image pinned by digest. A plain `twine upload dist/*` publishes through OIDC but does not upload provenance.

If an existing workflow uses `secrets.PYPI_API_TOKEN`, remove it from the YAML now and tell the user to delete the corresponding secret once the new flow is verified.

## Gate on manual approval (Step 4)

Pin the publish job to `environment: pypi` as above (the name is conventional, not required; keep whatever the trusted publisher's Environment name field says), and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers, or, on GitLab Premium or Ultimate, as a protected environment with approval rules. GitHub required reviewers work for public repositories on current plans; private or internal repositories need GitHub Enterprise Cloud. If the repository's visibility or plan provides no native approval gate, report R-PUB-04 as unmet. PyPI has no registry-side approval fallback.

## Verify provenance (Step 5)

`pypa/gh-action-pypi-publish` generates and uploads a PEP 740 attestation by default when publishing through trusted publishing. The GitLab flow must generate and upload adjacent attestations explicitly as described above. After the first release, first confirm that PyPI serves provenance:

```bash
curl -s https://pypi.org/integrity/<name>/<version>/<filename>/provenance
```

A provenance object confirms the file has attestations; a 404 means it does not. Then cryptographically verify the distribution against the expected repository using the current, upstream-verified `pypi-attestations` CLI:

```bash
pypi-attestations verify pypi --repository https://<forge>/<owner>/<repo> <distribution-url>
```

Source: [PyPI Docs, Producing attestations](https://docs.pypi.org/attestations/producing-attestations/) and [PyPI Docs, Consuming attestations](https://docs.pypi.org/attestations/consuming-attestations/).

## Not yet published projects

A trusted publisher can be created before the first release: open `https://pypi.org/manage/account/publishing/` and enter the project name plus the same owner, repository, workflow filename, and environment as above. The first successful publish from that workflow claims the name.
