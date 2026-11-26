# Badge policy

Optional, and at most three, in this order when present: version, CI, coverage. Omit any that does not apply; a repository where none apply gets no badge row.

Use the data provider's documented badge URL when it has one. Use Shields.io only for facts whose provider does not publish a badge. This removes an unnecessary intermediary from CI and coverage status while keeping version badges available across registries.

## Placement

Own paragraph directly below the opening sentence, one badge per source line:

```markdown
# project-name

One-sentence description of what it does and who it is for.

[![version](https://img.shields.io/github/v/tag/owner/project-name?sort=semver&label=version)](https://github.com/owner/project-name/tags)
[![CI](https://github.com/owner/project-name/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/owner/project-name/actions/workflows/main.yml)
[![coverage](https://codecov.io/gh/owner/project-name/branch/main/graph/badge.svg)](https://app.codecov.io/gh/owner/project-name)
```

Markdown joins consecutive lines into one paragraph, so this renders as a single row while keeping each badge a one-line diff.

Never put badges inside the `#` heading: they leak into the generated anchor slug and turn the title into alt-text soup in plain-text renderers.

## 1. Version

Use a registry version badge when its data identifies the published package. Keep its registry label and link to the package page.

For source distributed by version tag, the tag itself identifies the release. The example above uses `label=version` for that case. Use `img.shields.io/github/v/tag/OWNER/REPO?sort=semver` or `img.shields.io/gitlab/v/tag/NAMESPACE/PROJECT?sort=semver` for the highest semantic version. Use only tags belonging to the documented release unit. For a registry package, a source tag alone does not establish publication. Keep the `tag` label if showing that source tag and link to the forge's tag list.

## 2. CI

Use the badge from the CI provider that runs the build. For GitHub Actions, identify the workflow and default branch:

```
https://github.com/OWNER/REPO/actions/workflows/WORKFLOW.yml/badge.svg?branch=DEFAULT_BRANCH
```

Link to `https://github.com/OWNER/REPO/actions/workflows/WORKFLOW.yml`. Substitute the real workflow filename and default branch.

For GitLab CI/CD, append `/badges/BRANCH/pipeline.svg` to the project URL, including any subgroups. Use the project's default branch and link to its pipelines page. See [GitLab project badges](https://docs.gitlab.com/user/project/badges/).

## 3. Coverage

When GitLab CI/CD collects coverage, append `/badges/BRANCH/coverage.svg` to the project URL. Link to the pipeline that reports coverage.

For Codecov, copy the badge and report URLs from the project's badge settings. Check the forge and branch. Omit the coverage badge if the project publishes no coverage result.

## What never gets a badge

Docs links, language-version requirements, type-system claims, bundle size, downloads, license, sponsorship, chat rooms.

A badge earns its place only by showing a live fact that changes without anyone editing the README. Everything on that list is either static (a link wearing a status costume), hardcoded in the badge URL and therefore guaranteed to go stale, or vanity. Facts worth stating go in the Facts bullet list instead: 141 bytes minified and gzipped outweighs any badge.
