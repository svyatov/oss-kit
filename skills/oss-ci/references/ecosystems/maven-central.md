# Maven Central

## Toolchain and matrix (R-CI-03)

On GitHub Actions, `actions/setup-java` installs a JDK; `distribution` and `java-version` are both required, so the matrix names a vendor as well as a version.

```yaml
strategy:
  matrix:
    java: ['17', '21', '25']
steps:
  - uses: actions/setup-java@v6  # oss-harden pins this to a commit SHA
    with:
      distribution: temurin
      java-version: ${{ matrix.java }}
```

Where the support claim lives depends on the build tool. A Maven project declares it as the `maven.compiler.release` property in `pom.xml`, or as `<release>` in the compiler plugin's configuration. A Gradle project declares it as `java.toolchain.languageVersion`, `JavaLanguageVersion.of(17)`.

Read that as a floor rather than a ceiling: `release` and the Gradle toolchain state the bytecode level the build targets, so a project claiming Java 17 is claiming to run on 17 and later, and the matrix covers the maintained JDK lines from that floor up. A Gradle toolchain also selects the JDK that compiles, which is a separate thing from the JDK the job installs, so the two can disagree without failing anything.

On GitLab, run the job in an Eclipse Temurin image and vary the tag with `parallel:matrix`.

Sources: [actions/setup-java](https://github.com/actions/setup-java), [maven-compiler-plugin, setting the release](https://maven.apache.org/plugins/maven-compiler-plugin/examples/set-compiler-release.html), [Gradle, toolchains](https://docs.gradle.org/current/userguide/toolchains.html), [adoptium/containers](https://github.com/adoptium/containers).

## Dependency caching (R-CI-04)

`actions/setup-java` has a `cache` input, off by default, accepting `maven`, `gradle`, and `sbt`. Its key has the form `setup-java-${platform}-${packageManager}-${fileHash}`, and the README lists the files behind that hash: `**/pom.xml`, `**/.mvn/wrapper/maven-wrapper.properties`, and `**/.mvn/extensions.xml` for Maven, and `**/*.gradle*`, `**/gradle-wrapper.properties`, `buildSrc/**/Versions.kt`, `buildSrc/**/Dependencies.kt`, `gradle/*.versions.toml`, and `**/versions.properties` for Gradle.

The Maven half is the one to be honest about. Apache Maven publishes no lockfile format, and the roster records `files: []` for it. So there is nothing resolved to key on, and the cache is keyed on the build files that declare requirements instead. Where a `pom.xml` names a version range or a property another artifact resolves, the same key can serve a different dependency set than the one that filled it, and no CI change fixes that because there is no file recording what was resolved. Maven's own answers are upstream of CI: fixed versions, `dependencyManagement`, and the enforcer rule `banDynamicVersions`. Report this as an ecosystem-level limit rather than a keying mistake, and note that Maven Resolver's Trusted Checksums record a committed hash file under `.mvn/checksums/` that pins content without being a lockfile. A Maven lockfile format would retire it.

Gradle can lock, opt-in per configuration, writing `gradle.lockfile`. The README's Gradle hash list does not name that file, and `**/*.gradle*` does not match it, so a project using dependency locking names it in `cache-dependency-path` or its lock state stays out of the key.

Two more documented behaviours are worth knowing on a matrix. `cache-read-only: true` restores without uploading, which the README pairs with a seed job so a fan-out matrix does not have every cell race to write the same key. And `cache-path` replaces the cached filesystem locations without changing the key, so jobs meant to share a key have to pass the same `cache-path`.

On GitLab, point the local repository inside the project, `mvn -Dmaven.repo.local=.m2/repository` or `GRADLE_USER_HOME`, and key `cache:key:files` on the build file, because GitLab caches only paths inside the project directory.

Sources: [actions/setup-java](https://github.com/actions/setup-java), [Maven Resolver, expected checksums](https://maven.apache.org/resolver/expected-checksums.html), [Gradle, dependency locking](https://docs.gradle.org/current/userguide/dependency_locking.html), [GitLab CI/CD YAML reference, cache](https://docs.gitlab.com/ci/yaml/#cachepaths).

## Test command (R-CI-06)

For Maven, `mvn test` runs the `test` lifecycle phase, which binds `surefire:test` by default for `jar`, `war`, `ejb`, `rar`, and `maven-plugin` packaging. Maven's own description of the phase is that these tests should not require the code be packaged or deployed, which is the line between `mvn test` and `mvn verify`; a project whose integration tests run under failsafe declares them at `verify`, so calling only `mvn test` runs half the suite.

For Gradle, the `test` task runs the suite, invoked as `./gradlew test` through the committed wrapper. The suite is declared by source set layout plus the test framework dependency rather than by a command in the build file, so the build file naming no test task does not mean there is no suite.

Sources: [Maven, introduction to the build lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html), [Gradle, toolchains](https://docs.gradle.org/current/userguide/toolchains.html).

Verified 2026-07-31 against https://github.com/actions/setup-java, https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html, https://maven.apache.org/plugins/maven-compiler-plugin/examples/set-compiler-release.html, https://maven.apache.org/resolver/expected-checksums.html, https://docs.gradle.org/current/userguide/toolchains.html, https://docs.gradle.org/current/userguide/dependency_locking.html, https://github.com/adoptium/containers, and https://docs.gitlab.com/ci/yaml/.
