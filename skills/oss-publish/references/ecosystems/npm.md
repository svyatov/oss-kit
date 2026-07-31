# npm

Concrete flow for the decisions `SKILL.md` makes, for a package published to the public npm registry. npm accepts three trusted publishing providers: GitHub Actions, GitLab CI/CD on GitLab.com shared runners, and CircleCI Cloud. This file covers GitHub Actions and GitLab CI/CD because `oss-kit`'s forge scope is GitHub and GitLab. Self-hosted runners are not supported. Trusted publishing needs npm CLI 11.5.1 or newer and Node 22.14.0 or newer. Staged publishing needs npm CLI 11.15.0 or newer. Resolve an exact supported Node release from Node's official archive immediately before writing the workflow, and read the npm version that release bundles from the same archive rather than assuming one. Do not install a floating npm range in the credentialed job.

Source: [npm Docs, Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/), [npm Docs, Staged publishing](https://docs.npmjs.com/staged-publishing/), and [Node.js download archive, Node 24.18.0](https://nodejs.org/en/download/archive/v24.18.0).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2)](#configure-trusted-publishing-step-2)
  - [GitHub Actions](#github-actions)
  - [GitLab CI/CD](#gitlab-cicd)
- [Write the hardened release workflow (Step 3)](#write-the-hardened-release-workflow-step-3)
- [Gate on manual approval (Step 4)](#gate-on-manual-approval-step-4)
- [Verify provenance (Step 5)](#verify-provenance-step-5)
- [Describe and sign what the release attaches (Step 6)](#describe-and-sign-what-the-release-attaches-step-6)
- [Not yet published packages](#not-yet-published-packages)
- [Monorepo packages](#monorepo-packages)

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

`oss-harden` pins every `uses:` line above to a commit SHA and sets the test and build jobs' minimal permissions, including the `contents: read` this skill left off them; do not pin them or narrow them here. This skill writes only the grants a job needs to authenticate, to publish, and to attest: the publish job's two above, and the release job's four in Step 6. On GitLab CI/CD, use separate test and build jobs, pass the resulting `.tgz` as an artifact, and make the publish job run only `npm stage publish package/*.tgz --ignore-scripts`. Give that job `environment: name: release` with `when: manual`, plus the `id_tokens` block from Step 2.

If an existing workflow uses `secrets.NPM_TOKEN`, remove it from the YAML now and tell the user to delete the corresponding secret and revoke the token once the new flow is verified.

## Gate on manual approval (Step 4)

Two gates apply together, not as alternatives:

The workflow-level gate is the `environment: release` on the publish job above, with required reviewers configured at `https://github.com/<owner>/<repo>/settings/environments`, or, on GitLab Premium or Ultimate, a protected environment with approval rules at the project's Settings > CI/CD > Protected environments. GitHub required reviewers work for public repositories on current plans; private or internal repositories need GitHub Enterprise Cloud. If the forge plan lacks this gate, keep the environment binding because it is part of the npm trusted-publisher identity and rely on the registry gate below for R-PUB-04.

The registry-level gate is npm's staged publishing: the workflow runs `npm stage publish`, which uploads the package to a staging area without requiring 2FA, and a maintainer then runs `npm stage approve <stage-id>` from the CLI or approves it on npmjs.com, which does require 2FA. Because the trusted publisher above only allows `npm stage publish` and not `npm publish`, no run of this workflow, compromised or not, can ship a version without that 2FA step. Also set publishing access at `https://www.npmjs.com/package/<name>/access` to "Require two-factor authentication and disallow tokens", which revokes any existing publish token; warn the user first if another automation still uses one.

Source: [npm Docs, Staged publishing for npm packages](https://docs.npmjs.com/staged-publishing/).

## Verify provenance (Step 5)

When publishing a public package from a public GitHub or GitLab repository through trusted publishing, npm generates a provenance attestation automatically; no `--provenance` flag is needed. npm does not generate provenance for a private repository, even when the package is public. After approval publishes the staged version, verify the exact installed version in a clean temporary project. This runs on the maintainer's own machine and needs the npm CLI version named at the top of this file, not the one the workflow used:

```bash
npm install <name>@<version> --ignore-scripts
npm audit signatures
```

The output must report verified provenance for that dependency. The package page also shows provenance details. A bare `npm audit signatures` in the source repository does not verify the newly published package unless that exact version is installed there.

Source: [npm Docs, Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/) and [npm Docs, Viewing package provenance](https://docs.npmjs.com/viewing-package-provenance/).

## Describe and sign what the release attaches (Step 6)

Only for a release that attaches a built asset to the forge release. Publishing to npm attaches nothing to GitHub, and the source archives GitHub generates for a tag are not built assets, so a project that only publishes goes to Step 7 instead.

npm generates the bill of materials itself, so no third-party tool enters the release workflow. `npm sbom` reads the installed tree and writes JSON to stdout, so it runs in the build job after `npm ci`:

```yaml
      - run: npm sbom --sbom-format=cyclonedx --omit=dev > <name>-<version>.cyclonedx.json  # placeholder: the package name and version from Step 1
      - uses: actions/upload-artifact@v7
        with:
          name: package-tarball
          path: |
            *.tgz
            *.cyclonedx.json
          retention-days: 1
```

Name `--omit=dev` rather than relying on the default. `npm sbom` omits development dependencies only when `NODE_ENV` is `production`, so the default describes the build environment rather than what a consumer installs. Where the job has a lockfile but no `node_modules`, add `--package-lock-only`.

Attach and attest in a third job, after the publish job:

```yaml
  release:
    runs-on: ubuntu-latest
    needs: [publish]
    permissions:
      contents: write
      id-token: write
      attestations: write
      artifact-metadata: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: package-tarball
          path: dist/
      - run: gh release upload "$GITHUB_REF_NAME" dist/*.tgz dist/*.cyclonedx.json
        env:
          GH_TOKEN: ${{ github.token }}
      - uses: actions/attest@v4
        with:
          subject-path: dist/*.tgz
      - uses: actions/attest@v4
        with:
          subject-path: dist/*.tgz
          sbom-path: dist/<name>-<version>.cyclonedx.json  # placeholder: the same filename as above
```

The two attestation steps are not a duplicate. `actions/attest` generates SLSA build provenance when it is given a subject alone, and an SBOM attestation when it is also given `sbom-path`, so the first step records how the tarball was built and the second records what is inside it. A consumer reads the second with `gh attestation verify <file>.tgz --repo <owner>/<repo> --predicate-type https://cyclonedx.org/bom`, because `gh` looks for SLSA provenance unless told otherwise.

`gh release upload` fails when no release exists for the tag. Either create it in this job with `gh release create "$GITHUB_REF_NAME" --generate-notes` before the upload, or have the maintainer publish the release from the tag first. This reference does not choose between them, because release notes are the project's own.

A third job is what makes the grants above safe, so copy the job boundary along with them. The build job runs `npm ci` and `npm run build`, so giving it release-asset writes and an attestation identity is exactly the credential split Step 3 exists to enforce, and it would write assets before the approval gate. The publish job holds the registry identity and runs nothing beyond the actions Step 3 names. Only a separate job satisfies both, and `needs: [publish]` is what keeps the assets behind the gate.

The four grants above are copied exactly, on this job only. The workflow's top-level block stays `contents: read`. Narrowing anything else, pinning each `uses:` to a commit SHA, and auditing the result are `oss-harden`'s.

## Not yet published packages

A trusted publisher is configured on the package's npm settings page, which does not exist until the package is published once. If `npm view <name>` returned `E404`: confirm the name is actually free rather than restricted, then have the user publish the first version manually and interactively, with 2FA, from their own machine: `npm publish --ignore-scripts` (add `--access public` for a scoped package). That single release has no provenance and no trusted publisher; every release after it goes through the flow above, starting with adding the trusted publisher immediately after the manual publish.

## Monorepo packages

Every public workspace package needs its own trusted publisher entry pointing at the same repository and workflow filename; a package left out stays unprotected. `npm stage` is unaware of workspaces. Pack each publishable workspace in the build job, then stage each resulting tarball explicitly, preferably in one approval-gated publish job per independently versioned package. Match each job's tag trigger and version check to that package. `npm sbom --workspace <name>` scopes Step 6's bill of materials to one of them.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-07-31 against [npm Docs, Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/) and [npm Docs, Staged publishing for npm packages](https://docs.npmjs.com/staged-publishing/).
