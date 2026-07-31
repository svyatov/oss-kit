# PyPI

## License declaration (R-COM-01)

`pyproject.toml` declares it under `[project]`. Since PEP 639, `license` is a string holding an SPDX license expression: `license = "GPL-3.0-or-later"`, or `license = "MIT AND (Apache-2.0 OR BSD-2-Clause)"` where more than one applies. A license SPDX does not list gets a `LicenseRef-<idstring>` identifier. A separate `license-files` key lists the legal files shipped with the distribution, written as globs such as `["LICEN[CS]E*", "vendored/licenses/*.txt", "AUTHORS.md"]`.

Two older forms are still common in the wild and neither is what to write today. PEP 621's table form, `license = { file = "LICENSE" }` or `license = { text = "..." }`, is deprecated by PEP 639. So are the `License ::` Trove classifiers: PEP 639 replaces them with the `License-Expression` core metadata field, permits a build tool to raise an error when a license expression and a license classifier are both present, and forbids tools from adding such classifiers themselves. Read a classifier in a project that predates the change, and do not add one.

A project that still builds from `setup.py` or `setup.cfg` states the same core metadata through that file's own keys, so read whichever file the build backend actually consumes rather than assuming `pyproject.toml` is authoritative in a repository that has all three.

The manifest side of R-COM-01 is that license expression, and the file side is the root license file. Note that `license-files` and the root license file answer different questions: one says what the distribution ships, the other is what the rule reads.

Source: [Writing your pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/) and [PEP 639](https://peps.python.org/pep-0639/).

## Funding platform name

Tidelift's platform name for this ecosystem is `pypi`, so the GitHub funding file's entry reads `tidelift: pypi/<package-name>` against the name the project publishes under. The accepted key format is `PLATFORM-NAME/PACKAGE-NAME`, described in `github.md` beside the rest of the accepted keys.

The roster at `skills/oss-audit/ecosystems.json` records `"tidelift": "pypi"` and is the canonical copy. This line exists because a single-skill install of `oss-community` does not carry that file; where the two disagree, the roster is right and this line is corrected to it.

Verified 2026-07-31 against [Writing your pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/), [PEP 639](https://peps.python.org/pep-0639/), and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
