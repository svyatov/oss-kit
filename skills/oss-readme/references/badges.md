# Badge policy

Exactly three badges, always in this order: **version, CI, coverage**. No fourth badge, ever.

Everything renders through `img.shields.io` with no `style` parameter, so all three match in height, font, and corner radius by construction. Native vendor badges (GitHub Actions' `badge.svg`, badge.fury, Code Climate) are never used, because mixing renderers is what makes a badge row look ragged.

## Placement

Own paragraph directly below the H1, one badge per source line:

```markdown
# project-name

[![gem](https://img.shields.io/gem/v/project-name)](https://rubygems.org/gems/project-name)
[![CI](https://img.shields.io/github/actions/workflow/status/owner/project-name/main.yml?branch=main&label=CI)](https://github.com/owner/project-name/actions/workflows/main.yml)
[![coverage](https://img.shields.io/codecov/c/github/owner/project-name)](https://app.codecov.io/gh/owner/project-name)

One-sentence description of what it does and why it is different.
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

Identical in every ecosystem. `&label=CI` is required, because shields labels this endpoint `build` by default.

```
https://img.shields.io/github/actions/workflow/status/OWNER/REPO/WORKFLOW.yml?branch=main&label=CI
```

Link to `https://github.com/OWNER/REPO/actions/workflows/WORKFLOW.yml`. Substitute the real workflow filename and default branch.

## 3. Coverage

Codecov everywhere. Never mix in Code Climate or Coveralls.

```
https://img.shields.io/codecov/c/github/OWNER/REPO
```

Link to `https://app.codecov.io/gh/OWNER/REPO`.

## What never gets a badge

Docs links, language-version requirements, type-system claims, bundle size, downloads, license, sponsorship, chat rooms.

A badge earns its place only by showing a **live fact that changes without anyone editing the README**. Everything on that list is either static (a link wearing a status costume), hardcoded in the badge URL and therefore guaranteed to go stale, or vanity. Facts worth stating go in the Facts bullet list, where `**Small.** 141 bytes minified + gzipped.` outweighs any badge.
