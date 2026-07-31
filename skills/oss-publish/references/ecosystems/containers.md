# Container images

Concrete flow for the decisions `SKILL.md` makes, for a container image the project publishes. This is the one entry on the roster with no package manifest to detect it by: an image is detected by a registry push, never by a Dockerfile, because a Dockerfile more often builds a test harness than a shipped image.

Images stack rather than replace. A Go project can ship both a module and an image, and a Node project both a package and an image, so run this file alongside whichever other one the repository's manifests select rather than instead of it.

Two positions in this file are not needed by the other ten. Step 4 says what an approval gate means for a project that pushes on merge, and Step 6 says why R-SEC-13 does not reach a registry tag.

Source: [GitHub Docs, Publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [Docker Docs, Build attestations](https://docs.docker.com/build/metadata/attestations/), and [GitLab Docs, Build and push container images](https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/).

## Contents

- [Gather facts (Step 1)](#gather-facts-step-1)
- [Configure trusted publishing (Step 2)](#configure-trusted-publishing-step-2)
  - [GitHub Actions and GHCR](#github-actions-and-ghcr)
  - [GitLab CI/CD and the GitLab container registry](#gitlab-cicd-and-the-gitlab-container-registry)
  - [A registry outside the forge](#a-registry-outside-the-forge)
- [Write the hardened release workflow (Step 3)](#write-the-hardened-release-workflow-step-3)
- [Gate on manual approval (Step 4)](#gate-on-manual-approval-step-4)
- [Verify provenance (Step 5)](#verify-provenance-step-5)
- [Describe and sign what the release attaches (Step 6)](#describe-and-sign-what-the-release-attaches-step-6)

## Gather facts (Step 1)

Find the push, not the Dockerfile. The signals are a workflow or pipeline step that runs `docker push`, `docker buildx build --push`, or an action that pushes, and an image that already exists on the forge's registry. A repository with a Dockerfile and no push publishes nothing and this file does not apply to it.

Collect, before changing anything: the registry host and the full image name; which tags the project pushes and which of them move, since that is what Step 4 turns on; whether the base images in the Dockerfile are referenced by tag or by digest; whether the push runs on merge, on a version tag, or both; and whether any long-lived registry credential is stored as a secret, which this skill's changes should remove.

An image name on GitHub is `ghcr.io/<owner>/<name>`, conventionally `${{ github.repository }}`. On GitLab it is `$CI_REGISTRY_IMAGE`, which resolves to the registry address tied to the project.

## Configure trusted publishing (Step 2)

There is no registry-side trusted publisher form here. What takes its place is the forge's own short-lived job token, which is already the thing trusted publishing exists to produce: a credential minted per run, scoped to the repository, with nothing stored between releases. Configuring this step means using that token and deleting anything else.

### GitHub Actions and GHCR

Authenticate with the automatic `GITHUB_TOKEN`, granting `packages: write` on the job that pushes and nothing above it:

```yaml
permissions:
  contents: read
  packages: write
steps:
  - uses: docker/login-action@v4  # oss-harden pins this to a commit SHA
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}
```

No personal access token and no registry password needs to exist in the repository. If one does, remove it from the YAML now and tell the user to delete the secret once the new flow is verified.

### GitLab CI/CD and the GitLab container registry

Authenticate with the predefined registry variables, which GitLab injects per job:

```yaml
build:
  script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login "$CI_REGISTRY" -u "$CI_REGISTRY_USER" --password-stdin
    - docker build --pull -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_TAG" .
    - docker push "$CI_REGISTRY_IMAGE:$CI_COMMIT_TAG"
```

`docker build --pull` is GitLab's own recommendation, so a stale cached base image does not silently ship. GitLab's documentation also warns against building directly to `latest` because concurrent jobs collide, and against `$CI_COMMIT_REF_NAME` in a tag because image tags cannot contain forward slashes; `$CI_COMMIT_REF_SLUG` is the safe form for a branch.

### A registry outside the forge

Pushing to Docker Hub or any registry the forge does not issue a token for means a stored credential, because there is no job token to borrow. That is below R-PUB-02's bar in the same way a stored registry token is anywhere else. Scope it to the one repository the project pushes, hold it in an environment gated by the approval in Step 4, and report the limitation rather than presenting it as equivalent to the forge-token flow above.

## Write the hardened release workflow (Step 3)

Pin every base image by digest in the Dockerfile, not by tag:

```dockerfile
FROM node:24-bookworm-slim@sha256:<digest>
```

A tag on a base image moves, so a rebuild of the same commit produces a different image and neither the maintainer nor a consumer can tell. `oss-harden` owns pinning generally and this is the same rule applied one layer down.

Build and push with BuildKit's own attestations turned on, and attest the pushed digest to the forge:

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
jobs:
  publish:
    runs-on: ubuntu-latest
    environment: release
    permissions:
      contents: read
      packages: write
      id-token: write
      attestations: write
      artifact-metadata: write
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: docker/login-action@v4
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v6
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
      - uses: docker/build-push-action@v7
        id: push
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          provenance: mode=max
          sbom: true
      - uses: actions/attest@v4
        with:
          subject-name: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          subject-digest: ${{ steps.push.outputs.digest }}
          push-to-registry: true
```

`provenance: mode=max` and `sbom: true` are BuildKit attestations, attached to the image in the registry as in-toto statements: the provenance records how the image was built, and the SBOM records what is inside it in SPDX. They are the reason this file needs no third-party SBOM generator, unlike every other reference in this directory. BuildKit adds minimal provenance by default; `mode=max` is what makes it useful, and `provenance: false` is what turns it off.

The `actions/attest` step is a second, different thing: a GitHub-signed attestation over the image digest, pushed to the registry beside it with `push-to-registry: true`. Keep both. BuildKit's provenance is generated by the builder and GitHub's is signed by the forge, so one is a claim by the build and the other is a claim about who ran it.

`subject-digest` comes from the push step's `digest` output, which is why the push and the attestation cannot be split across jobs the way a package tarball can: the digest does not exist until the push completes. The whole job therefore holds `packages: write` and the attestation identity together, and the approval gate in Step 4 is what bounds that.

This is the one file in this directory whose release workflow carries no `test` job, and that is deliberate rather than an omission. Every other reference here writes one because it publishes a package the repository builds, and the tests are the project's own. An image is stacked on top of that: it is a packaging of something the repository already publishes or already tests, so a `test` job here would rerun what `oss-ci` runs on every change with nothing new to catch. Where the image is the only thing the repository ships, put the tests in the CI workflow `oss-ci` owns and add `needs: [test]` here only if a smoke test against the built image is worth the extra minutes at release time. Say which of the two is the case rather than leaving a reader to notice the missing job.

`oss-harden` pins every `uses:` line above to a commit SHA. Three of the four actions here are third-party, from Docker rather than from the forge; vet them against their own repositories before adding them, and pin them harder than the first-party ones. On GitLab CI/CD, the login and push from Step 2 replace the first three steps, and the attestation step has no equivalent; Step 5 covers what that leaves.

## Gate on manual approval (Step 4)

Push on merge is the dominant image release model, and it reads like a permanent R-PUB-04 failure. It is not, and the distinction is what this section exists to state.

A mutable rolling tag pushed on merge, `latest` or a branch name or a commit SHA tag, is a build artifact and not a release. Nothing is versioned, the tag is expected to move, and R-PUB-04's approval gate does not reach it. The release is the immutable, version-tagged, digest-identified image, and that push is what the gate covers. So a repository that pushes `latest` on every merge to the default branch and also pushes `v1.2.3` from a tag needs the approval on the second job only, and the first can run unattended.

A project whose only published image is a mutable rolling tag has no release to gate. Say that to the maintainer plainly: R-PUB-04 has nothing to attach to, and the honest report is not applicable rather than passed or failed. What such a project is missing is not an approval gate but a release, and that is a versioning question `oss-changelog` owns rather than a publishing one.

Where there is a versioned push, pin its job to `environment: release` as above, and create that environment at `https://github.com/<owner>/<repo>/settings/environments/new` with required reviewers naming at least one person other than an automation account. Required reviewers work for public repositories on current GitHub plans; private or internal repositories need GitHub Enterprise Cloud. On GitLab Premium or Ultimate, use a protected environment with approval rules. No container registry offers a proof-of-presence gate of its own, so report R-PUB-04 as unmet when the forge plan provides no native gate.

Create it with the API rather than the form. Reviewers and the tag policy are both settable, so nothing here needs a browser.

```sh
ENV=release
GHUID=$(gh api user --jq .id)
gh api -X PUT "repos/{owner}/{repo}/environments/$ENV" \
  -F wait_timer=0 \
  -F prevent_self_review=false \
  -f 'reviewers[][type]=User' -F "reviewers[][id]=$GHUID" \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true'
gh api -X POST "repos/{owner}/{repo}/environments/$ENV/deployment-branch-policies" \
  -f 'name=v*' -f type=tag
```

Three details decide whether that runs. `gh api` substitutes `{owner}` and `{repo}` from the checkout it runs in. Use `-F` for the booleans and the reviewer id, because `-f` sends every value as a string and the endpoint rejects a quoted boolean. Do not name the shell variable `UID`: zsh marks it read only, so the assignment fails before `gh` runs.

`reviewers[][id]` takes a numeric user or team id rather than a login. A team needs `type=Team` and that team's id.

## Verify provenance (Step 5)

This is the one section in this directory where the registry-served answer exists and works. Both attestations from Step 3 are readable from the image itself.

Verify the GitHub attestation against the digest, not the tag, because a tag is not an identity:

```bash
gh attestation verify oci://<registry>/<image>@sha256:<digest> --repo <owner>/<repo>
```

`--signer-workflow <owner>/<repo>/.github/workflows/release.yml` pins which workflow the attestation must have come from, so an attestation produced by any other workflow in the repository fails. Read BuildKit's own provenance with the Docker CLI:

```bash
docker buildx imagetools inspect <registry>/<image>:<version> --format '{{ json .Provenance.SLSA }}'
```

On GitLab CI/CD, neither half is available. GitLab Runner does generate SLSA provenance metadata when `RUNNER_GENERATE_ARTIFACTS_METADATA` is set, and it does not cover container images: it covers the job's build artifacts, written as an in-toto statement in a JSON file beside them. BuildKit's own `provenance` and `sbom` attestations still work, because they come from the builder rather than from the forge, so a GitLab pipeline using `docker buildx build` gets those and no forge-signed attestation. Report R-PUB-03 as met on GitHub through the forge attestation, and as partly met on GitLab through BuildKit's provenance alone, with the missing signer identity named.

Source: [GitLab Docs, Configure runners](https://docs.gitlab.com/ci/runners/configure_runners/) and [Docker Docs, SLSA provenance attestations](https://docs.docker.com/build/metadata/attestations/slsa-provenance/).

## Describe and sign what the release attaches (Step 6)

R-PUB-05 and R-PUB-06 are met by the image rather than by a forge release asset here, and the two BuildKit attestations from Step 3 are what meets them. `sbom: true` attaches an SPDX bill of materials to the image, covering what went into that exact digest, which is what R-PUB-05 asks for and what an SBOM generated from the source tree would not be. The GitHub attestation over the digest is what R-PUB-06 asks for. Neither is a file on a forge release, so read both rules against the image and say where the evidence lives, rather than reporting them unmet because the release page carries nothing.

R-SEC-13 does not reach this surface, and the reason matters. That rule binds a git tag: a repository ruleset or a protected tag stops a released tag being moved or deleted on the forge. A container registry tag is a different object living outside the forge, mutable by design, and no forge control reaches it, so `v1.2.3` on a registry can be repointed at different bytes tomorrow no matter how the repository is configured. The immutable identity of a released image is its digest, and that is the identity to publish, to attest, and to tell consumers to pin.

Publish the digest where a consumer will find it. The release notes and the README install line should both carry `<image>@sha256:<digest>` alongside the human-readable tag, because a consumer who pulls by tag has no way to notice the tag moved.

Two registry-side controls exist and only one is on the roster's forges. GitLab offers immutable container tags on Ultimate, generally available from GitLab 18.10, configured under Settings, Packages and registries, Container registry as up to five regex rules per project that prevent a matching tag from being updated or deleted; it also offers protected container tags, which restrict who may change a tag by role rather than preventing the change. Where the project is on a tier that has them, set an immutable rule matching the release tag pattern and report it. GHCR documents no equivalent, so on GitHub the digest is the whole answer.

Source: [GitLab Docs, Immutable container tags](https://docs.gitlab.com/user/packages/container_registry/immutable_container_tags/).

Where the project also attaches a file to the forge release, such as an image tarball or a compiled binary built from the same source, that file is covered by the ordinary pattern: hash the assets from inside their directory, attest the manifest with `subject-checksums`, and upload both. Do it in a job after the publish, so the assets stay behind the approval gate.

Step 7 is in `SKILL.md`: read each R-PUB rule's `Check:` line against what this file produced, and fix what fails before reporting done.

Verified 2026-07-31 against [GitHub Docs, Publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), the inputs and container example in [actions/attest, README](https://github.com/actions/attest/blob/main/README.md), [Docker Docs, Build attestations](https://docs.docker.com/build/metadata/attestations/), [Docker Docs, SLSA provenance attestations](https://docs.docker.com/build/metadata/attestations/slsa-provenance/), [GitLab Docs, Build and push container images](https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/), [GitLab Docs, Immutable container tags](https://docs.gitlab.com/user/packages/container_registry/immutable_container_tags/), [GitLab Docs, Configure runners](https://docs.gitlab.com/ci/runners/configure_runners/), and [GitHub CLI manual, gh attestation verify](https://cli.github.com/manual/gh_attestation_verify).
