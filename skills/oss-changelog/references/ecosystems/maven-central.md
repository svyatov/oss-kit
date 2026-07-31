# Maven Central

## Version sources (R-CHG-03)

With Maven, the source is the `<version>` element in `pom.xml`, one of the three coordinates alongside `<groupId>` and `<artifactId>`. A multi-module build inherits it from the parent POM, so the number lives once in the parent and each module states it only in its `<parent>` block.

With Gradle, the published version comes from the project's `version` property, which the Maven Publish plugin uses for the POM's `version` unless the publication overrides it. So the source is the `version` assignment in `build.gradle` or `build.gradle.kts`, or a `version` entry in `gradle.properties`, and a `version` set inside the `MavenPublication` block is a second source that wins over it. Read the publication block before trusting the project property.

## Version syntax (R-CHG-02)

Maven has its own version order specification and it is not SemVer. A version string is split into tokens at dots, hyphens, and underscores, and at every transition between digits and characters, with the separator recorded because it affects ordering; an empty token becomes `0`. Then trailing null values are trimmed, where the null values are `0`, the empty string, `final`, and `ga`. That trimming is why `1.0.0`, `1.0`, `1.ga`, and `1.final` are all the same version, reduced to `1`.

Qualifiers order as `alpha < beta < milestone < rc = cr < snapshot < (empty) = final = ga = release < sp`, and `alpha`, `beta`, and `milestone` may be shortened to `a`, `b`, and `m` when a number follows directly. Two entries have no SemVer equivalent. `snapshot` sorts above `rc` and below the release, so `2.0-rc1 < 2.0-SNAPSHOT < 2.0`, and Maven Central rejects `-SNAPSHOT` versions outright, so they never reach a release. And `sp`, for service pack, sorts above the plain release, which SemVer has no way to express at all.

A plain three-part version with no qualifier is both valid SemVer and a well-behaved Maven version, so the practical advice is to use one. The trimming rule is the trap for R-CHG-03: `1.0` in a POM and `1.0.0` in a changelog are one version to Maven and two different strings to a person comparing them.

## Major version in package identity (R-CHG-07)

Maven Central does not encode the major version in package identity. The coordinates that identify an artifact are `groupId` and `artifactId`, the `<version>` element is separate, and nothing requires either coordinate to move when the major does, so R-CHG-07 does not reach this ecosystem. Some projects do carry a number in the artifactId as a convention, which is a naming choice nothing in the build or the repository verifies against the released version.

## Withdrawing a release (R-CHG-01)

Maven Central has no withdrawal. The rule is stated without exception: "Once a component has been released and published to the Central Repository, it cannot be altered", and where a published artifact has a bug, "A new version of the component must be published." The reason given is that build tools cache releases locally and do not re-check them, so a mutable release would break the assumption every consumer's build depends on.

Source: [Can I change a component?](https://central.sonatype.org/faq/can-i-change-a-component/) and [Publish Portal guide](https://central.sonatype.org/publish/publish-portal-guide/).

The only withdrawal window is before publishing. A deployment reaching the VALIDATED state waits in the Portal with Publish and Drop buttons beside it, and dropping it there costs nothing; that window stays open only because `publishingType` defaults to `USER_MANAGED`, which holds a validated deployment until a person releases it. Set it to `AUTOMATIC` and there is no window at all. After publication the deployment record itself is cleaned up from the Deployments tab after 90 days while the artifacts stay in Central permanently.

So a withdrawn version on Maven Central is a changelog fact and nothing else, which sits below what R-CHG-01 expects a `[YANKED]` heading to correspond to: mark the heading, say what replaced it, and publish the replacement, knowing that the registry will keep serving the withdrawn version to anyone who asks for it by coordinate. Sonatype documenting any per-version state a resolver reads, of the kind crates.io and PyPI already publish, would retire the gap.

Verified 2026-07-31 against [POM reference, version order specification](https://maven.apache.org/pom.html), [Can I change a component?](https://central.sonatype.org/faq/can-i-change-a-component/), [Publish Portal guide](https://central.sonatype.org/publish/publish-portal-guide/), and [Gradle Maven Publish plugin](https://docs.gradle.org/current/userguide/publishing_maven.html).
