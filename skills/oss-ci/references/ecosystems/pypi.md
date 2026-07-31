# PyPI

## Toolchain and matrix (R-CI-03)

On GitHub Actions, `actions/setup-python` installs CPython, PyPy, or GraalPy and puts it on the PATH. Drive the matrix from `requires-python` in the `[project]` table of `pyproject.toml`, which is where a package declares the Python versions it supports.

```yaml
strategy:
  matrix:
    python-version: ['3.11', '3.12', '3.13']
steps:
  - uses: actions/setup-python@v7  # oss-harden pins this to a commit SHA
    with:
      python-version: ${{ matrix.python-version }}
```

Set the version explicitly. With no `python-version` and no `.python-version` file the action falls back to whatever Python is on the runner's PATH, and the README says that default varies between runner images and can change without notice.

For a uv project, uv documents its own action, `astral-sh/setup-uv`, and `uv run` selects the interpreter. On GitLab, run the job in the Python official image, or in uv's published image for a uv project, and vary the tag with `parallel:matrix`.

Sources: [actions/setup-python](https://github.com/actions/setup-python), [Writing your pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/), [uv, GitHub Actions](https://docs.astral.sh/uv/guides/integration/github/), [docker-library/python](https://github.com/docker-library/python).

## Dependency caching (R-CI-04)

`actions/setup-python` has a `cache` input that is off by default and accepts `pip`, `pipenv`, and `poetry`. What it caches differs by manager, and only the first is download data: for pip it caches the global cache directory, and for pipenv and poetry it caches virtualenv directories. Its default hash file is `requirements.txt` or `pyproject.toml` for pip, `Pipfile.lock` for pipenv, and `poetry.lock` for poetry, and `cache-dependency-path` overrides that.

Prefer keying on a lockfile the repository commits over the pip default of hashing `requirements.txt`, because a requirements file with an unpinned range resolves differently under an unchanged hash. The README says as much: it warns that a restored cache goes stale when the requirements file has not changed and a newer dependency version has been released.

The roster lists four lockfiles under PyPI. Two of those managers are outside the `cache` input's accepted values: uv keys through its own action, `astral-sh/setup-uv` with `enable-cache: true`, which keys on `uv.lock`, and a pdm project caches through `actions/cache` keyed on `pdm.lock`. pip's own cache directory is printed by `pip cache dir` and sits at `~/.cache/pip` on Linux.

On GitLab, uv documents `UV_CACHE_DIR: .uv-cache` with `cache:key:files` on `uv.lock` and `uv cache prune --ci` in `after_script`. For pip, point the cache directory inside the project the same way, because GitLab caches only paths under the project directory.

Sources: [actions/setup-python](https://github.com/actions/setup-python), [pip, caching](https://pip.pypa.io/en/stable/topics/caching/), [uv, GitHub Actions](https://docs.astral.sh/uv/guides/integration/github/), [uv, GitLab CI/CD](https://docs.astral.sh/uv/guides/integration/gitlab/).

## Test command (R-CI-06)

pytest documents two equivalent invocations, `pytest` and `python -m pytest`; the second also adds the current directory to `sys.path`, which is the difference to know when an import resolves in one and not the other. A uv project runs `uv run pytest`, which uv's own GitHub Actions guide uses.

Python declares the command outside the package manifest more often than inside it: pytest configuration lives in `[tool.pytest.ini_options]` in `pyproject.toml`, in `pytest.ini`, or in `tox.ini`, and a project using tox or nox declares the whole invocation in `tox.ini` or `noxfile.py`. Read those before falling back to a bare `pytest`, because a project with a tox matrix has already written the command CI should call.

Sources: [pytest, how to invoke pytest](https://docs.pytest.org/en/stable/how-to/usage.html), [uv, GitHub Actions](https://docs.astral.sh/uv/guides/integration/github/).

Verified 2026-07-31 against https://github.com/actions/setup-python, https://packaging.python.org/en/latest/guides/writing-pyproject-toml/, https://pip.pypa.io/en/stable/topics/caching/, https://docs.astral.sh/uv/guides/integration/github/, https://docs.astral.sh/uv/guides/integration/gitlab/, https://docs.pytest.org/en/stable/how-to/usage.html, and https://github.com/docker-library/python.
