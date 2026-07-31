# NuGet

## Version badge

Shields.io serves this one at `img.shields.io/nuget/v/PACKAGE`. The `v` is a variant rather than a fixed word: `v` reports the latest stable version and `vpre` reports the latest version including pre-releases, so `img.shields.io/nuget/vpre/PACKAGE` is the pre-release badge and needs no query parameter.

The default label is `nuget`. Keep it.

Link the badge to the package page:

```markdown
[![nuget](https://img.shields.io/nuget/v/PACKAGE)](https://www.nuget.org/packages/PACKAGE)
```

## Install command

```bash
dotnet package add PACKAGE
```

That is the current form. Microsoft renamed the command in the .NET 10 SDK, from the verb-first `dotnet add package` to the noun-first `dotnet package add`, and documents the older form as what to use on the .NET 9 SDK and earlier. Both add a `<PackageReference>` to the project file and then restore.

Which one a README shows follows from what the project supports. A package targeting current .NET shows the noun-first form alone. A package whose readers are still on an older SDK shows the verb-first form, or both with the SDK each one needs, because a reader on .NET 9 who pastes the noun-first form gets an error that says nothing about SDK versions.

Verified 2026-07-31 against [dotnet package add](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add) and `services/nuget/nuget.service.js` in [badges/shields](https://github.com/badges/shields).
