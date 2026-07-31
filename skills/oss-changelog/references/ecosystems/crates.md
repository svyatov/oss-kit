# crates.io

## Version sources (R-CHG-03)

`Cargo.toml`'s `[package] version` is the source for a single crate. In a workspace the number usually lives once, in the root manifest's `[workspace.package]` table, with each member writing `version.workspace = true` to inherit it; there the root is the source and a member manifest states nothing to compare.

`Cargo.lock` sits in the workspace root and is shared by every member, so a repository that commits it, which an application does and a library usually does not, has one more file that moves when a version does.

A workspace whose members set their own versions has several release units. Check each member against its own tag and its own changelog rather than expecting one number across the repository.

## Version syntax (R-CHG-02)

Cargo versions are SemVer, and the deviation is in what counts as compatible rather than in how the string is spelled. Cargo uses the convention that only changes in the left-most non-zero component are incompatible, and its own guide states the consequence for initial development: releases starting `0.y.z` treat a change in `y` as a major release and a change in `z` as a minor one, and every `0.0.z` release is a major change.

That is the same shape R-CHG-02 already applies before 1.0.0, so a crate following Cargo's convention and a crate following this standard reach the same bump. What Cargo adds is that the resolver enforces it: a caret requirement written against a `0.1` crate will not select `0.2`, so an incompatible change shipped as `0.1.x` reaches users who asked not to receive one.

## Major version in package identity (R-CHG-07)

crates.io does not encode the major version in package identity. A crate name is stable across majors and a single crate holds every version of it, so R-CHG-07 does not reach this ecosystem. What carries the major instead is the requirement a consumer writes, which is why the compatibility convention above is the thing to get right.

## Withdrawing a release (R-CHG-01)

`cargo yank --version <version>` removes the version from the registry's index. Cargo states plainly what that does not do: "This command does not delete any data, and the crate will still be available for download via the registry's download link", and "Existing lock files or direct downloads are not affected". What changes is selection, because Cargo will not use a yanked version for any new project or checkout without a pre-existing lockfile. `cargo yank --undo` puts the version back into the index.

Two consequences worth stating to a maintainer. Yanking is not a recall: bytes already fetched stay fetched, and the guide says yanking cannot stop further spreading. And crates.io offers no deletion, so the version number stays taken and the fix ships as a new version.

`[YANKED]` on the changelog heading maps to a yank, and comes off again if the yank is undone.

Verified 2026-07-31 against [cargo yank](https://doc.rust-lang.org/cargo/commands/cargo-yank.html), [SemVer compatibility](https://doc.rust-lang.org/cargo/reference/semver.html), and [Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html).
