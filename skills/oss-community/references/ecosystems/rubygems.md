# RubyGems

## License declaration (R-COM-01)

The gemspec declares it. `license=` takes one name and `licenses=` takes an array, as in `spec.licenses = ['MIT', 'GPL-2.0']`. Each value is short, no more than 64 characters, and is meant to be the name of the license rather than its text or a URL. The specification reference tells a maintainer to use the standard SPDX identifier, and to point a custom license at a file shipped with the gem through a `LicenseRef-<idstring>` value, where the idstring names the file carrying the license text.

`Gemfile` is the other manifest the roster lists for this ecosystem, and it declares dependencies rather than package metadata, so it carries no license at all. A repository holding a `Gemfile` and no gemspec, an application rather than a gem, therefore has nothing on the manifest side of the comparison. That is not a failure to declare; it is an application that publishes no package.

So the manifest side of R-COM-01 is the gemspec's license value or values, and the file side is the root license file. Where the gemspec lists two, both have to be traceable to what the file says, because an array is a list of licenses that apply and not a menu the reader picks from.

Source: [Specification reference](https://guides.rubygems.org/specification-reference/).

## Funding platform name

Tidelift's platform name for this ecosystem is `rubygems`, so the GitHub funding file's entry reads `tidelift: rubygems/<gem-name>` against the name the gem publishes under. The accepted key format is `PLATFORM-NAME/PACKAGE-NAME`, described in `github.md` beside the rest of the accepted keys.

The roster at `skills/oss-audit/ecosystems.json` records `"tidelift": "rubygems"` and is the canonical copy. This line exists because a single-skill install of `oss-community` does not carry that file; where the two disagree, the roster is right and this line is corrected to it.

Verified 2026-07-31 against [Specification reference](https://guides.rubygems.org/specification-reference/) and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
