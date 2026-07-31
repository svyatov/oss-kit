# Container images

## License declaration (R-COM-01)

A container image has no manifest file in the repository, so there is nothing in a checkout to read. The declaration lives in the built image, in the OCI annotation `org.opencontainers.image.licenses`, whose definition is "License(s) under which contained software is distributed as an SPDX License Expression". The value is an expression, so `MIT OR Apache-2.0` is one annotation rather than two.

Three properties of annotations shape what can be concluded from one. They are optional: the spec says if there are no annotations the property is either absent or an empty map, so an image without the key is an image that declared nothing, not one that declared no license. They are advisory: a consumer must not error on an unknown key, so nothing enforces the value. And the spec names their intended homes as the image index, the image manifest, and the descriptor, so where the key ends up depends on which of those the build tooling wrote it to. The document also carries a back-compatibility section mapping these keys to their Label Schema equivalents, which is why the same names turn up as image labels in older tooling. Read the image that was actually pushed rather than assuming from the Dockerfile which of the two a build produced.

So the manifest side of R-COM-01 for a repository whose only published artifact is an image is that annotation, and the file side is the root license file. Where the repository ships an image and a package, both declarations are compared against the same file and they have to agree with each other as well.

The roster's note for this ecosystem is worth keeping in view while scoring: a container ecosystem is detected by a registry push or an existing image, never by the presence of a Dockerfile, because a Dockerfile more often builds a test harness than a shipped image. A repository whose Dockerfile builds nothing anybody pulls has no image annotation to read and no finding to record.

Source: [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md).

## Funding platform name

Tidelift lists no platform for this ecosystem, so there is no `tidelift` value a container image can write.

GitHub's own documentation for the funding file enumerates the accepted `tidelift` platform names. It names six, every one of them a language package registry; no container registry appears. That is why the roster at `skills/oss-audit/ecosystems.json` carries no `tidelift` key for this ecosystem.

Source: [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).

The gap is wider here than in the four other ecosystems with no platform name, because a container registry serves no project page for a funding link to sit on at all. The strongest documented fallback is entirely forge-level: the `github`, `open_collective`, `liberapay`, and `custom` keys in the funding file, which reach somebody who found the repository. Somebody who found only the image has the `org.opencontainers.image.url` and `org.opencontainers.image.source` annotations, which point back at the project, and nothing more direct.

No rule in `STANDARD.md` requires a funding file at all, so this gap costs a repository nothing when it is scored. A container registry growing project metadata that a funding link could live in is what would retire it, and no such surface exists today.

Verified 2026-07-31 against [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md) and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
