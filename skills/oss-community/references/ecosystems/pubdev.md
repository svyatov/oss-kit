# pub.dev

## License declaration (R-COM-01)

`pubspec.yaml` has no license field. The pubspec reference names every supported top-level field, `name`, `version`, `description`, `homepage`, `repository`, `issue_tracker`, `documentation`, `dependencies`, `dev_dependencies`, `dependency_overrides`, `environment`, `executables`, `platforms`, `publish_to`, `funding`, `false_secrets`, `screenshots`, `topics`, `ignored_advisories`, and `hooks`, and none of them is a license. Pub ignores anything else in the file, so inventing a `license` key states nothing to anybody.

The license lives in a file instead, and Dart's publishing guide requires one: include a `LICENSE` file in your package. It recommends the BSD 3-clause license, which the Dart and Flutter teams use, while allowing any license appropriate for the package.

That collapses R-COM-01 to one side, the same shape Go modules reaches by a different route. There is no manifest declaration to compare the file against, so what remains is the file existing at the repository root and containing the full text of a license you can name. Read it rather than trusting its filename, and where the repository also carries another ecosystem's manifest, that manifest's declaration is compared against the same file.

Source: [The pubspec file](https://dart.dev/tools/pub/pubspec) and [Publishing packages](https://dart.dev/tools/pub/publishing).

## Funding platform name

Tidelift lists no platform for this ecosystem, so there is no `tidelift` value a Dart package can write.

GitHub's own documentation for the funding file enumerates the accepted `tidelift` platform names. It names six, every one of them another ecosystem's registry; Dart, Flutter, and pub.dev appear nowhere in it. That is why the roster at `skills/oss-audit/ecosystems.json` carries no `tidelift` key for this ecosystem.

Source: [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).

This is the one ecosystem with a documented fallback of its own. `pubspec.yaml` supports a top-level `funding` field, listed in the pubspec reference beside `homepage` and `repository`, so a Dart package states its funding links in its own manifest and pub.dev reads them from there. Use it in addition to the forge-level `github`, `open_collective`, `liberapay`, and `custom` keys, not instead of them: the manifest field reaches somebody browsing the registry and the funding file reaches somebody browsing the repository.

No rule in `STANDARD.md` requires a funding file at all, so this gap costs a repository nothing when it is scored, and the manifest field covers most of what the missing platform name would have. Tidelift adding a Dart platform, and GitHub's funding documentation listing it, is what would retire it.

Verified 2026-07-31 against [The pubspec file](https://dart.dev/tools/pub/pubspec), [Publishing packages](https://dart.dev/tools/pub/publishing), and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
