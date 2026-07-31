# NuGet

## Toolchain and matrix (R-CI-03)

On GitHub Actions, `actions/setup-dotnet` installs one or more .NET SDK versions. The support claim lives in the project file: `TargetFramework` for a single target and `TargetFrameworks` for several, each a target framework moniker such as `net10.0` or `netstandard2.0`. A library that targets more than one moniker claims all of them, and that list is what the matrix covers.

```yaml
strategy:
  matrix:
    dotnet: ['8.0.x', '9.0.x', '10.0.x']
steps:
  - uses: actions/setup-dotnet@v6  # oss-harden pins this to a commit SHA
    with:
      dotnet-version: ${{ matrix.dotnet }}
```

There is a trap in that matrix the README calls out. Unless a concrete version is pinned in `global.json`, the SDK selects the latest installed version, including versions preinstalled on the runner, so every matrix cell can silently build with the same newest SDK and report a green matrix that tested one version. The README's answer is to write a temporary `global.json` per cell. Multi-targeting is the other half: a project with `TargetFrameworks` builds every moniker from one SDK, so the matrix over SDK versions and the target list in the project file are different axes and both have to be read.

On GitLab, run the job in Microsoft's .NET SDK image and vary the tag with `parallel:matrix`.

Sources: [actions/setup-dotnet](https://github.com/actions/setup-dotnet), [Target frameworks in SDK-style projects](https://learn.microsoft.com/en-us/dotnet/standard/frameworks), [dotnet/dotnet-docker](https://github.com/dotnet/dotnet-docker).

## Dependency caching (R-CI-04)

`actions/setup-dotnet` has a `cache` input, off by default, that caches the NuGet `global-packages` folder and keys it on the hash of `packages.lock.json` found in the repository root, with `cache-dependency-path` for other layouts.

The precondition is the thing to check first. NuGet lock files are opt-in: the roster records `mode: opt-in`, enabled by the MSBuild property `RestorePackagesWithLockFile` or by an existing `packages.lock.json`. The action does not degrade gracefully without one; its README says that if the lock file does not exist, the action throws an error. So a project with no lock file either turns lock files on or runs without `cache: true`, and turning them on is a change to the project, not to CI.

```yaml
- uses: actions/setup-dotnet@v6  # oss-harden pins this to a commit SHA
  with:
    dotnet-version: ${{ matrix.dotnet }}
    cache: true
- run: dotnet restore --locked-mode
```

Two documented consequences travel with that cache. It restores only the `global-packages` folder, which commonly surfaces as error NU1403 on restore, and the README's answer is the `DisableImplicitNuGetFallbackFolder` property. And `NUGET_PACKAGES` relocates the folder, which the README recommends on runners that ship large preinstalled libraries; on GitLab it is required rather than recommended, because GitLab caches only paths inside the project directory and the default folder sits under the home directory.

Sources: [actions/setup-dotnet](https://github.com/actions/setup-dotnet), [Package references in project files](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files), [GitLab CI/CD YAML reference, cache](https://docs.gitlab.com/ci/yaml/#cachepaths).

## Test command (R-CI-06)

`dotnet test` builds the solution and runs the tests. From the .NET 10 SDK it runs them under either VSTest or Microsoft.Testing.Platform, and the runner is selected in `global.json`:

```json
{
  "test": {
    "runner": "Microsoft.Testing.Platform"
  }
}
```

Before .NET 10 there is no choice and VSTest is used. The available command-line options differ between the two, so read `global.json` before copying flags from an example. The suite itself is declared by the presence of a test project, which is discovered through the solution rather than named in CI, so `dotnet test` at the solution root is the whole invocation for most repositories.

Sources: [dotnet test](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test).

Verified 2026-07-31 against https://github.com/actions/setup-dotnet, https://learn.microsoft.com/en-us/dotnet/standard/frameworks, https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test, https://github.com/dotnet/dotnet-docker, and https://docs.gitlab.com/ci/yaml/.
