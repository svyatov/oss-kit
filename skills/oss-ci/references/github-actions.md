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

## Deploying a static site to GitHub Pages

No rule in `STANDARD.md` requires a project to publish a site, so nothing below is cited against a rule ID and none of it is a gap in a project that publishes no site. Write a Pages workflow only where the repository already builds a site and the user asks for it to deploy. Ask in Step 3 rather than inferring the intent from the presence of a static build.

Deployment is a second workflow, not a job added to the CI workflow. CI builds the site on every pull request to prove the build still works, which is R-CI-01. A deploy runs only after a change lands on the default branch, because a pull request must not replace what visitors are served.

```yaml
name: pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

# One deployment at a time, and an in-flight one finishes: Pages serves whatever
# published last, so cancelling mid-publish leaves the older build live with no
# failed run to point at.
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7  # oss-harden pins this to a commit SHA
      - run: npm ci  # placeholder: the project's own install command
      - run: npm run build  # placeholder: the project's own build command
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist  # placeholder: the directory the build writes

  deploy:
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

Everything not marked a placeholder is copied exactly: the `concurrency` group with `cancel-in-progress: false`, the `needs: build` edge, `upload-pages-artifact` in `build` and `deploy-pages` in `deploy` in that order across it, the deploy job's two `permissions`, and `environment: name: github-pages`. Those lines are what the deployment is; the three placeholders are the only project-specific values in the file.

The two jobs exist so the privileged token never sits in the same job as the project's own build command. `upload-pages-artifact` hands the built directory across the job boundary, so the split costs the `needs: build` edge and a second `runs-on`, and it matches GitHub's own Node and Jekyll Pages starters. The reason is consistency rather than exposure: whoever controls `npm run build` already controls the artifact that gets deployed. What it buys is that `oss-ci` and `oss-publish` stop teaching opposite things about where `id-token: write` may sit.

GitHub documents `pages: write` and `id-token: write` as the minimum for the deploying job. Declare them on the job and leave the top-level block at `contents: read`, which is what R-SEC-02 asks for and `oss-harden` owns. GitHub's own starter workflow at `actions/starter-workflows` grants all three at the top level, so a project that copies it verbatim inherits an R-SEC-02 finding along with the deploy. Its pins also lag: it selects `upload-pages-artifact@v3` and `configure-pages@v5` where the current majors are v5 and v6.

The `concurrency` block above is the one place R-CI-05's cancellation guidance inverts. Cancelling a superseded test run costs a contributor nothing, and `cancel-in-progress` stays scoped to pull requests in the CI workflow. A deploy cancelled mid-publish can leave the previous build live, so the deploy workflow keeps its own group and never cancels.

`environment: github-pages` is required rather than decorative. GitHub creates the environment automatically, and it is what applies deployment protection rules and reports the deployed URL back to the run.

`actions/configure-pages` is optional, and where it is needed it goes in the `build` job, between `checkout` and the build command. It exports the site's base path and origin, which a project served from `owner.github.io/repo/` usually needs and a build reads only if it runs after the export. Placing it in `deploy`, or after `npm run build`, exports the values into a job or a step that has already finished with them, and the run stays green: the site deploys with every asset path resolving against the domain root, so the pages return 404s for their own CSS and JavaScript with nothing in the log to point at. A site whose own config already states its full URL, as a custom domain implies, skips the action and has one less thing to pin and update.

Two things the workflow cannot do for itself, both the repository owner's to set, so present them in Step 8 with the resolved URL `https://github.com/<owner>/<repo>/settings/pages` rather than running them:

Set the publishing source to GitHub Actions. GitHub documents this as a required step, and it is what routes an artifact this workflow uploads to the live site.

On the Free plan, Pages serves only from a public repository, so a private project has nothing to deploy to until it is public or the plan changes.

A custom domain is set once in those same settings and needs no file in the repository: GitHub documents that when publishing from a custom Actions workflow, no `CNAME` file is created and an existing one is ignored. A repository carrying a `CNAME` under its published directory is either left from a branch-based deploy or written on the assumption that the artifact sets the domain, and it does neither. Verifying the domain is what stops another account from claiming it if the site is ever disabled; that is security posture, so hand it to `oss-harden`.

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
