# pub.dev

## Automated dependency updates (R-SEC-03)

Dependabot's `pub` value carries version updates and security updates, with private repositories and private hosted pub repositories both supported. It is a community-maintained ecosystem, listed as maintained by the Dart community rather than by GitHub, which is worth saying when reporting it: the coverage is real and its maintenance is not GitHub's.

One documented behaviour changes what a quiet updater means here. Dependabot will not perform an update for `pub` when the version it tries to update to is ignored, even if an earlier version is available. An ignore rule on a newer release therefore suppresses the older update too, so read the `ignore` entries before concluding the updater has nothing to propose.

On GitLab the Renovate manager is `pub`.

## Lockfile and frozen install (R-SEC-08)

`dart pub get` writes `pubspec.lock` by default, so unlike NuGet there is no property to turn on, and the frozen install is `dart pub get --enforce-lockfile`.

What keeps the file out of some repositories is convention rather than tooling. Dart's own documentation says application packages should check the lockfile into source control, and that regular packages, which is Dart's word for a library, should not, since they are expected to work with a range of dependency versions. So this ecosystem is inside R-SEC-08 rather than outside it, and only the library case is what the rule's commit-convention clause exempts. Establish which kind of package the repository holds before scoring the missing file, the same way NuGet's library and application split is read.

### What breaks the first time you commit the lockfile

**Generate the lock on the lowest SDK the matrix tests.** Pub resolves against the installed toolchain: it "tries to find the latest version of a package whose SDK constraint works with the version of the Dart SDK that you have installed". A lock written on the newest SDK can therefore name a dependency release whose own `environment` section excludes the oldest job, and that job fails at `pub get` rather than at test. Declaring the project's own SDK constraint does not prevent it, because the constraint bounds the project and the resolver reads the running SDK.

**Give the matrix a lowest-versions job as well.** `dart pub downgrade` gets the lowest versions of every dependency, ignoring any existing lockfile and resolving the minimum that satisfies each constraint. That is the other end of the same range, and it is what catches a constraint whose declared floor the code no longer builds against. Run it in a job that does not commit its result.

**Platform is not a dimension here.** Dart documents the lockfile as the concrete versions of every immediate and transitive dependency, with no per-platform entry, so a lock written on macOS installs on a Linux runner unchanged.

Verified 2026-07-31 against [the pubspec file](https://dart.dev/tools/pub/pubspec), [dart pub downgrade](https://dart.dev/tools/pub/cmd/pub-downgrade), and [the pub glossary](https://dart.dev/tools/pub/glossary).

## Static analysis (R-SEC-09)

No static analyzer documented for Dart detects vulnerability classes.

CodeQL's supported languages list does not mention Dart. GitLab's SAST supported languages table does not list Dart under any analyzer. Dart's own analyzer is documented in terms of errors, warnings, and info-level diagnostics from the language specification plus a set of linter rules, with no security or taint analysis described anywhere in those pages.

Source: [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), and [Customizing static analysis](https://dart.dev/tools/analysis).

The strongest documented fallback is `dart analyze --fatal-infos` as a required check on pull requests, which catches correctness and style classes and no vulnerability class, plus a scanner over `pubspec.lock` for the dependency half described below. Say plainly which of the two a green check represents.

That fallback sits below what R-SEC-09 asks for, and the rule's own clause covers it: a repository holding no source in a language a static analyzer supports falls outside the rule rather than failing it. Report Dart source as outside the rule on that clause and record this reading as the reason, rather than reporting a violation nobody can fix. A Dart entry appearing in either CodeQL's or GitLab's supported languages table retires the gap.

## Vulnerability watch (R-SEC-11)

The dependency graph parses `pubspec.lock` as its recommended file, with `pubspec.yaml` as an additional file. The pub row marks static transitive dependencies, Dependabot graph jobs, and automatic dependency submission all unsupported, so the coverage is what the committed lockfile lists.

Advisories come from the GitHub Advisory Database, which names this ecosystem Pub against the pub.dev registry.

`osv-scanner` reads `pubspec.lock`, which is also what covers a library package that follows the convention above and commits no lockfile: nothing watches such a repository's own resolution, because it has none to watch, and the consumer's application lockfile is where that resolution becomes real.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [dart pub get](https://dart.dev/tools/pub/cmd/pub-get), [Package layout conventions](https://dart.dev/tools/pub/package-layout), [dart analyze](https://dart.dev/tools/dart-analyze), [Customizing static analysis](https://dart.dev/tools/analysis), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
