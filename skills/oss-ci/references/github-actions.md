# GitHub Actions reference

Concrete syntax for the decisions `SKILL.md` makes. This file covers what runs: triggers, matrices, caching, timeouts, and cancellation. It does not cover the security posture of the same workflow file, such as `permissions:`, pinning `uses:` to a commit SHA, or OIDC; that is `oss-harden`'s reference. It does not cover a publish job; that is `oss-release`'s reference.

## Triggers (R-CI-01)

Run on push to the default branch and on every pull request:

```yaml
on:
  push:
    branches: [main]
  pull_request:
```

Name the actual default branch; it is not always `main`. A workflow that triggers only on `push` misses regressions introduced by a pull request before it merges.

## Call project automation, not inline logic (R-CI-02)

A step should call the same command a contributor runs locally and the one `CONTRIBUTING.md` documents, not a longer invocation with extra flags baked in:

```yaml
# Avoid: logic lives in CI only, cannot be run locally the same way
- run: |
    jest --coverage --ci
    eslint src/ --format=stylish

# Prefer: CI calls the project's own commands
- run: npm test
- run: npm run lint
```

When the project has no such script yet, ask whether to add one before writing an inline command into the workflow. An inline command that drifts from what `CONTRIBUTING.md` tells a human is exactly what R-CI-02 checks for.

Order jobs and steps so a fast check fails before a slow one starts: lint before test, test before build.

## Test matrix (R-CI-03)

Build the matrix from the version range the manifest declares, not a single pinned version:

```yaml
strategy:
  fail-fast: false
  matrix:
    node-version: ['20', '22', '24']
steps:
  - uses: actions/setup-node@<pinned-sha>
    with:
      node-version: ${{ matrix.node-version }}
```

`fail-fast: false` lets every matrix cell finish so a contributor sees every version that broke, not just the first. Include the oldest and the newest version the manifest claims to support; do not add or drop a version the manifest does not mention.

## Caching keyed on the lockfile (R-CI-04)

Most `setup-*` actions (`actions/setup-node`, `actions/setup-python`, `actions/setup-go`) accept a `cache:` input that hashes the project's lockfile automatically:

```yaml
- uses: actions/setup-node@<pinned-sha>
  with:
    node-version: ${{ matrix.node-version }}
    cache: npm
```

When the ecosystem's `setup-*` action has no built-in cache, use `actions/cache` directly and include a restore-key prefix, so a changed lockfile still warms from the closest prior cache instead of starting cold:

```yaml
- uses: actions/cache@<pinned-sha>
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-
```

A cache key with no lockfile hash serves stale dependencies after an upgrade. A key with no `restore-keys` fallback caches nothing useful the moment the lockfile changes.

## Timeout and cancellation of superseded runs (R-CI-05)

Every job sets `timeout-minutes`, because the platform default is six hours:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
```

Cancel a run made redundant by a newer push to the same ref:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Scoping `cancel-in-progress` to pull request events, rather than always true, avoids cancelling a push to the default branch mid-run.

## Secrets

Secrets configured on the repository are not available to a workflow run triggered by a pull request from a fork. A job that needs one should check for it rather than fail outright:

```yaml
- name: Run integration tests
  if: ${{ secrets.API_KEY != '' }}
  run: npm run test:integration
  env:
    API_KEY: ${{ secrets.API_KEY }}
```

List every secret a generated workflow needs, with the `gh secret set` command to add it, but do not run that command; setting a secret is the repository owner's action, not this skill's.
