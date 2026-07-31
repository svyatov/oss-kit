# Maven Central

## License declaration (R-COM-01)

`pom.xml` declares it in a `<licenses>` element holding one `<license>` per license. Each carries `<name>`, `<url>`, an optional `<distribution>` of `repo` or `manual` saying how the project may legally be distributed, and optional `<comments>`. The POM reference recommends an SPDX identifier for `<name>` and tells a project to list the licenses that apply to itself and not those of its dependencies.

Two properties of the element change how it is read. It is inherited: the POM reference lists `licenses` among the elements a child inherits from its parent, so a module declaring none may still be declaring one through the parent chain. Read that chain before concluding a module states nothing. And the reference does not say whether two `<license>` elements mean both apply or the consumer chooses. Unlike an SPDX expression, which carries `AND` and `OR` explicitly, a multi-license POM leaves the relationship unstated, so the license file is what settles it.

A Gradle build publishes a generated POM rather than a checked-in one, so the same `<licenses>` element is still the target; where the repository has `build.gradle` or `build.gradle.kts` and no `pom.xml`, read the POM configuration in the build script.

So the manifest side of R-COM-01 is the effective `<licenses>` element of every module the repository publishes, parents included, and the file side is the root license file.

Source: [POM reference](https://maven.apache.org/pom.html).

## Funding platform name

Tidelift's platform name for this ecosystem is `maven`, not `maven-central` and not `java`, so the GitHub funding file's entry reads `tidelift: maven/<package-name>`. The accepted key format is `PLATFORM-NAME/PACKAGE-NAME`, described in `github.md` beside the rest of the accepted keys.

The roster at `skills/oss-audit/ecosystems.json` records `"tidelift": "maven"` and is the canonical copy. This line exists because a single-skill install of `oss-community` does not carry that file; where the two disagree, the roster is right and this line is corrected to it. This is the one ecosystem whose roster key and Tidelift platform name differ, so it is the one worth checking rather than assuming.

Verified 2026-07-31 against [POM reference](https://maven.apache.org/pom.html) and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
