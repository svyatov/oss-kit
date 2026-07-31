# crates.io

## Automated dependency updates (R-SEC-03)

Dependabot's `cargo` value carries version updates and security updates, and private Cargo registries are supported, so a project pulling from a private registry still gets both. Vendored dependencies are not supported.

On GitLab the Renovate manager is `cargo`.

## Lockfile and frozen install (R-SEC-08)

Cargo writes `Cargo.lock` without being asked, and `cargo new` tracks it in version control by default. `cargo build --locked` asserts that the same dependencies and versions are used as when the lockfile was generated, and exits with an error when the lockfile is missing or when Cargo would have changed it. `--frozen` is documented as `--locked` plus `--offline`, so use `--locked` unless the job deliberately runs with no network.

Cargo's own FAQ is worth reading before reporting a library crate that does not commit the file. It says whether you track `Cargo.lock` "is dependent on the needs of your package", and it makes the sharper point that determinism here "can give a false sense of security because `Cargo.lock` does not affect the consumers of your package, only `Cargo.toml` does that". That is an argument about what a consumer resolves, not a direction to leave the file out, and Cargo's default is to track it, so a Rust repository is inside R-SEC-08 either way and a missing `Cargo.lock` is a finding rather than a convention.

## Static analysis (R-SEC-09)

CodeQL lists Rust among its supported languages, for the 2021 and 2024 editions, and its analysis needs `rustup` and `cargo` available; features from nightly toolchains are not supported. GitLab's SAST table does not list Rust among the languages its analyzers cover by default, and its guidance there is a custom ruleset, so on GitLab this is the project's own analyzer as a required check rather than a shipped one.

## Vulnerability watch (R-SEC-11)

The dependency graph parses `Cargo.lock` as its recommended file, with `Cargo.toml` as an additional file. The Cargo row marks static transitive dependencies, Dependabot graph jobs, and automatic dependency submission all unsupported.

Advisories come from the GitHub Advisory Database, which names this ecosystem Rust against the crates.io registry.

`osv-scanner` reads `Cargo.lock`, and when it scans a container image it also recovers Rust binaries built with `cargo-auditable`.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [cargo build](https://doc.rust-lang.org/cargo/commands/cargo-build.html), [Cargo FAQ](https://doc.rust-lang.org/cargo/faq.html), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
