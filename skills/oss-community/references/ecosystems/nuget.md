# NuGet

## License declaration (R-COM-01)

The project file declares it through one of two MSBuild properties. `PackageLicenseExpression` holds an SPDX license identifier or expression, `<PackageLicenseExpression>MIT</PackageLicenseExpression>`, and corresponds to `<license type="expression">` in the packed nuspec. `PackageLicenseFile` holds the path to a license file inside the package, for a custom license or one SPDX has not assigned an identifier to, and corresponds to `<license type="file">`.

Three details decide most readings. Only one of `PackageLicenseExpression`, `PackageLicenseFile`, and the deprecated `PackageLicenseUrl` may be set at a time, so a project file states its license exactly once. A referenced license file has to be packed explicitly, with a `<None Include="LICENSE" Pack="true" PackagePath=""/>` item; setting the property alone puts nothing in the package. And NuGet and MSBuild treat a path with no extension as a directory, which is why an extensionless `LICENSE` needs that item spelled out rather than inferred.

So the manifest side of R-COM-01 is `PackageLicenseExpression` in every `.csproj`, `.fsproj`, or `.vbproj` the repository packs from, and the file side is the root license file. A solution packing several projects has one value per project. Where `PackageLicenseFile` is set instead, the project names a path rather than a license, so read the file at that path and check it is the same document the repository root carries. A project still setting only `PackageLicenseUrl` is on a deprecated property and states its license nowhere the package can carry it.

Source: [NuGet pack and restore as MSBuild targets](https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets).

## Funding platform name

Tidelift's platform name for this ecosystem is `nuget`, so the GitHub funding file's entry reads `tidelift: nuget/<package-id>` against the package ID published to nuget.org. The accepted key format is `PLATFORM-NAME/PACKAGE-NAME`, described in `github.md` beside the rest of the accepted keys.

The roster at `skills/oss-audit/ecosystems.json` records `"tidelift": "nuget"` and is the canonical copy. This line exists because a single-skill install of `oss-community` does not carry that file; where the two disagree, the roster is right and this line is corrected to it.

Verified 2026-07-31 against [NuGet pack and restore as MSBuild targets](https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets) and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
