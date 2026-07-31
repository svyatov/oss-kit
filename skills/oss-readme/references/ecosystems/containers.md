# Container images

## Version badge

Shields.io has one container version service and it reads Docker Hub: `img.shields.io/docker/v/USER/REPO`, with `sort` and `arch` query parameters. Nothing in its service list reads the GitHub Container Registry. Searching the shields.io repository for `ghcr` returns six files, all of them its own release plumbing under `.github/`, `.devcontainer/`, and `doc/`, and no service. So a project publishing to `ghcr.io`, which is where a repository inside this kit's forge scope publishes, has no version endpoint to point a badge at.

Source: [badges/shields](https://github.com/badges/shields), `services/docker/docker-version.service.js` and the absence of any `ghcr` service.

The strongest documented fallback is the tag badge, linked to the package page the registry gives the image:

```markdown
[![version](https://img.shields.io/github/v/tag/OWNER/REPO?sort=semver&label=version)](https://github.com/OWNER/REPO/pkgs/container/IMAGE)
```

`sort=semver` is required, because the default sorts by tag date and returns whichever tag was committed last. `label=version` replaces the default `tag`, which reads as a git artifact.

An image published to Docker Hub instead of, or as well as, the forge registry does have an endpoint, and it is the better badge for that image: `img.shields.io/docker/v/USER/REPO?sort=semver` reports what the registry actually holds.

The forge fallback sits below both. It reports a git tag, and a git tag is not an image: a release that tagged and failed to push leaves the badge advertising an image nobody can pull, which is what R-DOC-04 rules out. A shields.io service reading the GHCR tag list would retire the gap, and so would publishing the same image to Docker Hub.

## Install command

```bash
docker pull ghcr.io/NAMESPACE/IMAGE_NAME:TAG
```

GitHub documents the pull as `docker pull ghcr.io/NAMESPACE/IMAGE_NAME`, where `NAMESPACE` is the personal account or organization the image is scoped to. Pin the tag in the README rather than taking the default. `latest` is mutable by design, so a README showing it documents a moving target and cannot be checked against anything.

Show the version tag rather than the digest. The digest is what a deployment pins and what a reader should be told to pin, but a digest written into a README is wrong one release later and nobody edits a README for it. Name where the digests are published, which for the forge registry is the package page linked above, and let the reader read the current one.

Verified 2026-07-31 against [Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [GitHub Tag badge](https://shields.io/badges/git-hub-tag), and `services/docker/docker-version.service.js` plus `services/github/github-tag.service.js` in [badges/shields](https://github.com/badges/shields).
