---
name: oss-changelog
description: "Maintain a changelog and make versioning decisions for an open source project: Keep a Changelog structure, semantic version choices, release notes generated from merged work, and deprecation policy. Use when the user asks to write or update a CHANGELOG, decide whether a change is major, minor, or patch, draft release notes, or deprecate an API. Also use when someone asks whether something is a breaking change, whether it needs a major bump, or whether to yank a release. The prose style belongs to oss-writing; the publishing mechanics belong to oss-publish."
license: MIT
---

# Changelog and versioning

Keep `CHANGELOG.md` in the convention it declares, Keep a Changelog 2.0.0 where the project has none yet, decide the Semantic Versioning bump a set of merged changes forces, write the release entry from the merged work, and run a deprecation window before an API is removed. The sentences themselves follow `oss-writing`; this skill decides what goes in and what version it ships under. Publishing the tagged release, the workflow that builds and uploads it, belongs to `oss-publish`.

Write changelog entries as changes rather than as a description of the current state. That is the exception `oss-writing` already carves out from its ban on diff-anchored documentation, and a changelog is the artifact it carves it out for.

## Three terms this skill keeps apart

A changelog section is one version's entry inside `CHANGELOG.md`. A forge release body is the text field attached to a tag on GitHub or GitLab. Release notes are what a reader calls either one, so this file uses the first two and R-CHG-04 governs how the second derives from the first.

## Scope

The CHG rules belong here: R-CHG-01 changelog format, R-CHG-02 semantic bumps, R-CHG-03 one version, R-CHG-04 release body, R-CHG-05 deprecation window, and R-CHG-06 vulnerability entries.

This skill owns the changelog and versioning rules above. It does not own the sentences: once an entry's content is decided, phrasing it in plain, active prose free of marketing language is `oss-writing`'s rule, R-DOC-05. It does not own publishing: building the tagged artifact, authenticating to a registry, and gating the release behind approval are `oss-publish`'s R-PUB rules. Do not draft commit or pull request prose, or write a publish workflow, from this skill; note that the project needs it and hand the work to the owning skill.

## Process

### Step 1: Identify the release unit and its manifests

A release unit is one product versioned as a whole, together with every file that states its version. Find them all before deciding anything, because Step 7 has to set the same number in each. Identify the unit's declared public API as well: library symbols, CLI behavior, configuration, network protocols, file formats, or another documented contract. That declaration is what Step 5 measures a change against.

Do not bump unrelated packages merely because they share a repository. A single product spread across several manifests must update all manifests that describe that product; independently versioned packages need separate release units and changelog sections or files.

### Step 2: Read the changelog that already exists

Find `CHANGELOG.md` and read its preamble before writing anything. A changelog that already exists is a file the project's users read, and it lands in one of three states.

There is no changelog. Write one from the structure in Step 6. Backfill only the releases the repository can establish from its own tags, and stop there rather than reconstructing entries from commit history, which produces a list of commits wearing a changelog's headings.

There is a changelog and it declares Keep a Changelog 2.0.0. Add the entry under `## [Unreleased]` and change nothing else. Not the preamble, not the heading style of older releases, not the category names they used.

There is a changelog and it declares a different convention, or an earlier version of this one. Follow what the file declares and leave its pin alone. The convention it names is what its readers and any tooling reading it expect, and a version bump is a change to the file's contract that happens to arrive inside somebody's bug-fix release. Where migrating would genuinely help, propose it to the maintainer as its own piece of work, with what would change; do not perform it while adding an entry.

### Step 3: Read the merged work since the last tag

List the commits that landed after the newest tag:

```bash
git log --oneline "$(git describe --tags --abbrev=0)"..HEAD
```

`git describe --abbrev=0` suppresses the long format and prints the closest tag alone, and `--tags` makes it match a lightweight tag as well as an annotated one, so the range starts at the last release whichever kind the project pushes.

On GitHub, add the merged pull requests, which carry the discussion a commit subject leaves out:

```bash
gh pr list --state merged --search "merged:>=<date of that tag>"
```

That call needs `gh` installed and authenticated. Where it is not, the log alone is enough to work from.

### Step 4: Classify each change as user-visible or not

A changelog section names what changed for a user, not the pull requests that produced it. Read the merged work rather than the commit messages verbatim: a commit message addresses another contributor reading `git log`, a changelog entry addresses a user deciding whether to upgrade. Fold multiple commits that implement one user-visible change into one entry; do not list each commit as its own line.

Drop anything with no user-visible effect: a refactor, a test added for existing behavior, a CI config change, a dependency bump with no behavior change. If a version contains no notable change, keep the required version entry and say that it contains internal maintenance only instead of inventing category bullets.

One kind of dependency bump is the exception. A bump that resolves a publicly known vulnerability in the shipped code or in a run-time dependency reached users, so it belongs under Security, and the entry names an identifier from the published advisory. Where the project ships a built artifact, its build toolchain counts as run-time: a compromised bundler or code generator injects into what users install. A development-only bump stays out, as does a build-only bump in a project that ships only its source. R-CHG-06 is the check.

### Step 5: Decide the semver bump

A normal version is `MAJOR.MINOR.PATCH`, with optional prerelease and build metadata. For a stable `1.0.0` or later release, increment MAJOR for an incompatible public API change, MINOR for a backward-compatible addition or deprecation, and PATCH for backward-compatible fixes.

Major version zero has different upstream semantics: `0.y.z` is initial development and SemVer permits anything to change. This standard uses MINOR for an incompatible change and PATCH for a backward-compatible fix so pre-1.0 versions still communicate risk. Do not force a project to declare stability by changing `0.y.z` to `1.0.0`; that decision defines the public API and belongs to the maintainer.

Source: [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

The test that survives both cases people get wrong: will something that worked, unmodified, on the previous version keep working, unmodified, on the new one? If no, the change is backward incompatible and forces MAJOR, regardless of what kind of change produced it.

A bug fix is not automatically a PATCH. Determine whether the old behavior belonged to the declared public API and whether restoring the intended contract breaks realistic callers. SemVer explicitly calls for judgment when a widely used accidental behavior conflicts with the intended API. If the correction is incompatible with the public API, use MAJOR after 1.0.0; otherwise use PATCH. Do not assume that undocumented behavior is harmless or that every documented bug is a permanent contract.

A new required config value is the second case. The instinct is that adding something is growth, so it should be MINOR. But a config value with no default, one the project now refuses to start without, breaks every existing deployment the moment they upgrade without editing their config. Apply the test: a config file that worked, unmodified, on the previous version no longer starts the previous version. That forces MAJOR. A new config value with a default that preserves the old behavior is backward compatible and stays MINOR.

R-CHG-02 checks the bump rule.

### Step 6: Write or amend the changelog section

This is what a new changelog is written from, and what an existing one is read against rather than rewritten to.

Open with `# Changelog` and a two-sentence preamble that says all notable changes are recorded here, links to the pinned [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/) convention, and names the project's versioning scheme. Do not claim Semantic Versioning until the project has declared the public API it covers.

Next comes `## [Unreleased]`, followed by released versions newest first in the form `## [X.Y.Z] - YYYY-MM-DD`. Use the project's actual version syntax when it supports prereleases or another declared scheme. Mark a withdrawn release with `[YANKED]`; never delete it. Group entries under the six standard category headings:

- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities

Omit empty categories. Mark each incompatible change inside `Changed` or `Removed` with `**Breaking:**`, name the affected public interface, and give the short migration step. Link to a migration guide when the steps would make the entry hard to scan. A release may start with a one- or two-sentence summary before its categories.

Make every bracketed version heading a reference link. `[Unreleased]` compares the newest tag with `HEAD`, each later version compares its tag with the preceding release, and the oldest version links to its tag. Use the repository's actual forge and tag format. Keep issue and pull request links useful and portable, and collect them as reference links rather than filling entries with bare forge numbers.

R-CHG-01 is the check for this structure.

### Step 7: Set that version in every manifest

Write the version decided in Step 5 into every file Step 1 found, and into the changelog heading written in Step 6. R-CHG-03 checks that the release tag, the version sources for that release unit, and its newest changelog entry agree, so all three have to carry one number before the tag is pushed.

### Step 8: Derive the forge release body from the changelog section

Keep `CHANGELOG.md` canonical. A forge-generated pull request list is useful raw material, not a finished changelog. Start the release body from the corresponding changelog section without retyping it. It may add a brief announcement, installation or verification details, migration links, contributor credit, and attached-asset context, but it must not omit or contradict notable changes. R-CHG-04 checks that relationship.

### Step 9: Verify, then hand the tag over

Read each R-CHG rule's `Check:` line in `STANDARD.md` against the changelog, the manifests, and the proposed tag as they now stand, and fix what fails. Start the list again after each fix, because setting a version in one place can leave another disagreeing, and do not report done while any cited rule still fails.

Then hand the tag and the publish workflow to `oss-publish`, which owns building and uploading what the tag points at.

## Deprecation policy

Deprecate before removing. For a stable SemVer API, release at least one MINOR version where the old path still works before removing it in a later MAJOR version. During initial development, give users at least one earlier release before removal, then make the incompatible change in a later MINOR version. A longer published support policy takes precedence.

The deprecation notice names what is deprecated, its replacement or migration path, and the earliest removal version. Surface it through the interface users actually encounter: a runtime warning for a library, a diagnostic for a CLI or configuration parser, a compiler annotation where the ecosystem supports one, and documentation plus protocol signaling for a remote API. Avoid noisy warnings that fire where the user cannot act. R-CHG-05 checks both the release ordering and the interface-appropriate notice.
