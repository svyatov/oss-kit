# npm

Concrete flow for the decisions `SKILL.md` makes, for a package published to the public npm registry. npm accepts three trusted publishing providers: GitHub Actions, GitLab CI/CD on GitLab.com shared runners, and CircleCI Cloud. This file covers GitHub Actions and GitLab CI/CD because `oss-kit`'s forge scope is GitHub and GitLab. Self-hosted runners are not supported. Trusted publishing needs npm CLI 11.5.1 or newer and Node 22.14.0 or newer. Staged publishing needs npm CLI 11.15.0 or newer. Resolve an exact supported Node release from Node's official archive immediately before writing the workflow and verify the bundled npm version there. As of July 2026, Node 24.18.0 bundles npm 11.16.0. Do not install a floating npm range in the credentialed job.

Source: [npm Docs, Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/), [npm Docs, Staged publishing](https://docs.npmjs.com/staged-publishing/), and [Node.js download archive, Node 24.18.0](https://nodejs.org/en/download/archive/v24.18.0).

## Gather facts (Step 1)

Read the root `package.json`. If it declares `workspaces`, or a `pnpm-workspace.yaml` exists, the repository is a monorepo: enumerate every workspace `package.json`. Only a package without `"private": true` needs npm settings. Get the owner and repository from the `repository` field, normalizing `git+https://github.com/owner/repo.git`, `github:owner/repo`, or `owner/repo`, falling back to `git remote get-url origin`. Check whether each public package is already published with `npm view <name> version`; an `E404` means it is not, and [Not yet published packages](#not-yet-published-packages) below covers that case.

## Configure trusted publishing (Step 2)

On npmjs.com, open `https://www.npmjs.com/package/<name>/access` for the package (in a monorepo, once per public workspace package) and add a trusted publisher.

### GitHub Actions

Enter:

- Organization or user: the owner from Step 1
- Repository: the repository name from Step 1
- Workflow filename: the publish workflow's filename only, for example `publish.yml`, not the full path
- Environment: the approval environment name from `SKILL.md` Step 4, for example `release`
- Allowed actions: enable `npm stage publish` and leave `npm publish` disabled, so a compromised or bypassed CI run still cannot ship a version without the 2FA approval in Step 4 below

In the workflow, the publish job needs:

```yaml
permissions:
  id-token: write
  contents: read
steps:
  - uses: actions/setup-node@v7
    with:
      node-version: '24.18.0'
      registry-url: 'https://registry.npmjs.org'
      package-manager-cache: false
```

No `NPM_TOKEN` or any other registry secret is needed; npm's CLI exchanges the workflow's OIDC token for a publish token automatically once the trusted publisher above is configured.

### GitLab CI/CD

Enter, at `https://www.npmjs.com/package/<name>/access`:

- Namespace: the GitLab username or group name that owns the project
- Project name: the project name
- Top-level CI file path: the path to the pipeline file, for example `.gitlab-ci.yml`
- Environment name: the approval environment name from Step 4, for example `release`
- Allowed actions: enable `npm stage publish` only, matching GitHub Actions above

In the pipeline, the publish job needs:

```yaml
id_tokens:
  NPM_ID_TOKEN:
    aud: "npm:registry.npmjs.org"
```

## Write the hardened release workflow (Step 3)

The publish job installs no dependencies, uses no cache, and calls no third-party action beyond checkout, `actions/setup-node`, and `actions/download-artifact`; anything else running in that job could publish the package. Build the package in a separate job, upload the output as an artifact, and download it in the publish job:

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-node@v7
        with:
          node-version: '24.18.0'
          package-manager-cache: false
      - run: npm ci --ignore-scripts
      - run: npm test  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-node@v7
        with:
          node-version: '24.18.0'
          package-manager-cache: false
      - run: npm ci --ignore-scripts
      - run: test "${GITHUB_REF_NAME#v}" = "$(node -p "require('./package.json').version")"
      - run: npm run build
      - run: npm pack --ignore-scripts
      - uses: actions/upload-artifact@v7
        with:
          name: package-tarball
          path: '*.tgz'
          retention-days: 1

  publish:
    runs-on: ubuntu-latest
    needs: [test, build]
    environment: release
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: package-tarball
          path: package/
      - uses: actions/setup-node@v7
        with:
          node-version: '24.18.0'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false
      - run: npm stage publish package/*.tgz --ignore-scripts
```

The version comparison assumes tags such as `v1.2.3`; derive the comparison from the repository's actual tag format. `npm pack` creates the exact tarball handed to `npm stage publish`, so the credentialed job does not check out source, install dependencies, or rebuild. `package-manager-cache: false` prevents `setup-node` from automatically restoring a package-manager cache in the credentialed job.

`oss-harden` pins every `uses:` line above to a commit SHA and sets this workflow's `permissions:`, including the `contents: read` this skill left off the test and build jobs above; do not pin them or add permissions here. On GitLab CI/CD, use separate test and build jobs, pass the resulting `.tgz` as an artifact, and make the publish job run only `npm stage publish package/*.tgz --ignore-scripts`. Give that job `environment: name: release` with `when: manual`, plus the `id_tokens` block from Step 2.

If an existing workflow uses `secrets.NPM_TOKEN`, remove it from the YAML now and tell the user to delete the corresponding secret and revoke the token once the new flow is verified.

## Gate on manual approval (Step 4)

Two gates apply together, not as alternatives:

The workflow-level gate is the `environment: release` on the publish job above, with required reviewers configured at `https://github.com/<owner>/<repo>/settings/environments`, or, on GitLab Premium or Ultimate, a protected environment with approval rules at the project's Settings > CI/CD > Protected environments. GitHub required reviewers work for public repositories on current plans; private or internal repositories need GitHub Enterprise Cloud. If the forge plan lacks this gate, keep the environment binding because it is part of the npm trusted-publisher identity and rely on the registry gate below for R-PUB-04.

The registry-level gate is npm's staged publishing: the workflow runs `npm stage publish`, which uploads the package to a staging area without requiring 2FA, and a maintainer then runs `npm stage approve <stage-id>` from the CLI or approves it on npmjs.com, which does require 2FA. Because the trusted publisher above only allows `npm stage publish` and not `npm publish`, no run of this workflow, compromised or not, can ship a version without that 2FA step. Also set publishing access at `https://www.npmjs.com/package/<name>/access` to "Require two-factor authentication and disallow tokens", which revokes any existing publish token; warn the user first if another automation still uses one.

Source: [npm Docs, Staged publishing for npm packages](https://docs.npmjs.com/staged-publishing/).

## Verify provenance (Step 5)

When publishing a public package from a public GitHub or GitLab repository through trusted publishing, npm generates a provenance attestation automatically; no `--provenance` flag is needed. npm does not generate provenance for a private repository, even when the package is public. After approval publishes the staged version, verify the exact installed version in a clean temporary project:

```bash
npm install <name>@<version> --ignore-scripts
npm audit signatures
```

The output must report verified provenance for that dependency. The package page also shows provenance details. A bare `npm audit signatures` in the source repository does not verify the newly published package unless that exact version is installed there.

Source: [npm Docs, Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/) and [npm Docs, Viewing package provenance](https://docs.npmjs.com/viewing-package-provenance/).

## Not yet published packages

A trusted publisher is configured on the package's npm settings page, which does not exist until the package is published once. If `npm view <name>` returned `E404`: confirm the name is actually free rather than restricted, then have the user publish the first version manually and interactively, with 2FA, from their own machine: `npm publish --ignore-scripts` (add `--access public` for a scoped package). That single release has no provenance and no trusted publisher; every release after it goes through the flow above, starting with adding the trusted publisher immediately after the manual publish.

## Monorepo packages

Every public workspace package needs its own trusted publisher entry pointing at the same repository and workflow filename; a package left out stays unprotected. `npm stage` is unaware of workspaces. Pack each publishable workspace in the build job, then stage each resulting tarball explicitly, preferably in one approval-gated publish job per independently versioned package. Match each job's tag trigger and version check to that package.
