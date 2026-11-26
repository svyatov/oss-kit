# crates.io

## Toolchain and matrix (R-CI-03)

Use the project toolchain for a single-version Rust build. Without a selected toolchain, use stable. GitHub-hosted runners include `rustup`:

```yaml
steps:
  - uses: actions/checkout@v7  # oss-harden pins this to a commit SHA
  - run: cargo test --verbose
```

`rust-version` in `Cargo.toml` declares the minimum supported Rust version. Check that version separately when declared. Cargo documents `cargo hack check --rust-version` for this check. Vet `cargo-hack` before adding it.

Add beta or nightly jobs only when requested. On GitLab, use a Rust image matching the selected toolchain. Use `rust:latest` for stable. For an optional nightly check, use `rustlang/rust:nightly` with `allow_failure: true`.

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
