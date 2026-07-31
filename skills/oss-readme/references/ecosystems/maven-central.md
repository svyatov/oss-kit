# Maven Central

## Version badge

Shields.io serves this one at `img.shields.io/maven-central/v/GROUP_ID/ARTIFACT_ID`, taking the coordinates as two path parameters. An optional third segment is a version prefix, so `img.shields.io/maven-central/v/GROUP_ID/ARTIFACT_ID/1.` pins the badge to the 1.x line, which is what a project maintaining two supported lines needs.

Behind that path the service is a redirect onto the generic Maven metadata badge. It turns the dots in the group ID into slashes and reads `https://repo1.maven.org/maven2/GROUP/ARTIFACT/maven-metadata.xml`, and it supplies the label `maven-central` itself. Keep that label.

Link the badge to the artifact page on the Central Portal:

```markdown
[![maven-central](https://img.shields.io/maven-central/v/GROUP_ID/ARTIFACT_ID)](https://central.sonatype.com/artifact/GROUP_ID/ARTIFACT_ID)
```

## Install command

There is no install command here, and that is not a gap. Maven and Gradle both take a dependency declaration in a build file rather than a command that edits one, so what a README shows is the declaration itself.

For Maven, in `pom.xml`, inside `<dependencies>`:

```xml
<dependency>
  <groupId>GROUP_ID</groupId>
  <artifactId>ARTIFACT_ID</artifactId>
  <version>VERSION</version>
</dependency>
```

For Gradle, in `build.gradle.kts`:

```kotlin
dependencies {
    implementation("GROUP_ID:ARTIFACT_ID:VERSION")
}
```

Show both only where the project supports both, which for a library published to Central it usually does. The version in each is a literal, so it is the one number in the README most likely to go stale; either keep it current with each release or write the coordinates and send the reader to the artifact page for the version. A version range belongs in neither snippet, because a range resolves differently from a fixed version and a README is the wrong place to teach that difference.

`<scope>` stays out of a README snippet unless the artifact is genuinely test-only or provided-only. The Maven guide includes it in its own example, and a reader who copies `<scope>test</scope>` for a runtime library gets a compile error.

Verified 2026-07-31 against [Maven Getting Started Guide](https://maven.apache.org/guides/getting-started/index.html), [Declaring dependencies](https://docs.gradle.org/current/userguide/declaring_dependencies.html), [Maven Central Version badge](https://shields.io/badges/maven-central-version), and `services/maven-central/maven-central.service.js` in [badges/shields](https://github.com/badges/shields).
