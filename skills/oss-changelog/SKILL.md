---
name: oss-changelog
description: "Maintain a changelog and make versioning decisions for an open source project: Keep a Changelog structure, semantic version choices, release notes generated from merged work, and deprecation policy. Use when the user asks to write or update a CHANGELOG, decide whether a change is major, minor, or patch, draft release notes, or deprecate an API. The prose style belongs to oss-writing; the publishing mechanics belong to oss-publish."
license: MIT
---

# Changelog and versioning

Keep `CHANGELOG.md` in Keep a Changelog format, decide the semver bump a set of merged changes forces, write the release entry from the merged work, and run a deprecation window before an API is removed. The sentences themselves follow `oss-writing`; this skill decides what goes in and what version it ships under. Publishing the tagged release, the workflow that builds and uploads it, belongs to `oss-publish`.

## The exception to describing what is

`oss-writing` bans diff-anchored documentation: a doc describes the current state of the code, not the history that produced it, because a reader who wants that history reads the commit log. A changelog entry is the documented exception to that rule. Its whole job is to describe a change: what was added, what behavior is different, what stopped working, so a user who skipped a few versions can read what happened to them without diffing tags. Write changelog entries as changes, not as a description of the current state; that is the one place in this kit where `oss-writing`'s default does not apply.

## Keep a Changelog structure

`CHANGELOG.md` opens with an `## [Unreleased]` section that collects merged work not yet tagged. Each released version gets its own heading in the exact form `## [X.Y.Z] - YYYY-MM-DD`, newest version first. Entries under both kinds of heading are grouped under one or more of six category headings, and only these six, spelled exactly:

- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities

Omit a category heading entirely when a release has nothing in it; do not leave an empty `### Fixed` with no entries under it. An entry is one line, not a bullet that restates a commit subject followed by a hash; it names the change from a user's point of view, the way `oss-writing` writes any sentence. A release with only internal changes, refactors, tests, or CI, gets no entry at all: a user upgrading has nothing to read about, and a changelog padded with internal housekeeping trains readers to stop reading it.

R-CHG-01 is the check for this structure.

## Deciding the semver bump

A version is `MAJOR.MINOR.PATCH`. The specification's rule is about the public API, not about which files changed: increment MAJOR when a change is backward incompatible with the public API, increment MINOR when new functionality is backward compatible, increment PATCH when a fix is backward compatible. The specification also states that the public API can be declared in code or exist strictly in documentation, so a documented contract is part of the API even where no type system enforces it.

The test that survives both cases people get wrong: will something that worked, unmodified, on the previous version keep working, unmodified, on the new one? If no, the change is backward incompatible and forces MAJOR, regardless of what kind of change produced it.

A bug fix that changes documented behavior is the first case people get wrong. The instinct is that a fix is always a patch, because `Fixed` sounds small. But if the documentation described the old, buggy behavior, then that behavior was the public API, and correcting it is a backward incompatible change to that API. Apply the test: a caller who wrote code against the documented behavior now gets a different result from the same call, unmodified. That forces MAJOR. Only a fix to behavior nothing documented, one no caller could have knowingly relied on, stays a PATCH.

A new required config value is the second case. The instinct is that adding something is growth, so it should be MINOR. But a config value with no default, one the project now refuses to start without, breaks every existing deployment the moment they upgrade without editing their config. Apply the test: a config file that worked, unmodified, on the previous version no longer starts the previous version. That forces MAJOR. A new config value with a default that preserves the old behavior is backward compatible and stays MINOR.

R-CHG-02 is the check for the bump rule. R-CHG-03 is the check that the release tag, every manifest that declares a version, and the newest changelog heading agree; update all of them together, not the changelog alone. A repository that ships several manifests, one per host or one per package, has to bump every one of them.

## Writing release notes from merged work

A release entry names what changed for a user, not the pull requests that produced it. Read the merged work since the last tag, not the commit messages verbatim: a commit message addresses another contributor reading `git log`, a changelog entry addresses a user deciding whether to upgrade. Fold multiple commits that implement one user-visible change into one entry; do not list each commit as its own line. Drop anything with no user-visible effect: a refactor, a test added for existing behavior, a CI config change, a dependency bump with no behavior change.

When the forge auto-generates release notes from merged pull requests, do not publish those as the release body. They repeat the pull request list, which is what the merge history already shows, and they say nothing a user upgrading needs. Reproduce the `CHANGELOG.md` entry for that version as the release body instead, so the two never diverge. R-CHG-04 is the check for that agreement.

## Deprecation policy

Deprecate before removing. An item that will be removed appears under `Deprecated` in a release before it appears under `Removed` in a later one, and at least one released minor version ships with the item still working, so a user who upgrades promptly has a version where the warning shows and the old path still runs. Removing in the same release that first mentions deprecation gives no window at all, which is a removal wearing a deprecation label.

The deprecation warning names three things: what is deprecated, what replaces it, and when it goes away, stated as a version rather than a date, because a user tracks the version they are on, not a calendar. `connect() is deprecated and will be removed in 3.0; use connectAsync() instead` gives a caller everything needed to act, unlike a warning that only says a feature is deprecated. Emit the warning at runtime, not only in the changelog, so a caller who never reads release notes still sees it. R-CHG-05 is the check for the deprecate-before-remove ordering.

## Scope

This skill owns the changelog and versioning rules below, the R-CHG rules. It does not own the sentences: once an entry's content is decided, phrasing it in plain, active prose free of marketing language is `oss-writing`'s rule, R-DOC-05. It does not own publishing: building the tagged artifact, authenticating to a registry, and gating the release behind approval are `oss-publish`'s R-PUB rules. Do not draft commit or pull request prose, or write a publish workflow, from this skill; note that the project needs it and hand the work to the owning skill.

## Rules this skill owns

R-CHG-01: The repository keeps CHANGELOG.md in Keep a Changelog format

R-CHG-02: Versions follow semantic versioning, and any breaking change bumps the major

R-CHG-03: The release tag, every versioned manifest, and the newest changelog entry are the same version

R-CHG-04: Forge release notes reproduce the changelog entry for that version

R-CHG-05: A public API is deprecated in a release before it is removed
