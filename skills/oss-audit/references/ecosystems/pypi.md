# PyPI

## Detection signals

PyPI is present when `pyproject.toml`, `setup.py`, or `setup.cfg` turns up anywhere in the checkout, or any of `uv.lock`, `poetry.lock`, `pdm.lock`, or `Pipfile.lock` does.

PyPI is shipped when a `pyproject.toml` carries a `[project]` table with `name` and `version`, alongside a `[build-system]` table, and publish evidence exists: a release workflow uploading a built distribution to the index, or an existing project page on pypi.org for that name. Python packaging documents `name` as "required and is the only field that cannot be marked as dynamic", and `version` as required though often dynamic.

Source: [Writing your pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/).

Three cases decide most arguments:

- A `pyproject.toml` carrying only `[tool.*]` tables and no `[project]` table declares no package at all. It is present and can never be shipped. This is the commonest false positive in any ecosystem, because repositories in every language adopt `pyproject.toml` as the configuration file for a formatter or a linter and never intend a distribution.
- The `Private :: Do Not Upload` classifier settles the shipped answer against PyPI: "PyPI will always reject packages with classifiers beginning with `Private ::`." The distribution may still ship to a private index, so name where it goes rather than calling it unpublished.
- A lockfile with no publishable manifest beside it is present. An application pinned with `uv.lock` resolves a dependency tree whether or not anybody can install it from an index.

## Release track

PyPI takes the registry-push track. A release uploads a built `sdist` and wheel to the index under a credential, so there is an upload to secure and a credential to scope, which is what assigns the track. The roster records `"track": "registry-push"` for PyPI and the release area's preamble names PyPI in its registry-push list.

Verified 2026-07-31 against https://packaging.python.org/en/latest/guides/writing-pyproject-toml/.
