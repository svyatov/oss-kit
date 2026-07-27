---
name: oss-changelog
description: "Maintain a changelog and make versioning decisions for an open source project: Keep a Changelog structure, semantic version choices, release notes generated from merged work, and deprecation policy. Use when the user asks to write or update a CHANGELOG, decide whether a change is major, minor, or patch, draft release notes, or deprecate an API. The prose style belongs to oss-writing; the publishing mechanics belong to oss-publish."
license: MIT
---

# Changelog and versioning

Keep `CHANGELOG.md` in Keep a Changelog 2.0.0 format, decide the Semantic Versioning bump a set of merged changes forces, write the release entry from the merged work, and run a deprecation window before an API is removed. The sentences themselves follow `oss-writing`; this skill decides what goes in and what version it ships under. Publishing the tagged release, the workflow that builds and uploads it, belongs to `oss-publish`.

## The exception to describing what is

`oss-writing` bans diff-anchored documentation: a doc describes the current state of the code, not the history that produced it, because a reader who wants that history reads the commit log. A changelog entry is the documented exception to that rule. Its whole job is to describe a change: what was added, what behavior is different, what stopped working, so a user who skipped a few versions can read what happened to them without diffing tags. Write changelog entries as changes, not as a description of the current state; that is the one place in this kit where `oss-writing`'s default does not apply.

## Keep a Changelog structure

Open with `# Changelog` and a two-sentence preamble that says all notable changes are recorded here, links to the pinned [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/) convention, and names the project's versioning scheme. Do not claim Semantic Versioning until the project has declared the public API it covers.

Next comes `## [Unreleased]`, followed by released versions newest first in the form `## [X.Y.Z] - YYYY-MM-DD`. Use the project's actual version syntax when it supports prereleases or another declared scheme. Mark a withdrawn release with `[YANKED]`; never delete it. Group entries under the six standard category headings:

- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities

Omit empty categories. Mark each incompatible change inside `Changed` or `Removed` with `**Breaking:**`, name the affected public interface, and give the short migration step. Link to a migration guide when the steps would make the entry hard to scan. A release may start with a one- or two-sentence summary before its categories.

Curate notable user-facing changes instead of restating commit subjects. Fold one user-visible outcome spread across several commits into one entry. Leave out refactors, tests, CI, and dependency bumps with no user-visible effect. If a version contains no notable change, keep the required version entry and say that it contains internal maintenance only instead of inventing category bullets.

Make every bracketed version heading a reference link. `[Unreleased]` compares the newest tag with `HEAD`, each later version compares its tag with the preceding release, and the oldest version links to its tag. Use the repository's actual forge and tag format. Keep issue and pull request links useful and portable, and collect them as reference links rather than filling entries with bare forge numbers.

R-CHG-01 is the check for this structure.

## Deciding the semver bump

A normal version is `MAJOR.MINOR.PATCH`, with optional prerelease and build metadata. First identify the release unit and its declared public API: library symbols, CLI behavior, configuration, network protocols, file formats, or another documented contract. For a stable `1.0.0` or later release, increment MAJOR for an incompatible public API change, MINOR for a backward-compatible addition or deprecation, and PATCH for backward-compatible fixes.

Major version zero has different upstream semantics: `0.y.z` is initial development and SemVer permits anything to change. This standard uses MINOR for an incompatible change and PATCH for a backward-compatible fix so pre-1.0 versions still communicate risk. Do not force a project to declare stability by changing `0.y.z` to `1.0.0`; that decision defines the public API and belongs to the maintainer.

Source: [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

The test that survives both cases people get wrong: will something that worked, unmodified, on the previous version keep working, unmodified, on the new one? If no, the change is backward incompatible and forces MAJOR, regardless of what kind of change produced it.

A bug fix is not automatically a PATCH. Determine whether the old behavior belonged to the declared public API and whether restoring the intended contract breaks realistic callers. SemVer explicitly calls for judgment when a widely used accidental behavior conflicts with the intended API. If the correction is incompatible with the public API, use MAJOR after 1.0.0; otherwise use PATCH. Do not assume that undocumented behavior is harmless or that every documented bug is a permanent contract.

A new required config value is the second case. The instinct is that adding something is growth, so it should be MINOR. But a config value with no default, one the project now refuses to start without, breaks every existing deployment the moment they upgrade without editing their config. Apply the test: a config file that worked, unmodified, on the previous version no longer starts the previous version. That forces MAJOR. A new config value with a default that preserves the old behavior is backward compatible and stays MINOR.

R-CHG-02 checks the bump rule. R-CHG-03 checks that the release tag, the version sources for that release unit, and its newest changelog entry agree. Do not bump unrelated packages merely because they share a repository. A single product spread across several manifests must update all manifests that describe that product; independently versioned packages need separate release units and changelog sections or files.

## Writing release notes from merged work

A release entry names what changed for a user, not the pull requests that produced it. Read the merged work since the last tag, not the commit messages verbatim: a commit message addresses another contributor reading `git log`, a changelog entry addresses a user deciding whether to upgrade. Fold multiple commits that implement one user-visible change into one entry; do not list each commit as its own line. Drop anything with no user-visible effect: a refactor, a test added for existing behavior, a CI config change, a dependency bump with no behavior change.

Keep `CHANGELOG.md` canonical. A forge-generated pull request list is useful raw material, not a finished changelog or release announcement. Start the release body from the corresponding changelog section without retyping it. It may add a brief announcement, installation or verification details, migration links, contributor credit, and attached-asset context, but it must not omit or contradict notable changes. R-CHG-04 checks that relationship.

## Deprecation policy

Deprecate before removing. For a stable SemVer API, release at least one MINOR version where the old path still works before removing it in a later MAJOR version. During initial development, give users at least one earlier release before removal, then make the incompatible change in a later MINOR version. A longer published support policy takes precedence.

The deprecation notice names what is deprecated, its replacement or migration path, and the earliest removal version. Surface it through the interface users actually encounter: a runtime warning for a library, a diagnostic for a CLI or configuration parser, a compiler annotation where the ecosystem supports one, and documentation plus protocol signaling for a remote API. Avoid noisy warnings that fire where the user cannot act. R-CHG-05 checks both the release ordering and the interface-appropriate notice.

## Scope

This skill owns the changelog and versioning rules below, the R-CHG rules. It does not own the sentences: once an entry's content is decided, phrasing it in plain, active prose free of marketing language is `oss-writing`'s rule, R-DOC-05. It does not own publishing: building the tagged artifact, authenticating to a registry, and gating the release behind approval are `oss-publish`'s R-PUB rules. Do not draft commit or pull request prose, or write a publish workflow, from this skill; note that the project needs it and hand the work to the owning skill.

## Rules this skill owns

R-CHG-01: Each release unit keeps a discoverable changelog in its declared format

R-CHG-02: Semantic versions reflect changes to the declared public API

R-CHG-03: Every release unit uses one version across its tag, manifests, and changelog

R-CHG-04: Forge release notes derive from the changelog without contradicting it

R-CHG-05: A public API is deprecated in a release before it is removed
