# crates.io

## License declaration (R-COM-01)

`Cargo.toml` declares it in the `[package]` table. `license` holds an SPDX 2.3 license expression, and the Cargo manifest reference is specific about the vocabulary: the name must be a known license from SPDX license list 3.20. The common dual-licensed Rust crate therefore reads `license = "MIT OR Apache-2.0"`, which is one expression rather than two declarations.

`license-file` is the alternative, not an addition. It holds a path relative to the `Cargo.toml` pointing at the text of a nonstandard license, and the reference says it may be specified in lieu of `license`. Cargo's own note records that crates.io requires one of the two to be set, so a crate that reaches the registry always declared something.

That leaves R-COM-01 with two shapes to read. Where `license` is set, the expression is the manifest side and the root license file is the other. Where `license-file` is set instead, the manifest names a path rather than a license, so follow the path and read the file it names; a `license-file` pointing somewhere other than the root license file is worth raising, because the crate then ships one document while the repository advertises another.

Source: [The manifest format](https://doc.rust-lang.org/cargo/reference/manifest.html).

## Funding platform name

Tidelift lists no platform for this ecosystem, so there is no `tidelift` value a Rust crate can write.

GitHub's own documentation for the funding file enumerates the accepted `tidelift` platform names. It names six, every one of them another ecosystem's registry; Rust and crates.io appear nowhere in it. That is why the roster at `skills/oss-audit/ecosystems.json` carries no `tidelift` key for this ecosystem.

Source: [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).

The strongest documented fallback is the rest of the same file. The `github`, `open_collective`, `liberapay`, and `custom` keys are forge-level rather than ecosystem-level, so they reach a Rust project exactly as they reach any other, and `custom` takes up to four arbitrary URLs where the maintainer already collects funding somewhere the file has no key for.

No rule in `STANDARD.md` requires a funding file at all, so this gap costs a repository nothing when it is scored; what it costs is one option a maintainer in another ecosystem would have. Tidelift adding a Rust platform, and GitHub's funding documentation listing it, is what would retire it.

Verified 2026-07-31 against [The manifest format](https://doc.rust-lang.org/cargo/reference/manifest.html) and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
