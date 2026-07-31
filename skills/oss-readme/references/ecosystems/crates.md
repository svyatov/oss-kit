# crates.io

## Version badge

Shields.io serves this one at `img.shields.io/crates/v/CRATE`, taking the crate name as its only path parameter.

The default label is `crates.io`, dot included. Keep it: the dot is part of the registry's name rather than a stray character, and rewriting it to `crates` names something else.

Link the badge to the crate page:

```markdown
[![crates.io](https://img.shields.io/crates/v/CRATE)](https://crates.io/crates/CRATE)
```

Shields.io also serves `crates/msrv`, `crates/l`, `crates/size`, and a download count for the same crate. None of them belongs in the row. The minimum supported Rust version is a fact worth stating, and it belongs in the facts list where it can carry a policy sentence beside it, rather than in a badge that states a number with no policy.

## Install command

```bash
cargo add CRATE
```

`cargo add` writes the dependency into `Cargo.toml` and picks the constraint, and the registry is where it looks unless a `--path` or `--git` option sends it somewhere else. A crate that ships a binary shows `cargo install CRATE` instead, because `cargo add` on a binary crate adds a dependency nobody will call.

Name the crate exactly as published. A crate whose library name differs from its package name, which happens whenever the package name carries a hyphen, also needs the `use` path in the usage example to show the underscored form, so check the example against the name rather than assuming they match.

Verified 2026-07-31 against [cargo-add](https://doc.rust-lang.org/cargo/commands/cargo-add.html), [cargo-install](https://doc.rust-lang.org/cargo/commands/cargo-install.html), [Cargo targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html), and `services/crates/crates-version.service.js` plus `services/crates/crates-base.js` in [badges/shields](https://github.com/badges/shields).
