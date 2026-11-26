# Maven Central

## Detection signals

A `pom.xml`, `build.gradle`, or `build.gradle.kts` establishes presence. A lone `gradle.lockfile` or `gradle/verification-metadata.xml` also establishes presence. Both Gradle files are opt-in. Apache Maven has no lockfile format.

For Maven or Gradle, check that the release task publishes the project's coordinate to Maven Central. A matching artifact on Central also establishes shipment. A publishing plugin or a declaration of another remote repository supplies no evidence of publication to Central.

Sources: [POM reference](https://maven.apache.org/pom.html), [Maven Publish Plugin](https://docs.gradle.org/current/userguide/publishing_maven.html).

Three cases decide most arguments:

- Read `modelVersion`, `groupId`, `artifactId`, and `version`. The project can inherit `groupId` and `version` from its parent. Maven defaults `packaging` to `jar`.
- `<packaging>pom</packaging>` is required, in Maven's words, "for parent and aggregation (multi-module) projects", and such a POM produces no compiled artifact. That does not make it unshipped: a parent or a bill of materials is deployed as a POM and consumed by name. Read the deployment configuration rather than the packaging type.
- Applications and test builds can use Maven or Gradle without publishing a package. Check registry evidence before ruling out a release published outside the checkout.

## Release track

Maven Central takes the registry-push track. A release uploads a built bundle to the Sonatype Central Portal under a credential, so there is an upload to secure and a credential to scope, which is what assigns the track. The roster records `"track": "registry-push"` for Maven Central and the release area's preamble names Maven Central in its registry-push list.

Verified 2026-07-31 against https://maven.apache.org/pom.html and https://docs.gradle.org/current/userguide/publishing_maven.html.
