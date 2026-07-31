# PyPI

## Version sources (R-CHG-03)

`pyproject.toml`'s `[project] version` is the source where the project states it statically. The field is required, and the specification allows exactly two shapes: a literal value, or the name `version` listed in `dynamic`, in which case the build backend computes it and a backend must raise an error if neither is present.

A dynamic version moves the source somewhere else, and where it goes decides what R-CHG-03 compares. A backend that reads the git tag leaves the tag as the only source, so tag and changelog are the whole comparison. A backend that reads an attribute leaves a Python file holding `__version__` as the source, and that file is what a release has to update. Read `[build-system] requires` and the backend's own configuration table to find which of the two a repository uses before looking for a number to compare.

Older projects state the version in `setup.py` or `setup.cfg` instead. A repository carrying both `pyproject.toml` and one of those has two candidate sources and only one of them is read at build time.

## Version syntax (R-CHG-02)

PyPI versions follow the Python version specification, not SemVer, and the two agree only on the plain three-part case. A Python version is an optional epoch `N!`, a release segment `N(.N)*` with no fixed number of components, then any of a pre-release `aN`, `bN`, or `rcN`, a post-release `.postN`, a development release `.devN`, and a local version `+label`.

Normalization is the part that surprises a reader comparing strings. Letters lowercase, so `1.1RC1` becomes `1.1rc1`. Separators before a pre-release segment disappear, so `1.1-a1` becomes `1.1a1`. Alternative spellings fold, with `alpha` to `a`, `beta` to `b`, and `c` to `rc`. An implicit number fills in, so `1.2a` becomes `1.2a0`. Leading zeros drop. The practical consequence is that a SemVer prerelease such as `1.0.0-rc.1` is not what the index will show, and the specification says users should prefer to state an already-normalized version.

So compare normalized forms when checking that the tag, the version source, and the changelog heading agree, and write the normalized form in all three. R-CHG-02's bump semantics are unaffected by any of this; what changes is the spelling.

## Major version in package identity (R-CHG-07)

PyPI does not encode the major version in package identity. A distribution name is stable across majors and every major is a release of the same project, so R-CHG-07 does not reach this ecosystem. The one identity rule that does apply is name normalization, which is about how a name is written rather than which version it carries.

## Withdrawing a release (R-CHG-01)

Yanking is the mechanism, and it is reversible. A yank is recorded in the simple index as a `data-yanked` attribute that may carry a reason string, and PyPI displays that reason on the release page and serves it through the index APIs installers read. An installer must ignore a yanked release when the constraints can be satisfied without it, and may refuse it outright; a yanked file is still installable when a version is pinned exactly with `==` or `===`. The attribute is not immutable, so a yank may be rescinded and set again, and tooling has to cope with an unyanked file. Yank from the release management page for the project on PyPI.

Deleting is a different operation with no way back. "Deletion of a project, release or file on PyPI is permanent and irreversible, without exception." A deleted filename can never be reused, a deleted project releases its name to any other PyPI user, and PyPI administrators cannot restore any of it. Yank rather than delete: a yank keeps the record a changelog points at, and a deletion turns every link to it into a 404 while handing the name away.

`[YANKED]` on the changelog heading maps to a yank. Keep the entry, add the reason, and remove the marker if the yank is later rescinded.

Verified 2026-07-31 against [Writing your pyproject.toml](https://packaging.python.org/en/latest/specifications/pyproject-toml/), [Version specifiers](https://packaging.python.org/en/latest/specifications/version-specifiers/), [File yanking](https://packaging.python.org/en/latest/specifications/file-yanking/), [Yanking a release](https://docs.pypi.org/project-management/yanking/), and [PyPI help](https://pypi.org/help/).
