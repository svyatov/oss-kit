# Maven Central

## Automated dependency updates (R-SEC-03)

Two Dependabot values reach this registry, because two build tools publish to it. `maven` and `gradle` both carry version updates and security updates in the table, with private repositories and private registries supported for each.

Read the Gradle qualifier before treating the two as equal. Dependabot's own note says that for security updates, Gradle support is limited to manual uploads of the dependency graph data through the dependency submission API, and that when an alert lands on a transitive dependency uploaded that way, Dependabot cannot find the vulnerable dependency in the repository and will not open a security update for it. Version updates still open pull requests where the parent is declared directly. Dependabot also does not run Maven; it updates `pom.xml` files, and it updates `build.gradle`, `build.gradle.kts`, `gradle/libs.versions.toml`, and `gradle.lockfile` without running Gradle.

On GitLab the Renovate managers are `maven` and `gradle`.

## Lockfile and frozen install (R-SEC-08)

This is the one ecosystem in the roster where the answer depends on the build tool rather than the registry, and it is the build tool that earns the exemption.

Apache Maven publishes no lockfile format, opt-in or otherwise. What it offers instead is fixed versions, `dependencyManagement`, and enforcer rules such as `banDynamicVersions` and `requireReleaseDeps`. So the version-lock half of R-SEC-08 falls outside the rule for a Maven build rather than failing it. The integrity half is still reachable: Maven Resolver's trusted checksums record a committed coreutils-format hash file under `${session.rootDirectory}/.mvn/checksums/`, verified at resolution with `-Daether.artifactResolver.postProcessor.trustedChecksums.failIfMissing=true` and `--strict-checksums`.

Gradle publishes both halves and stays inside the rule. Dependency locking writes `gradle.lockfile` per project or subproject, opted into per configuration with `resolutionStrategy.activateDependencyLocking()` or `dependencyLocking { lockAllConfigurations() }` and written with `--write-locks`. The generated file's own header says it is expected to be part of source control, and a version mismatch already fails the build with no extra flag; `LockMode.STRICT` additionally fails when a locked configuration has no lock state. Dependency verification is a separate feature, enabled by the presence of `gradle/verification-metadata.xml`, strict by default, covering checksums and PGP keys.

So a Gradle project publishing to Maven Central that commits no `gradle.lockfile` is a finding, and the same project built with Maven is not. Say which build tool the repository uses when reporting either.

## Static analysis (R-SEC-09)

CodeQL supports Java and Kotlin, so CodeQL default setup covers this ecosystem on GitHub, and the dependency graph's Maven row names Scala alongside Java. GitLab's SAST table lists Java, Kotlin, Groovy, and Scala under its analyzers.

## Vulnerability watch (R-SEC-11)

The two build tools diverge here too. The Maven row is one of the better-covered in the dependency graph: it parses `pom.xml`, supports static transitive dependencies, and supports automatic dependency submission. The Gradle row lists no recommended file and no additional file at all, and supports only automatic dependency submission, so a Gradle project is invisible to the graph until something uploads its resolved set. That is the same repository setting the NuGet, Maven, pip, and Poetry rows use, described in `github.md` under the controls with no endpoint.

Advisories come from the GitHub Advisory Database, which names this ecosystem Maven against the repo.maven.apache.org registry.

`osv-scanner` reads `pom.xml` with transitive dependency scanning, and on the Gradle side `gradle.lockfile`, `buildscript-gradle.lockfile`, and `gradle/verification-metadata.xml`. It also recovers Java uber jars when it scans a container image.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [Maven Resolver expected checksums](https://maven.apache.org/resolver/expected-checksums.html), [Gradle dependency locking](https://docs.gradle.org/current/userguide/dependency_locking.html), [Gradle dependency verification](https://docs.gradle.org/current/userguide/dependency_verification.html), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
