# crates.io

## Toolchain and matrix (R-CI-03)

The Rust project publishes no first-party GitHub Actions setup action. Its own continuous integration chapter drives the toolchain with `rustup`, which is preinstalled on GitHub-hosted runners:

```yaml
strategy:
  matrix:
    toolchain: [stable, beta, nightly]
steps:
  - uses: actions/checkout@v7
  - run: rustup update ${{ matrix.toolchain }} && rustup default ${{ matrix.toolchain }}
  - run: cargo test --verbose
```

The support claim lives in `rust-version` in `[package]` of `Cargo.toml`, the minimum supported Rust version. Note what it is and is not: it is a floor, not a range, so the matrix above tests the release channels while the floor needs its own check. Cargo's book documents that check as `cargo hack check --rust-version`, which needs `cargo-hack`, a third-party tool the maintainer vets before it enters a workflow. Where the project ships no `rust-version`, it makes no claim to cover and the channel matrix is the whole of it.

On GitLab, the same chapter uses `image: rust:latest` for the stable job and `image: rustlang/rust:nightly` with `allow_failure: true` for nightly, so a nightly regression reports without failing the pipeline.

Sources: [The Cargo Book, continuous integration](https://doc.rust-lang.org/cargo/guide/continuous-integration.html), [The Cargo Book, the rust-version field](https://doc.rust-lang.org/cargo/reference/rust-version.html), [rust-lang/docker-rust](https://github.com/rust-lang/docker-rust).

## Dependency caching (R-CI-04)

Cargo documents which parts of `CARGO_HOME` are safe to reuse across builds, and caching the whole directory is explicitly not it: `registry/src/` holds sources extracted from the `.crate` archives already in `registry/cache/`, so caching everything stores each dependency twice and pays the recompression and upload for it. The documented set is `.crates.toml`, `.crates2.json`, `bin/`, `registry/index/`, `registry/cache/`, and `git/db/`.

`target/` is build output rather than package-manager download data, so it is outside what this rule's caching guidance covers, and it is also the directory whose reuse most often produces a stale result.

Key on `Cargo.lock`. Cargo's FAQ says committing it is a per-package decision rather than a rule, and that a library's lockfile does not reach its consumers, who resolve from `Cargo.toml`. So a crate that commits no lockfile has nothing to key a cache on and gets no cache step; a workspace that commits one keys on it.

On both forges this is an explicit cache rather than a setup action's built-in one, because no first-party action exists to carry it. On GitLab set `CARGO_HOME` to a project-relative directory first, because GitLab caches only paths inside the project directory.

Sources: [The Cargo Book, caching the Cargo home in CI](https://doc.rust-lang.org/cargo/guide/cargo-home.html), [The Cargo Book, FAQ](https://doc.rust-lang.org/cargo/faq.html), [GitLab CI/CD YAML reference, cache](https://docs.gitlab.com/ci/yaml/#cachepaths).

## Test command (R-CI-06)

`cargo test` is the invocation, and the Cargo book's own CI examples use `cargo test --verbose` on both forges. Rust declares the suite by layout rather than in the manifest: unit tests live in `#[cfg(test)]` modules beside the code, integration tests in `tests/`, and documentation examples run as doc tests, and `cargo test` discovers all three without configuration. So the absence of a test entry in `Cargo.toml` says nothing; look for the directories and the attribute instead.

A workspace runs `cargo test --workspace`, and a crate with optional features needs the feature combinations it claims to support named on the command line, because the default run tests only the default features.

Sources: [The Cargo Book, continuous integration](https://doc.rust-lang.org/cargo/guide/continuous-integration.html).

Verified 2026-07-31 against https://doc.rust-lang.org/cargo/guide/continuous-integration.html, https://doc.rust-lang.org/cargo/guide/cargo-home.html, https://doc.rust-lang.org/cargo/reference/rust-version.html, https://doc.rust-lang.org/cargo/faq.html, and https://github.com/rust-lang/docker-rust.
