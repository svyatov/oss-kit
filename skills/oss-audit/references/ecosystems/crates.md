# crates.io

## Detection signals

crates.io is present when a `Cargo.toml` or a `Cargo.lock` turns up anywhere in the checkout.

crates.io is shipped when a `Cargo.toml` carries a `[package]` section with `name` and `version`, `publish` is not set to `false`, and publish evidence exists: a release workflow running `cargo publish`, or an existing page on crates.io for that name.

Sources: [The manifest format](https://doc.rust-lang.org/cargo/reference/manifest.html), [Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html).

Three cases decide most arguments:

- A virtual manifest declares no package. Cargo's own words: "a `Cargo.toml` file can be created with a `[workspace]` section but without a `[package]` section... This is called a virtual manifest." The workspace root is present, and each member answers the shipped question for itself.
- `publish = false` settles the shipped answer, and Cargo documents it as preventing publishing entirely. `publish = ["some-registry-name"]` is the other half of the same field and means the opposite: the crate ships, to the registry named, and crates.io is not it. An omitted `version` has the same practical effect as `publish = false`, which Cargo records as preventing "a package from being published to a registry by mistake".
- An internal `Cargo.toml` for an `xtask` helper, a fuzz target, or a benchmark harness is present. So is a `Cargo.lock` on its own. Neither says anything about what the repository distributes.

## Release track

crates.io takes the registry-push track. `cargo publish` uploads a built `.crate` file to the registry under a credential, so there is an upload to secure and a credential to scope, which is what assigns the track. The roster records `"track": "registry-push"` for crates.io and the release area's preamble names crates.io in its registry-push list.

Verified 2026-07-31 against https://doc.rust-lang.org/cargo/reference/manifest.html and https://doc.rust-lang.org/cargo/reference/workspaces.html.
