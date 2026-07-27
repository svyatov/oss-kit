# Badge policy

Optional, and at most three, in this order when present: version, CI, coverage. Omit any that does not apply; a repository where none apply gets no badge row.

Use the data provider's documented badge URL when it has one. Use Shields.io only for facts whose provider does not publish a badge. This removes an unnecessary intermediary from CI and coverage status while keeping version badges available across registries.

## Placement

Own paragraph directly below the opening sentence, one badge per source line:

```markdown
# project-name

One-sentence description of what it does and why it is different.

[![gem](https://img.shields.io/gem/v/project-name)](https://rubygems.org/gems/project-name)
[![CI](https://github.com/owner/project-name/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/owner/project-name/actions/workflows/main.yml)
[![coverage](https://codecov.io/gh/owner/project-name/branch/main/graph/badge.svg)](https://app.codecov.io/gh/owner/project-name)
```

Markdown joins consecutive lines into one paragraph, so this renders as a single row while keeping each badge a one-line diff.

Never put badges inside the `#` heading: they leak into the generated anchor slug and turn the title into alt-text soup in plain-text renderers.

## 1. Version

Keep the registry's own label (`gem`, `npm`, `pypi`), since it tells the reader where the package lives, for free. Go is the one exception: `tag` names a git artifact rather than a published version, so relabel it.

| Ecosystem | Badge | Link |
|---|---|---|
| Ruby | `https://img.shields.io/gem/v/NAME` | `https://rubygems.org/gems/NAME` |
| Node | `https://img.shields.io/npm/v/NAME` | `https://www.npmjs.com/package/NAME` |
| Python | `https://img.shields.io/pypi/v/NAME` | `https://pypi.org/project/NAME` |
| Go | `https://img.shields.io/github/v/tag/OWNER/REPO?label=version` | `https://pkg.go.dev/github.com/OWNER/REPO` |

Go uses the git tag because that is what the module proxy resolves; it has no concept of a GitHub Release. The same `github/v/tag` form is the fallback for any repo not published to a registry.

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
