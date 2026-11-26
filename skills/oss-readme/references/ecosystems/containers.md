# Container images

## Version badge

For Docker Hub, `img.shields.io/docker/v/USER/REPO?sort=semver` reads tags from the published image repository. Check that the selected architecture is published. Link to the image on Docker Hub.

For GHCR, Shields has no service that reads image versions. For any registry without a matching version service, omit the image version badge. A separate git tag badge may identify a source release. Keep the `tag` label and link to the repository's tags.

## Install command

```bash
docker pull REGISTRY/IMAGE_PATH:TAG
```

Copy the published registry host and complete image path from the package page. Use the release tag listed there. The same command accepts Docker Hub, GHCR, and GitLab registry paths, including nested namespaces and self-managed hosts.

Show the release tag for readers trying the image. Link to its published digest for deployments that need immutable content.

Verified 2026-11-26 against [Docker image pull](https://docs.docker.com/reference/cli/docker/image/pull/), [Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry.md), [GitLab container registry](https://docs.gitlab.com/user/packages/container_registry/), and `services/docker/docker-version.service.js` in [badges/shields](https://github.com/badges/shields).
