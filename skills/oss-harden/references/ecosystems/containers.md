# Container images

## Automated dependency updates (R-SEC-03)

Dependabot's `docker` value carries version updates and not security updates, and `docker-compose` behaves the same way. It updates image references in Dockerfiles, in Kubernetes manifests, and in Helm charts, parses image tags for semantic versioning, and where a tag carries a pre-release it proposes only versions with a matching pre-release label. Configuring a Helm entry also updates the Docker images the chart references.

Because there are no security updates for either value, a base image that goes known-bad reaches the repository as a scheduled version bump or not at all. Pair the updater with the scanning in the Vulnerability watch section rather than treating it as coverage.

On GitLab the Renovate managers are `dockerfile` and `docker-compose`.

## Lockfile and frozen install (R-SEC-08)

A container build produces no lockfile, and no container build tool publishes a format for one.

Docker's own build documentation, which is where a resolution file would be described if it existed, offers two pinning techniques instead and nothing that records a resolved set with hashes. The first is the base image digest: "By pinning your images to a digest, you're guaranteed to always use the same image version, even if a publisher replaces the tag", written as `FROM alpine:3.21@sha256:...`. The second is version pinning inside a `RUN` instruction, where "Version pinning forces the build to retrieve a particular version regardless of what's in the cache", written as `package-foo=1.3.*` in an `apt-get install` line. Neither is a hash-bearing record of the whole resolution, and the second pins a version rather than an artifact.

Source: [Dockerfile best practices](https://docs.docker.com/build/building/best-practices/).

The strongest available substitute is both techniques together: every `FROM` pinned to a digest, which is the same immutable-reference requirement R-SEC-01 and R-SEC-06 already make of a workflow's `image:` reference, and every package installed inside a `RUN` line version pinned. Record the built image's own digest at release, since that digest is what identifies the artifact a consumer pulled.

That substitute sits below R-SEC-08, whose subject is the lockfile a package manager writes. A container build tool publishing a committed, hash-bearing resolution file is what would retire this gap. Until then, report the digest pins as the control this ecosystem actually has, and score the repository's package manager ecosystems, which are the ones the image is built from, against R-SEC-08 on their own files.

## Static analysis (R-SEC-09)

A container image contributes no source language, so this ecosystem never decides R-SEC-09 either way. What decides it is the source the repository holds, and the analyzer for that language is in the sibling file for its ecosystem. An image built from a repository whose only source is Dart is the Dart answer; an image built from a Go repository is the Go answer. Do not report a separate finding for the image.

## Vulnerability watch (R-SEC-11)

Nothing on the forge watches a published image's contents. The dependency graph's supported ecosystems table has no container row, and the GitHub Advisory Database's ecosystem list carries no operating system package ecosystem, so neither the packages inside a layer nor the base image itself reaches Dependabot alerts.

The watcher is therefore a scanner reading the image. `osv-scanner` scans a container image and extracts Alpine APK packages, Debian and Ubuntu dpkg or apt packages, Go binaries, Rust binaries built with `cargo-auditable`, Java uber jars, node modules, and Python wheels, which is the layer contents the forge cannot see.

Scan by digest rather than by tag. A registry tag is mutable by design, so a scan of `latest` records what that name resolved to at scan time and nothing about what a consumer pulls tomorrow. This is the same property R-SEC-13 states when it places a container registry tag outside its own scope and names the digest as the immutable identity of a published image.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [Dockerfile best practices](https://docs.docker.com/build/building/best-practices/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
