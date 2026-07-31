# PyPI

## Automated dependency updates (R-SEC-03)

Dependabot's `pip` value covers pip, Pipenv, pip-compile, and Poetry, and `uv` is its own value; the table marks version updates and security updates supported for both. Poetry and Pipenv projects still declare `package-ecosystem: "pip"` rather than a value named after the tool, which is the one place a `dependabot.yml` written from the tool name silently covers nothing.

On GitLab the Renovate managers are `pep621`, `pip_requirements`, `poetry`, `pipenv`, and `pip-compile`.

## Lockfile and frozen install (R-SEC-08)

Which file the project has depends on the tool, and each tool has its own way to fail rather than re-resolve:

- uv writes `uv.lock`. `uv sync --locked` raises an error instead of updating the lockfile when it is not up to date. Its `--frozen` does the opposite, using the lockfile without checking it, so `--locked` is the CI flag and `--frozen` is not.
- Poetry writes `poetry.lock`, and `poetry install` uses the exact versions from it instead of resolving. It does not fail on a lockfile that has drifted from `pyproject.toml`, so the gate is a separate `poetry check --lock` step, which verifies the lockfile against the current `pyproject.toml`.
- PDM writes `pdm.lock`, and `pdm install --check` is documented as "Check if the lock file is up to date and fail otherwise". Its `--frozen-lockfile` only stops PDM creating or updating the file, so it is not the checking flag.
- Pipenv writes `Pipfile.lock`, and `pipenv install --deploy` aborts if `Pipfile.lock` is out of date. `pipenv sync` installs from the lockfile without checking it against the `Pipfile`.

A project with no lockfile at all reaches the same place through a fully hashed requirements file and `pip install --require-hashes`, but only in full: pip's hash-checking mode requires hashes for every requirement including transitive ones, and every requirement pinned with `==`, a URL, or a path. A partially hashed file is an error rather than partial protection.

## Static analysis (R-SEC-09)

CodeQL supports Python, so CodeQL default setup covers this ecosystem on GitHub. GitLab's SAST table lists Python under its Semgrep-based analyzer with GitLab-managed rules.

## Vulnerability watch (R-SEC-11)

The dependency graph parses `requirements.txt` and `pipfile.lock` under pip, with `pipfile` and `setup.py` as additional files, and `poetry.lock` under Poetry with `pyproject.toml` as an additional file. Both rows support Dependabot graph jobs and automatic dependency submission. Neither `uv.lock` nor `pdm.lock` appears in that table, so a uv or PDM project's graph reports what it can read from the manifest and nothing from the resolved set. GitHub also notes that a project listing its dependencies in `setup.py` may not have every dependency parsed.

Advisories come from the GitHub Advisory Database, which names this ecosystem Pip against the pypi.org registry.

`osv-scanner` reads `uv.lock`, `pdm.lock`, `poetry.lock`, `Pipfile.lock`, `requirements.txt`, and `pylock.toml`, which is what covers the uv and PDM residual.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [uv locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/), [Poetry CLI](https://python-poetry.org/docs/cli/), [PDM CLI reference](https://pdm-project.org/en/latest/reference/cli/), [Pipenv CLI](https://pipenv.pypa.io/en/latest/cli.html), [pip secure installs](https://pip.pypa.io/en/stable/topics/secure-installs/), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
