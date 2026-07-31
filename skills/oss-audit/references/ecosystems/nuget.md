# NuGet

## Detection signals

NuGet is present when a `*.csproj`, `*.fsproj`, or `*.vbproj` turns up anywhere in the checkout. A `packages.lock.json` beside one is a second present signal and never the only one to rely on, because NuGet's lockfile is opt-in: it appears only when `RestorePackagesWithLockFile` is set or an empty file already exists, so its absence says nothing about whether the ecosystem is in the repository.

NuGet is shipped when a project packs and a publish step exists: a release workflow running `dotnet pack` and `dotnet nuget push`, or an existing page on nuget.org for the project's `PackageId`. NuGet documents `PackageId` as defaulting to `$(AssemblyName)`, so a shipped package often names itself nowhere in the project file.

Sources: [Create a NuGet package using MSBuild](https://learn.microsoft.com/en-us/nuget/create-packages/creating-a-package-msbuild), [NuGet pack and restore as MSBuild targets](https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets).

Three cases decide most arguments:

- `IsPackable` proves the shipped answer in one direction only. NuGet documents it as "a Boolean value that specifies whether the project can be packed. The default value is `true`", so `false` settles the question and its absence settles nothing.
- Read `Directory.Build.props` before reading a single project file. It sets properties for every project beneath it, `IsPackable` among them, so a solution can turn packing off for a whole directory of test and sample projects in one line that no `.csproj` repeats.
- A test project, a sample application, or a benchmark project is present. So is a `packages.lock.json` on its own. Neither says anything about what the repository distributes.

## Release track

NuGet takes the registry-push track. `dotnet nuget push` uploads a built `.nupkg` to the registry under an API key, so there is an upload to secure and a credential to scope, which is what assigns the track. The roster records `"track": "registry-push"` for NuGet and the release area's preamble names NuGet in its registry-push list.

Verified 2026-07-31 against https://learn.microsoft.com/en-us/nuget/create-packages/creating-a-package-msbuild, https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets, and https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files.
