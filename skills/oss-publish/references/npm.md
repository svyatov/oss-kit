# npm

Concrete flow for the decisions `SKILL.md` makes, for a package published to the public npm registry. npm accepts three trusted publishing providers: GitHub Actions, GitLab CI/CD (GitLab.com shared runners), and CircleCI. This file covers GitHub Actions and GitLab CI/CD; CircleCI is out of scope for this skill because `oss-kit`'s forge scope is GitHub and GitLab. Self-hosted runners on any provider are not supported. Trusted publishing needs npm CLI 11.5.1 or newer and Node 22.14.0 or newer; check the project's `packageManager` field and lockfile before assuming either is new enough, and tell the user to upgrade rather than falling back to a token silently. Staged publishing, which this file uses for the approval gate in Step 4, needs a higher floor still: npm CLI 11.15.0 or newer, with the same Node 22.14.0 minimum. `actions/setup-node` pins Node, not npm, so the publish job upgrades npm explicitly to meet this floor rather than trusting whatever version the Node release happens to bundle.

Source: [npm Docs, Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/).

## Gather facts (Step 1)

Read the root `package.json`. If it declares `workspaces`, or a `pnpm-workspace.yaml` exists, the repository is a monorepo: enumerate every workspace `package.json`. Only a package without `"private": true` needs npm settings. Get the owner and repository from the `repository` field, normalizing `git+https://github.com/owner/repo.git`, `github:owner/repo`, or `owner/repo`, falling back to `git remote get-url origin`. Check whether each public package is already published with `npm view <name> version`; an `E404` means it is not, and Step 2 below covers that case.

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
  - uses: actions/setup-node@v6
    with:
      node-version: '24'
      registry-url: 'https://registry.npmjs.org'
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
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
      - run: npm ci --ignore-scripts
      - run: npm test  # oss-ci decides the actual command from CONTRIBUTING.md (R-CI-02)

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
      - run: npm ci --ignore-scripts
      - run: npm run build
      - uses: actions/upload-artifact@v5
        with:
          name: build-artifacts
          path: dist/
          retention-days: 1

  publish:
    runs-on: ubuntu-latest
    needs: [test, build]
    environment: release
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/download-artifact@v6
        with:
          name: build-artifacts
          path: dist/
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
      - run: npm install -g npm@'>=11.15.0'
      - run: npm stage publish --ignore-scripts
```

`oss-harden` pins every `uses:` line above to a commit SHA and sets this workflow's `permissions:`, including the `contents: read` this skill left off the test and build jobs above; do not pin them or add permissions here. On GitLab CI/CD, give the publish job `environment: name: release` with `when: manual`, and configure `release` as a protected environment with approval rules, the same gate Step 4 below describes; then run `npm ci --ignore-scripts`, `npm run build`, and `npm stage publish --ignore-scripts` in `script:`.

If an existing workflow uses `secrets.NPM_TOKEN`, remove it from the YAML now and tell the user to delete the corresponding secret and revoke the token once the new flow is verified.

## Gate on manual approval (Step 4)

Two gates apply together, not as alternatives:

The workflow-level gate is the `environment: release` on the publish job above, with required reviewers configured at `https://github.com/<owner>/<repo>/settings/environments`, or, on GitLab, a protected environment with approval rules at the project's Settings > CI/CD > Protected environments. This is the evidence R-PUB-04 checks for on the workflow itself.

The registry-level gate is npm's staged publishing: the workflow runs `npm stage publish`, which uploads the package to a staging area without requiring 2FA, and a maintainer then runs `npm stage approve <stage-id>` from the CLI or approves it on npmjs.com, which does require 2FA. Because the trusted publisher above only allows `npm stage publish` and not `npm publish`, no run of this workflow, compromised or not, can ship a version without that 2FA step. Also set publishing access at `https://www.npmjs.com/package/<name>/access` to "Require two-factor authentication and disallow tokens", which revokes any existing publish token; warn the user first if another automation still uses one.

Source: [npm Docs, Staged publishing for npm packages](https://docs.npmjs.com/staged-publishing/).

## Verify provenance (Step 5)

When publishing through trusted publishing from GitHub Actions or GitLab CI/CD, npm generates a provenance attestation automatically; no `--provenance` flag or extra step is needed. After the first release, verify it with:

```bash
npm audit signatures
```

The output should report a verified provenance attestation for the newest version. CircleCI does not currently produce provenance, which is one more reason this file does not cover it as a first choice.

Source: [npm Docs, Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements).

## Not yet published packages

A trusted publisher is configured on the package's npm settings page, which does not exist until the package is published once. If `npm view <name>` returned `E404`: confirm the name is actually free rather than restricted, then have the user publish the first version manually and interactively, with 2FA, from their own machine: `npm publish --ignore-scripts` (add `--access public` for a scoped package). That single release has no provenance and no trusted publisher; every release after it goes through the flow above, starting with adding the trusted publisher immediately after the manual publish.

## Monorepo packages

Every public workspace package needs its own trusted publisher entry pointing at the same repository and the same workflow filename; a package left out of that list stays unprotected. One publish job can release every package with `npm stage publish --ignore-scripts --workspaces`, or one job per package with `--workspace=<name>` if versions are tagged independently, in which case adjust the tag trigger to match the repository's per-package tag format from Step 1.
