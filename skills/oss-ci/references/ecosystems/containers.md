# Container images

An image is not a language runtime, so the three sections below answer differently here than in the other ten files. Read this one alongside the file for whatever ecosystem the image wraps, because a repository that ships an image almost always also has a manifest for the code inside it.

## Toolchain and matrix (R-CI-03)

The toolchain is the builder rather than a runtime. On GitHub Actions, `docker/setup-buildx-action` creates and boots a Buildx builder, `docker/setup-qemu-action` adds emulation for building against more platforms, and `docker/build-push-action` runs the build. On GitLab, the documented paths are Docker-in-Docker, socket binding, or a rootless builder such as BuildKit or Buildah; its Docker-in-Docker example runs an ordinary `docker build` inside a `docker:*-cli` image.

There is no manifest declaring a supported version range here, so the manifest-declared range R-CI-03 reads has no counterpart. What stands in its place is what the build actually varies over, and there are two axes, both observable in the repository rather than in a manifest.

Source: [docker/build-push-action](https://github.com/docker/build-push-action), [GitLab, use Docker to build Docker images](https://docs.gitlab.com/ci/docker/using_docker_build/).

The first is the base image. `FROM` in the Dockerfile names it, and a project that claims to work on more than one base, an Alpine variant beside a Debian one, or a runtime version range matching what the code inside claims, gets a matrix over that tag with the tag passed in as a build argument. The second is the target platform, which `platforms:` on `docker/build-push-action` takes as a list and which builds in one invocation rather than through a job matrix.

Where the Dockerfile pins one base and the release pushes one platform, there is no range to cover and a single build is the whole of it. Say that rather than manufacturing a matrix, and note that the runtime version claim, where the image wraps a package, belongs to that package's own file in this directory.

Sources: [docker/build-push-action](https://github.com/docker/build-push-action), [docker/setup-buildx-action](https://github.com/docker/setup-buildx-action).

## Dependency caching (R-CI-04)

What is cached here is BuildKit layers, not a package manager's downloads, and no lockfile keys it. BuildKit resolves cache against the build graph itself, so the equivalent of a stale key is a cache mount serving a layer whose inputs changed, and the controls are the backend and its mode rather than a key expression.

Docker documents four backends for a GitHub Actions build. The GitHub Actions cache backend is the one written for this environment:

```yaml
- uses: docker/setup-buildx-action@v4
- uses: docker/build-push-action@v7
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

The registry backend, `cache-from: type=registry,ref=user/app:buildcache` with the matching `cache-to`, stores the cache as an image in a registry instead, which survives outside the forge's cache retention and is what a build outside GitHub Actions uses. `type=inline` and `type=local` are the other two.

One version floor travels with the `gha` backend: since 2025-04-15 only version 2 of the GitHub Cache service API is supported, which needs Buildx v0.21.0 or later and BuildKit v0.20.0 or later. An older builder fails against it rather than falling back.

On GitLab, layer caching for a Docker-in-Docker build is documented separately, and GitLab also recommends the `overlay2` storage driver over the default `vfs`, which copies the whole filesystem on each run.

Sources: [Docker, cache backends in GitHub Actions](https://docs.docker.com/build/ci/github-actions/cache/), [GitLab, use Docker to build Docker images](https://docs.gitlab.com/ci/docker/using_docker_build/).

## Test command (R-CI-06)

For an image, the build is the first test: a `RUN` step that fails fails the build, so a Dockerfile that compiles and installs inside itself has already exercised that path by the time the image exists. That is why a container job needs no separate build check, and why the build has to run on pull requests rather than only on the push that publishes.

Testing the image's behaviour is a second step, running the built image. GitLab's own Docker-in-Docker example is exactly that shape, `docker build -t my-docker-image .` followed by `docker run my-docker-image /script/to/run/tests`. On GitHub Actions, load the built image into the runner's daemon and run it the same way, rather than pushing first and testing what is already published.

The application's own suite is not this file's answer. It lives in whatever ecosystem the code inside the image belongs to, so route the test-suite question to that ecosystem's file here, and treat a repository whose only test is that the image builds as having a build check rather than a suite.

Sources: [GitLab, use Docker to build Docker images](https://docs.gitlab.com/ci/docker/using_docker_build/), [docker/build-push-action](https://github.com/docker/build-push-action).

Verified 2026-07-31 against https://github.com/docker/build-push-action, https://docs.docker.com/build/ci/github-actions/cache/, and https://docs.gitlab.com/ci/docker/using_docker_build/.
