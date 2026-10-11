# PyPI

## Detection signals

PyPI is present when `pyproject.toml`, `setup.py`, or `setup.cfg` turns up anywhere in the checkout, or any of `uv.lock`, `poetry.lock`, `pdm.lock`, or `Pipfile.lock` does.

PyPI is shipped when build-backend metadata defines a distribution and publication evidence exists for that package. Check a release workflow uploading it or an existing pypi.org project page. Metadata can live in `[project]`, `setup.cfg`, `setup.py`, or supported legacy `[tool.poetry]` tables. Under `[project]`, `name` is required and `version` must be specified or declared dynamic.

Source: [Writing your pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/).

Three cases decide most arguments:

- A tool-only `pyproject.toml` does not establish whether the repository ships a package. Check the build backend and other metadata files before excluding it. Formatter or linter configuration alone is presence evidence, not publication evidence.
- The `Private :: Do Not Upload` classifier settles the shipped answer against PyPI: "PyPI will always reject packages with classifiers beginning with `Private ::`." The distribution may still ship to a private index, so name where it goes rather than calling it unpublished.
- A lockfile with no publishable manifest beside it is present. An application pinned with `uv.lock` resolves a dependency tree whether or not anybody can install it from an index.

## Release track

PyPI takes the registry-push track. A release uploads a built `sdist` and wheel to the index under a credential, so there is an upload to secure and a credential to scope, which is what assigns the track. The roster records `"track": "registry-push"` for PyPI and the release area's preamble names PyPI in its registry-push list.

Verified 2026-10-11 against https://packaging.python.org/en/latest/guides/writing-pyproject-toml/.
