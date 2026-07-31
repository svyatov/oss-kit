# Hex

## License declaration (R-COM-01)

`mix.exs` declares it. The `package` metadata returned by the project's `package/0` function carries a `:licenses` key holding a list, and Hex's publishing documentation states plainly that the attribute is required. Valid identifiers come from the SPDX license list, and a license SPDX does not carry uses a `LicenseRef-<idstring>` identifier with the full license text shipped in the package.

That requirement is worth using. Because Hex refuses to publish without `:licenses`, every package on the registry declared something, so a published Hex package always has a manifest side to compare rather than the absence other ecosystems permit. A `mix.exs` with no `package/0` at all is an application rather than a library, which declares nothing and publishes nothing.

The default `:files` list already includes `LICENSE*` and `license*`, so the root license file normally travels with the package without being named anywhere. Where a project overrides `:files`, check the license file is still in the list; a package declaring `MIT` and shipping no license text is the mismatch this rule exists to catch, in a form the manifest alone does not reveal.

So the manifest side of R-COM-01 is the `:licenses` list, and the file side is the root license file. A list with more than one entry needs every entry traceable to what that file says.

Source: [Publishing a package](https://hex.pm/docs/publish).

## Funding platform name

Tidelift lists no platform for this ecosystem, so there is no `tidelift` value a Hex package can write.

GitHub's own documentation for the funding file enumerates the accepted `tidelift` platform names. It names six, every one of them another ecosystem's registry; Elixir, Erlang, and Hex appear nowhere in it. That is why the roster at `skills/oss-audit/ecosystems.json` carries no `tidelift` key for this ecosystem.

Source: [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).

The strongest documented fallback is the rest of the same file. The `github`, `open_collective`, `liberapay`, and `custom` keys are forge-level rather than ecosystem-level, so they reach an Elixir project exactly as they reach any other. The package metadata's own `:links` map is a second surface, since it renders on the package page and takes an arbitrary label and URL, which is where a funding page reaches a reader who arrived at the registry rather than the repository.

No rule in `STANDARD.md` requires a funding file at all, so this gap costs a repository nothing when it is scored. Tidelift adding a Hex platform, and GitHub's funding documentation listing it, is what would retire it.

Verified 2026-07-31 against [Publishing a package](https://hex.pm/docs/publish) and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
