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

With that token present, `twine upload` uses trusted publishing automatically; no explicit `--repository-url` credential handling is needed beyond installing `twine`.

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
      - uses: actions/setup-python@v6
        with:
          python-version: '3.13'
      - run: pip install -e .[test]
      - run: pytest  # oss-ci decides these commands from CONTRIBUTING.md (R-CI-02)

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-python@v6
        with:
          python-version: '3.13'
      - run: pip install build
      - run: python -m build
      - uses: actions/upload-artifact@v5
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
      - uses: actions/download-artifact@v6
        with:
          name: dist
          path: dist/
      - uses: pypa/gh-action-pypi-publish@release/v1
```

`oss-harden` pins every `uses:` line above to a commit SHA and sets this workflow's `permissions:`, including the `contents: read` this skill left off the test and build jobs above; do not pin them or add permissions here. On GitLab CI/CD, run the equivalent `test`, `build`, and `publish` jobs with `image: python:3.13-bookworm`, give the publish job the `id_tokens` block above, and run `python -m pip install -U twine && twine upload dist/*` in its `script:`.

If an existing workflow uses `secrets.PYPI_API_TOKEN`, remove it from the YAML now and tell the user to delete the corresponding secret once the new flow is verified.

## Gate on manual approval (Step 4)

Pin the publish job to `environment: pypi` as above (the name is conventional, not required; keep whatever the trusted publisher's Environment name field says), and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers, or, on GitLab, as a protected environment with approval rules at the project's Settings > CI/CD > Protected environments. PyPI's own docs call this configuration optional; this skill does not, because it is the only human gate this flow has.

## Verify provenance (Step 5)

`pypa/gh-action-pypi-publish` generates and uploads a PEP 740 attestation by default when publishing through trusted publishing; no extra flag is needed. After the first release, verify with:

```bash
curl -s https://pypi.org/integrity/<name>/<version>/<filename>/provenance
```

A provenance object in the response confirms it; a 404 means the attestation was not produced, which points back at Step 3 or Step 4 having been skipped.

Source: [PyPI Docs, Producing attestations](https://docs.pypi.org/attestations/producing-attestations/).

## Not yet published projects

A trusted publisher can be created before the first release: open `https://pypi.org/manage/account/publishing/` and enter the project name plus the same owner, repository, workflow filename, and environment as above. The first successful publish from that workflow claims the name.
