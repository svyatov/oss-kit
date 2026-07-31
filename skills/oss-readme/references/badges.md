# Badge policy

Optional, and at most three, in this order when present: version, CI, coverage. Omit any that does not apply; a repository where none apply gets no badge row.

Use the data provider's documented badge URL when it has one. Use Shields.io only for facts whose provider does not publish a badge. This removes an unnecessary intermediary from CI and coverage status while keeping version badges available across registries.

## Placement

Own paragraph directly below the opening sentence, one badge per source line:

```markdown
# project-name

One-sentence description of what it does and why it is different.

[![version](https://img.shields.io/github/v/tag/owner/project-name?sort=semver&label=version)](https://github.com/owner/project-name/tags)
[![CI](https://github.com/owner/project-name/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/owner/project-name/actions/workflows/main.yml)
[![coverage](https://codecov.io/gh/owner/project-name/branch/main/graph/badge.svg)](https://app.codecov.io/gh/owner/project-name)
```

Markdown joins consecutive lines into one paragraph, so this renders as a single row while keeping each badge a one-line diff.

Never put badges inside the `#` heading: they leak into the generated anchor slug and turn the title into alt-text soup in plain-text renderers.

## 1. Version

Keep the registry's own label, since it tells the reader where the package lives for free. Relabel only where the default names a git artifact rather than a published version, which is the tag badge on both forges: it labels itself `tag`, and `label=version` is what a reader needs.

A repository published to no registry falls back to that tag badge, and so does an ecosystem whose registry serves no version endpoint. It is `https://img.shields.io/github/v/tag/OWNER/REPO?sort=semver&label=version`, or `https://img.shields.io/gitlab/v/tag/NAMESPACE/PROJECT?sort=semver&label=version` on GitLab, linked to the repository's tag list. Both sort by tag date without `sort=semver`, which reports whichever tag was pushed last rather than the highest version.

The endpoint, the label, the link target, and the install command for each ecosystem live in one file per ecosystem: [npm](ecosystems/npm.md), [PyPI](ecosystems/pypi.md), [RubyGems](ecosystems/rubygems.md), [crates.io](ecosystems/crates.md), [Go modules](ecosystems/go-modules.md), [Packagist](ecosystems/packagist.md), [NuGet](ecosystems/nuget.md), [Maven Central](ecosystems/maven-central.md), [Hex](ecosystems/hex.md), [pub.dev](ecosystems/pubdev.md), and [container images](ecosystems/containers.md). Read the one the project publishes to.

## 2. CI

Use GitHub Actions' documented native status badge. It reports the default branch when `branch` is absent, but spell out the real default branch so the README states what it measures.

```
https://github.com/OWNER/REPO/actions/workflows/WORKFLOW.yml/badge.svg?branch=DEFAULT_BRANCH
```

Link to `https://github.com/OWNER/REPO/actions/workflows/WORKFLOW.yml`. Substitute the real workflow filename and default branch.

## 3. Coverage

When the repository uses Codecov, use Codecov's documented native badge and link it to the report. Substitute the actual forge and default branch. Do not add a Codecov badge to a repository that uploads coverage somewhere else.

```
https://codecov.io/gh/OWNER/REPO/branch/DEFAULT_BRANCH/graph/badge.svg
```

Link to `https://app.codecov.io/gh/OWNER/REPO`.

## What never gets a badge

Docs links, language-version requirements, type-system claims, bundle size, downloads, license, sponsorship, chat rooms.

A badge earns its place only by showing a live fact that changes without anyone editing the README. Everything on that list is either static (a link wearing a status costume), hardcoded in the badge URL and therefore guaranteed to go stale, or vanity. Facts worth stating go in the Facts bullet list instead: 141 bytes minified and gzipped outweighs any badge.
