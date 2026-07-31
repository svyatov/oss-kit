# NuGet

## Automated dependency updates (R-SEC-03)

Dependabot's `nuget` value carries version updates and security updates, with private repositories and private registries supported and vendoring not. Two version facts sit next to each other in GitHub's own table and note, so quote both rather than picking one: the supported versions column reads `<=6.12.0`, and the NuGet note says Dependabot does not run the NuGet CLI and "does support most features up until version 6.8.0". A project relying on a newer restore feature can therefore be updated by a resolver that does not implement it.

On GitLab the Renovate manager is `nuget`.

## Lockfile and frozen install (R-SEC-08)

The lockfile exists and is off by default. NuGet writes `packages.lock.json` at the project root once the MSBuild property `RestorePackagesWithLockFile` is set, or once an empty `packages.lock.json` is present for it to pick up. The frozen restore is `dotnet restore --locked-mode`, or `msbuild -t:restore -p:RestoreLockedMode=true`.

That default is what to report, not an exemption. The tooling publishes a lockfile format, so this ecosystem is inside R-SEC-08 rather than outside it, and a project with no `packages.lock.json` has one property to set rather than a limitation to record.

The one case the rule does not reach is the one NuGet's own documentation carves out: a library project other people depend on, or a common code project other projects depend on, should not check the lock file in, while an application at the start of the dependency chain should. Establish which the repository is before scoring it. A library without the file is following its ecosystem's documented convention; an application without it is the finding.

### What breaks the first time you commit the lockfile

**The SDK that writes the lock decides what is in it, so pin the SDK.** Package pruning removes transitive packages already carried by the shared framework, and its default moves with the toolchain: opt-in under the .NET 9 SDK, and on by default under the .NET 10 SDK for every framework of a project targeting .NET 10 or newer. NuGet states the consequence directly, that enabling pruning "may lead to fewer packages than before pruning" once the lock is regenerated. Restore was also rewritten in 6.12 and the new resolver made the default, with `RestoreUseLegacyDependencyResolver` as the way back. Commit a `global.json` fixing the SDK version, and regenerate the lock on that same version, or a job on another SDK writes a lock the reviewer did not intend.

**A solution commits many lock files, and the updater maintains a subset.** The default is one `packages.lock.json` per project root, and `NuGetLockFilePath` allows a custom path, with `packages.<project_name>.lock.json` as the documented form where several projects share a directory. Locked mode restores exactly what the file lists or fails, so a lock left stale by a partial update turns the build red. Dependabot's tracker carries this as an open defect: it does not update the lock for a project whose graph changes only because a referenced project changed, which is the normal shape under central package management. Give the project one command that restores every project with `--force-evaluate`, and expect to run it on an updater's pull request.

**Multi-targeting is the platform question here.** NuGet "produces a separate dependency graph for each framework", and the lock records each. Adding a target framework changes the defined dependencies, which is exactly what locked mode refuses, so a new framework needs the lock regenerated in the same change rather than afterwards.

Verified 2026-07-31 against [NuGet PackageReference in project files](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files) and [dependabot-core issue 13950](https://github.com/dependabot/dependabot-core/issues/13950).

## Static analysis (R-SEC-09)

CodeQL supports C#, so CodeQL default setup covers this ecosystem on GitHub, and the dependency graph's NuGet row names the same family, .NET languages such as C#, F#, and Visual Basic, plus C++. GitLab's SAST table lists C# under its Semgrep-based analyzer with GitLab-managed rules.

## Vulnerability watch (R-SEC-11)

The dependency graph parses the project files, `.csproj`, `.vbproj`, `.nuspec`, `.vcxproj`, and `.fsproj`, with `packages.config` as an additional file. `packages.lock.json` is not in that table, so committing the lockfile does not widen what the graph sees. What does widen it is automatic dependency submission, which the NuGet row supports; it is a repository setting with no API, described in `github.md` under the controls with no endpoint.

Advisories come from the GitHub Advisory Database, which names this ecosystem NuGet against the nuget.org registry.

`osv-scanner` reads `packages.lock.json`, `packages.config`, and `deps.json`, so the lockfile the graph ignores is exactly the file a scanner can use.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [Package references in project files](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
