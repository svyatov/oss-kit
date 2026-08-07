# npm

Concrete flow for the decisions `SKILL.md` makes, for a package published to the public npm registry. npm accepts three trusted publishing providers: GitHub Actions, GitLab CI/CD on GitLab.com shared runners, and CircleCI Cloud. This file covers GitHub Actions and GitLab CI/CD because `oss-kit`'s forge scope is GitHub and GitLab. Self-hosted runners are not supported. Trusted publishing needs npm CLI 11.5.1 or newer and Node 22.14.0 or newer. Staged publishing needs npm CLI 11.15.0 or newer. Resolve an exact supported Node release from Node's official archive immediately before writing the workflow, and read the npm version that release bundles from the same archive rather than assuming one. Do not install a floating npm range in the credentialed job.

Those are floors rather than recommendations. npm 12 is the current major, released 2026-07-08, and it requires Node `^22.22.2 || ^24.15.0 || >=26.0.0`, so a job that pins an older patch release within a supported line cannot run it. Where the release the workflow pins bundles an npm below the floor, install one exact npm version in the job rather than widening the Node pin, and write the exact version rather than a range.

Source: [npm Docs, Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/), [npm Docs, Staged publishing](https://docs.npmjs.com/staged-publishing/), [npm CLI v12.0.0](https://github.com/npm/cli/releases/tag/v12.0.0), and [Node.js download archive, Node 24.18.0](https://nodejs.org/en/download/archive/v24.18.0).

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
- [Why this file never reaches for a token](#why-this-file-never-reaches-for-a-token)

## Gather facts (Step 1)

Read the root `package.json`. If it declares `workspaces`, or a `pnpm-workspace.yaml` exists, the repository is a monorepo: enumerate every workspace `package.json`. Only a package without `"private": true` needs npm settings. Get the owner and repository from the `repository` field, normalizing `git+https://github.com/owner/repo.git`, `github:owner/repo`, or `owner/repo`, falling back to `git remote get-url origin`. Check whether each public package is already published with `npm view <name> version`; an `E404` means it is not, and [Not yet published packages](#not-yet-published-packages) below covers that case.

## Configure trusted publishing (Step 2)

On npmjs.com, open `https://www.npmjs.com/package/<name>/access` for the package (in a monorepo, once per public workspace package) and add a trusted publisher.

### GitHub Actions

Enter:

- Organization or user: the owner from Step 1
- Repository: the repository name from Step 1
- Workflow filename: `release.yml`, the filename only, not the full path
- Environment: the approval environment name from `SKILL.md` Step 4, for example `release`
- Allowed actions: for one package in the release flow, enable `npm stage publish` and leave `npm publish` disabled. For several packages released together, enable `npm publish` and leave staged publishing disabled. Step 4 explains why the gate moves.

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
- Allowed actions: select staged or direct publishing from the release-flow rule above

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
      - run: npm stage publish ./package/*.tgz --ignore-scripts
```

The version comparison assumes tags such as `v1.2.3`; derive the comparison from the repository's actual tag format. `npm pack` creates the exact tarball handed to `npm stage publish`, so the credentialed job does not check out source, install dependencies, or rebuild. `package-manager-cache: false` prevents `setup-node` from automatically restoring a package-manager cache in the credentialed job.

`oss-harden` pins every `uses:` line above to a commit SHA and sets the test and build jobs' minimal permissions, including the `contents: read` this skill left off them; do not pin them or narrow them here. This skill writes only the grants a job needs to authenticate, to publish, and to attest: the publish job's two above, and the github-release job's four in Step 6. On GitLab CI/CD, use separate test and build jobs, pass the resulting `.tgz` as an artifact, and make the publish job run only `npm stage publish ./package/*.tgz --ignore-scripts`. Give that job `environment: name: release` plus the `id_tokens` block from Step 2. Add `when: manual` only when Step 4 selects the forge gate.

If an existing workflow uses `secrets.NPM_TOKEN`, remove it from the YAML now and tell the user to delete the corresponding secret and revoke the token once the new flow is verified.

Where a release tool already owns the release, keep it and fit the publish job inside it rather than adding a second release path. release-please, semantic-release, and changesets all work the same way: the workflow triggers on a merge to the default branch, the tool decides whether that merge is a release, and where it is, the tool creates the tag and the forge release and the publish runs behind it in the same job graph. That satisfies R-PUB-01 through the clause covering a run that creates the release tag itself, so do not rewrite it into a `push: tags` trigger to make the rule read more literally. Three things do change. The tool's own job outputs whether a release happened, and every job after it needs the condition, or the workflow publishes on every merge; the version check against the tag comes from the tool's manifest rather than from `GITHUB_REF_NAME`; and any selected forge gate belongs on the publish job, after the tool creates the tag.

## Gate on manual approval (Step 4)

For one package, use npm staged publishing as the publication gate. Keep `environment: release` as part of the trusted-publisher identity and restrict it to version tags. Configure no required reviewer on the environment.

Create a new environment and its tag policy with the API:

```sh
ENV=release
gh api -X PUT "repos/{owner}/{repo}/environments/$ENV" \
  -F wait_timer=0 \
  -F prevent_self_review=false \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true'
gh api -X POST "repos/{owner}/{repo}/environments/$ENV/deployment-branch-policies" \
  -f 'name=v*' -f type=tag
```

Two details decide whether that runs. `gh api` substitutes `{owner}` and `{repo}` from the checkout it runs in. Use `-F` for booleans because `-f` sends every value as a string and the endpoint rejects a quoted boolean.

The registry-level gate is npm's staged publishing: the workflow runs `npm stage publish`, which uploads the package to a staging area without requiring 2FA, and a maintainer then runs `npm stage approve <stage-id>` from the CLI or approves it on npmjs.com, which does require 2FA. Because the trusted publisher above only allows `npm stage publish` and not `npm publish`, no run of this workflow, compromised or not, can ship a version without that 2FA step. Also set publishing access at `https://www.npmjs.com/package/<name>/access` to "Require two-factor authentication and disallow tokens", which revokes any existing publish token; warn the user first if another automation still uses one.

For several packages released by one event, npm creates one stage and one approval per package. Use one forge gate for the complete flow. Configure every trusted publisher for `npm publish`, run one `npm publish ./package/<tarball>.tgz --ignore-scripts` command per package, and disable staged publishing. On GitHub, add a required reviewer to `release`. On GitLab Premium or Ultimate, protect `release` and make the publish job blocking and manual. This keeps the release at one human action.

If an established flow has both forge review and staged approval, preserve both until the maintainer accepts a migration. Report how many actions the flow requires and recommend the branch above that matches its package count.

Source: [npm Docs, Staged publishing for npm packages](https://docs.npmjs.com/staged-publishing/).

## Verify provenance (Step 5)

When publishing a public package from a public GitHub or GitLab repository through trusted publishing, npm generates a provenance attestation automatically; no `--provenance` flag is needed. npm does not generate provenance for a private repository, even when the package is public. After approval publishes the staged version, verify the exact installed version in a clean temporary project. This runs on the maintainer's own machine and needs the npm CLI version named at the top of this file, not the one the workflow used:

```bash
npm install <name>@<version> --ignore-scripts
npm audit signatures
```

The output must report verified provenance for that dependency. The package page also shows provenance details. A bare `npm audit signatures` in the source repository does not verify the newly published package unless that exact version is installed there.

**A newly published version is not installable straight away.** npm scans every publish for malware before the version becomes available, "typically around five minutes" and "up to 15 minutes or more, at peak times or depending on a package's content and size". The install above fails while the scan is pending, and so does anything else the release does with the version it just shipped: `npm deprecate` and `npm unpublish` both wait on availability, and only `npm dist-tag` keeps working throughout. So do not read a failed install in the first minutes as a failed publish. Wait and repeat it, and where a workflow step installs the package it just published, npm's own instruction is to "update it to tolerate a short availability delay" rather than to retry immediately and fail the release on a scan that has not finished.

Source: [npm Docs, Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/), [npm Docs, Viewing package provenance](https://docs.npmjs.com/viewing-package-provenance/), and [npm publish-time malware scanning and dual-use metadata](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/).

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
  github-release:
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

Every public workspace package needs its own trusted publisher entry pointing at the same repository and workflow filename; a package left out stays unprotected. `npm stage` is unaware of workspaces. Independently tagged packages are separate release flows, so each can use staged publishing and one npm approval. Packages released together use direct publishing behind one forge gate, because staging requires one approval per package. Pack every package in the build job and publish each tarball explicitly. Match each independently versioned job's tag trigger and version check to that package. `npm sbom --workspace <name>` scopes Step 6's bill of materials to one of them.

## Why this file never reaches for a token

npm's token track is being withdrawn, so a reader who arrives here with a working `NPM_TOKEN` should know it has an end date rather than a trade-off. Classic tokens stopped being issued on 2025-11-05, and every one of them was revoked by 2025-12-09. What replaced them, granular access tokens, expire in at most 90 days. From early August 2026 a 2FA-bypass granular token can no longer change trusted publishing configuration or perform account, package, and organization management, and around January 2027 it loses the ability to publish directly, leaving it able to read private packages and to stage a publish for someone else to approve.

npm's own recommendation for automated publishing is trusted publishing, or staged publishing with a human approval step, which is what the rest of this file builds. R-PUB-02 permits a scoped token as a below-the-bar fallback where a registry documents no OIDC flow at all. npm documents one, so that fallback does not reach this ecosystem, and a token here is a finding rather than a slower road to the same place.

Source: [npm classic token creation disabled](https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/), [npm classic tokens revoked](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/), and [npm install-time security and GAT bypass2fa deprecation](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/).

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-08-07 against [npm Docs, Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/) and [npm Docs, Staged publishing for npm packages](https://docs.npmjs.com/staged-publishing/). The npm 12 floor, the malware-scan delay, and the token section were added on 2026-08-03 against [npm CLI v12.0.0](https://github.com/npm/cli/releases/tag/v12.0.0) and the three GitHub changelog entries cited beside them.
