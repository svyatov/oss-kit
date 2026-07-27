# GitHub Actions reference

Concrete syntax for the decisions `SKILL.md` makes. This file covers what runs: triggers, matrices, caching, timeouts, and cancellation. It does not cover the security posture of the same workflow file, such as `permissions:`, pinning `uses:` to a commit SHA, or OIDC; that is `oss-harden`'s reference. It does not cover a publish job; that is `oss-publish`'s reference.

Every `uses:` line below names a version tag, not a commit SHA. Resolving a tag to a full commit SHA is R-SEC-01, which belongs to `oss-harden`; emit the tag form here and let `oss-harden` pin it before the workflow ships.

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
  - uses: actions/setup-node@v7  # oss-harden pins this to a commit SHA
    with:
      node-version: ${{ matrix.node-version }}
```

`fail-fast: false` lets every matrix cell finish so a contributor sees every version that broke, not just the first. Include every maintained release line the manifest claims to support, not only the endpoints of a continuous range. Do not add or drop a release line the manifest does not mention.

## Caching keyed on the lockfile (R-CI-04)

Prefer the official setup action's built-in package-manager cache when it supports the repository's package manager. For Node, `actions/setup-node` hashes the dependency file and caches the package manager's global data, not `node_modules`:

```yaml
- uses: actions/setup-node@v7  # oss-harden pins this to a commit SHA
  with:
    node-version: ${{ matrix.node-version }}
    cache: npm
    cache-dependency-path: package-lock.json
```

Use `actions/cache` directly only when no official setup action supports the required cache. Include the lockfile hash and every compatibility boundary in the key. GitHub defines `restore-keys` as prefixes for stale caches, so add one only when the cached tool can safely validate and reuse older content. Never let a fallback cross operating system, architecture, runtime, or package-manager boundaries. Do not cache installed dependency directories that a clean install recreates from the lockfile.

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

Secrets configured on the repository are not available to a workflow run triggered by a pull request from a fork. A job that needs one should check for it rather than fail outright. The `secrets` context is not available in a job's or a step's `if:` condition; a workflow that references it there fails to parse with `Unrecognized named-value: 'secrets'`. Promote the secret into `env:` first, then test the `env` value, which a step's `if:` can read:

```yaml
jobs:
  test:
    env:
      API_KEY: ${{ secrets.API_KEY }}
    steps:
      - name: Run integration tests
        if: ${{ env.API_KEY != '' }}
        run: npm run test:integration
```

List every secret a generated workflow needs, with the `gh secret set` command to add it, but do not run that command; setting a secret is the repository owner's action, not this skill's.
