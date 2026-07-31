# PyPI

## Version badge

Shields.io serves this one at `img.shields.io/pypi/v/PACKAGE`, taking the project name as its only path parameter.

The default label is `pypi`. Keep it. PyPI normalizes a project name for its own URLs, lowercasing it and folding runs of `.`, `-`, and `_` into a single `-`, so a project whose declared name carries capitals or underscores gets a badge and a link that do not look like the name in `pyproject.toml`. That is correct rather than a typo to fix.

Link the badge to the project page:

```markdown
[![pypi](https://img.shields.io/pypi/v/PACKAGE)](https://pypi.org/project/PACKAGE/)
```

## Install command

```bash
python3 -m pip install "PACKAGE"
```

That is the form the Python Packaging User Guide gives for Unix and macOS, with `py -m pip install "PACKAGE"` for Windows. The module form rather than a bare `pip` names which interpreter the package lands in, which is the whole question on a machine carrying more than one.

The guide quotes the argument, and the quotes stop mattering only while there is no version specifier. `python3 -m pip install PACKAGE>=2` redirects the shell into a file called `=2`, so keep the quotes in the README rather than teaching a form that breaks the moment a reader pins.

A README serving both platforms shows both lines under one fence, or shows the Unix form and says so. Do not invent a third form, and do not show an installer the project does not document itself: `uv`, `pipx`, and `conda` each install a different thing in a different place, and the project decides which of them it supports.

Verified 2026-07-31 against [Installing Packages](https://packaging.python.org/en/latest/tutorials/installing-packages/), [Package name normalization](https://packaging.python.org/en/latest/specifications/name-normalization/), [PyPI Version badge](https://shields.io/badges/py-pi-version), and `services/pypi/pypi-version.service.js` in [badges/shields](https://github.com/badges/shields).
