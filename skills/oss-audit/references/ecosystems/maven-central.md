# Maven Central

## Detection signals

Maven Central is present when a `pom.xml`, a `build.gradle`, or a `build.gradle.kts` turns up anywhere in the checkout. Lockfiles are not a present signal on the Maven half at all, because Apache Maven publishes no lockfile format; on the Gradle half a `gradle.lockfile` or a `gradle/verification-metadata.xml` is a second signal and never the only one, since both are opt-in.

Maven Central is shipped when a coordinate is deployed there. On Maven the evidence is a release workflow deploying to the Sonatype Central Portal, or an existing artifact under that `groupId` on central.sonatype.com. On Gradle it is the `maven-publish` plugin applied with a `MavenPublication` and a remote repository declared, plus a publishing task in the release path; Gradle documents that plugin as providing "the ability to publish build artifacts to an Apache Maven repository".

Sources: [POM reference](https://maven.apache.org/pom.html), [Maven Publish Plugin](https://docs.gradle.org/current/userguide/publishing_maven.html).

Three cases decide most arguments:

- Read the coordinate before anything else. Maven's minimum POM is `modelVersion`, `groupId`, `artifactId`, `version`, and `packaging`, and Maven notes that `groupId` and `version` "do not need to be explicitly defined if they are inherited from a parent POM". A module POM that names only an `artifactId` is not incomplete; its other two thirds are one file up.
- `<packaging>pom</packaging>` is required, in Maven's words, "for parent and aggregation (multi-module) projects", and such a POM produces no compiled artifact. That does not make it unshipped: a parent or a bill of materials is deployed as a POM and consumed by name. Read the deployment configuration rather than the packaging type.
- A Gradle build with no `maven-publish` plugin publishes nothing, and a Maven build with no deployment configured publishes nothing. An application, a service, or an Android app built with either is present and not shipped.

## Release track

Maven Central takes the registry-push track. A release uploads a built bundle to the Sonatype Central Portal under a credential, so there is an upload to secure and a credential to scope, which is what assigns the track. The roster records `"track": "registry-push"` for Maven Central and the release area's preamble names Maven Central in its registry-push list.

Verified 2026-07-31 against https://maven.apache.org/pom.html and https://docs.gradle.org/current/userguide/publishing_maven.html.
