# Container images

## Version sources (R-CHG-03)

No file in the repository states the released version. A container ecosystem is identified by a registry push rather than by a Dockerfile, and the version lives in the tag that push carries.

Three places can hold it, and a release is consistent when they agree. The git tag is one. The image tag pushed to the registry is the second, and where the workflow computes it from the git ref they are effectively one source, while a hardcoded tag in the workflow is a second source that silently stops matching. The third is the image itself: the OCI annotation `org.opencontainers.image.version` records the "version of the packaged software", and `org.opencontainers.image.revision` records the source control revision it was built from. A build that sets both makes the released image self-describing, so a consumer holding only a digest can still say which release it is.

The changelog is the fourth thing to compare, and it is the only one of the four that a registry cannot answer for.

## Version syntax (R-CHG-02)

A registry constrains the tag string and says nothing about its meaning. An OCI tag is "a custom, human-readable pointer to a manifest", at most 128 characters, matching `[a-zA-Z0-9_][a-zA-Z0-9._-]{0,127}`. Any SemVer release version fits, with one exception: `+` is not in that character class, so SemVer build metadata cannot appear in a tag and a version carrying it has to be rewritten, conventionally with the `+` replaced by a `-`.

Two common tag habits are not versions and should not be read as ones. A rolling tag such as `latest` or a branch name names no version at all. A truncated tag such as `1` or `1.2` is moved forward as new patches ship, so it names a moving set of versions. Both are convenience pointers; the released version is the full one, and that is the tag a changelog heading corresponds to.

## Major version in package identity (R-CHG-07)

A container registry does not encode the major version in package identity. The repository name is stable across majors and the major lives in the tag, so R-CHG-07 does not reach this ecosystem. A published major-only tag such as `2` is one of the moving pointers above rather than a second identity.

## Withdrawing a release (R-CHG-01)

The digest is the identity and the tag is a pointer at it, so withdrawal splits in two. Anything pinned as `image@sha256:...` is unaffected by anything done to tags, and the digest keeps resolving for as long as the manifest exists.

The OCI distribution specification defines deletion for both halves, a `DELETE` to `/v2/<name>/manifests/<tag>` for the tag and to `/v2/<name>/manifests/<digest>` for the manifest, and makes support optional: "Registries MAY implement deletion or they MAY disable it", answering `400 Bad Request` or `405 Method Not Allowed` where it is off. So the first thing to establish is whether the registry in use implements it at all.

On the GitHub Container Registry it is implemented with limits. A specific version of a public package can be deleted only when that version has no more than 5,000 downloads, no public package can be deleted at all when any of its versions has more than 5,000 downloads, and a deleted version can be restored within 30 days.

One thing to rule out rather than reach for: never re-point a released version tag at a new build. A consumer who pulled by tag and a consumer who pulled by digest then hold different bytes under one version number, and no changelog can describe that release honestly.

`[YANKED]` on the changelog heading maps to deleting the version-tagged image where the registry allows it, and to publishing a fixed version and saying so where it does not. Name the digest in the entry, because for anyone who pinned one, that string is the only identifier the withdrawal is about.

Verified 2026-07-31 against [OCI distribution specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md), [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md), [Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), and [Deleting and restoring a package](https://docs.github.com/en/packages/learn-github-packages/deleting-and-restoring-a-package).
