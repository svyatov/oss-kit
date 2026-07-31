# Container images

## Detection signals

Container images are the one roster entry with no manifest and no lockfile, so they never appear on the present axis. That is deliberate rather than a hole: a `Dockerfile`, a `compose.yaml`, or a `.devcontainer/` directory more often builds a test harness or a development environment than anything the repository distributes, so treating one as a signal would put containers in scope for most repositories that never ship an image. Detection is a registry push, never a Dockerfile.

Container images are shipped when something pushes one to a registry. On GitHub the push targets `ghcr.io`, in the form `docker push ghcr.io/NAMESPACE/IMAGE_NAME:latest`. On GitLab a job authenticates against `$CI_REGISTRY` and pushes to `$CI_REGISTRY_IMAGE`, which GitLab documents as resolving "to the address of the registry tied to this project". A step doing either, or an image already published under the repository's namespace, is the evidence.

Sources: [Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [Build and push container images](https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/).

Three cases decide most arguments:

- A build with no push ships nothing. A workflow that builds an image to run tests against, and never pushes it, leaves containers out of scope entirely.
- An existing image can be invisible from the checkout. GitHub publishes an image as private by default and does not link it to a repository automatically, so a repository page showing no package is not proof that no image exists. Where no push step is in the workflows and no forge access is available to list packages, the shipped answer is unknown rather than no, and unknown is the state to report.
- Detection stops at whether an image is pushed at all. Which of a project's tags counts as a release and which is a rolling build artifact is a release-process question that `oss-publish` answers, and it changes nothing about whether the ecosystem is in scope.

## Release track

Container images take the registry-push track. A push uploads built layers to a registry under a credential, which is the same shape as any package upload and is what assigns the track. The roster records `"track": "registry-push"` for container images and the release area's preamble names them in its registry-push list.

Verified 2026-07-31 against https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry and https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/.
