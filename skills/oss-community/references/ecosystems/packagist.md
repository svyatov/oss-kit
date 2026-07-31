# Packagist

## License declaration (R-COM-01)

`composer.json` declares it in the top-level `license` property, which is either a string or an array of strings. Composer's schema recommends SPDX identifiers and points at the SPDX registry for the full set, and it gives `"proprietary"` as the identifier for closed-source software.

The two multi-license forms mean different things and the schema distinguishes them. A disjunction, a choice the consumer makes, is written either as an array of identifiers or as one string with the alternatives separated by `or` inside parentheses. A conjunction, where every named license applies at once, is written as one string with the identifiers separated by `and` inside parentheses. An array and an `and` string are therefore not interchangeable, and reading one as the other changes what the package is offering.

The property is optional, described as highly recommended rather than required, so a `composer.json` with no `license` key is a manifest declaring nothing rather than an invalid one. That leaves the root license file as the only statement, which is worth raising: a package published to Packagist with no declared license shows nothing to a consumer reading the registry.

Source: [The composer.json schema](https://getcomposer.org/doc/04-schema.md).

## Funding platform name

Tidelift's platform name for this ecosystem is `packagist`, so the GitHub funding file's entry reads `tidelift: packagist/<package-name>`. The accepted key format is `PLATFORM-NAME/PACKAGE-NAME`, described in `github.md` beside the rest of the accepted keys.

One wrinkle belongs to this ecosystem alone. A Packagist package name is itself `vendor/project`, so the value carries a second slash where the other five platforms carry one. Confirm the exact string against the project's own Tidelift subscription before shipping the line rather than assembling it from the two halves.

The roster at `skills/oss-audit/ecosystems.json` records `"tidelift": "packagist"` and is the canonical copy. This line exists because a single-skill install of `oss-community` does not carry that file; where the two disagree, the roster is right and this line is corrected to it.

Verified 2026-07-31 against [The composer.json schema](https://getcomposer.org/doc/04-schema.md) and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
