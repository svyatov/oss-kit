# NuGet

## Version sources (R-CHG-03)

The version is stated in the project file or in a `.nuspec`, and nuget.org rejects any upload that lacks an exact version number, so one of the two always carries it. In an SDK-style project it is the `Version` property in the `.csproj`, `.fsproj`, or `.vbproj`, or the `VersionPrefix` and `VersionSuffix` pair where the project builds a prerelease suffix separately.

A repository shipping several packages usually hoists the number into `Directory.Build.props`, which every project underneath imports. That file is then the source and no project file states a version, so a search for `<Version>` in the project files finds nothing and reports a false gap. Check for it before concluding a repository has no version source.

## Version syntax (R-CHG-02)

NuGet follows Semantic Versioning 2.0.0, supported by NuGet 4.3.0 and later and by Visual Studio 2017 version 15.3 and later, and `NuGetVersion` diverges from it in three documented ways. It supports a fourth `Revision` segment, so the full form is `Major.Minor.Patch.Revision`, for compatibility with `System.Version`. It requires only the major segment, treating the rest as zero, so `1`, `1.0`, `1.0.0`, and `1.0.0.0` are all accepted and equal. And it compares prerelease labels case-insensitively, so `1.0.0-alpha` and `1.0.0-Alpha` are the same version.

Restore normalizes on top of that: leading zeros are removed, a zero fourth part is dropped so `1.0.0.0` is treated as `1.0.0`, and build metadata is removed so `1.0.7+r3456` is treated as `1.0.7`. Two strings that normalize to the same version are the same package to NuGet, and NuGet says a repository holding `1.0` should not also host `1.0.0` as a separate package. For R-CHG-03 that means comparing normalized forms, and the way to avoid the question is to write the plain three-part version in the project file, the tag, and the changelog heading.

One publishing consequence belongs in a release decision rather than in a syntax note. A version is SemVer 2.0.0 specific when its prerelease label is dot-separated, as in `1.0.0-alpha.1`, or when it carries build metadata, and so is a package any of whose dependency ranges names such a version. Upload one of those to nuget.org and it is invisible to clients older than NuGet 4.3.0.

## Major version in package identity (R-CHG-07)

NuGet does not encode the major version in package identity. A package identifier is stable across majors and holds every version of the package, so R-CHG-07 does not reach this ecosystem. A project that puts a number in the identifier has chosen a name, and nothing in NuGet ties that number to the released major or checks it.

## Withdrawing a release (R-CHG-01)

"nuget.org does not support permanent deletion of packages", because deleting one would break every project that restores it. What exists instead is unlisting, done from the package management page on the site.

An unlisted version disappears from search, from the package page, and from the Visual Studio UI, and stays downloadable and installable by exact version so restore keeps working. Two paths still surface it: a floating version such as `1.0.0-*` resolves to an unlisted package when it is the latest match, and the catalog contains unlisted packages, so replication carries them. Unlisting reduces new adoption; it does not withdraw the bytes.

Deprecation is the separate, louder marker. It applies per version, carries a message, and can name an alternative package, and NuGet points at it as what to reach for when a version cannot be deleted. Use both where a version is actively harmful: unlist it so nobody finds it, and deprecate it so everyone already on it is told.

Deletion happens only through the NuGet team, in exceptional situations such as copyright infringement or potentially harmful content, reported through the package page.

`[YANKED]` on the changelog heading maps to an unlisting, and to an unlisting plus a deprecation where consumers need to be told why.

Verified 2026-07-31 against [Package versioning](https://learn.microsoft.com/en-us/nuget/concepts/package-versioning) and [Deleting packages](https://learn.microsoft.com/en-us/nuget/nuget-org/policies/deleting-packages).
