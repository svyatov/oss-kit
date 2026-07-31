# Go modules

## License declaration (R-COM-01)

`go.mod` has no license field. The module reference's file syntax section names ten directives, `module`, `go`, `toolchain`, `godebug`, `require`, `tool`, `ignore`, `exclude`, `replace`, and `retract`, and none of them carries package metadata of any kind. There is no author, no description, and no license, because a module is published by pushing a tag rather than by uploading a metadata document.

What stands in its place is file detection. pkg.go.dev runs `github.com/google/licensecheck` over files whose names it matches case-insensitively against a fixed list, `LICENSE`, `LICENCE`, `COPYING`, `UNLICENSE`, and their `.md`, `.markdown`, and `.txt` variants plus a handful of license-specific names such as `LICENSE-APACHE` and `MIT-LICENSE`. It recognizes a fixed set of licenses, all of them OSI-approved. So the license a Go consumer sees is read out of the file itself, not declared anywhere.

That collapses R-COM-01 to one side. There is no manifest value to compare the file against, so what remains is the file existing at the repository root and containing the full text of a license you can name. Read it rather than trusting its filename. A repository shipping a Go module alongside another ecosystem's manifest, a `package.json` that builds its documentation for instance, still has that manifest's declaration to compare, and the comparison is with the same file.

Source: [Go modules reference](https://go.dev/ref/mod) and [License policy](https://pkg.go.dev/license-policy).

## Funding platform name

Tidelift lists no platform for this ecosystem, so there is no `tidelift` value a Go module can write.

GitHub's own documentation for the funding file enumerates the accepted `tidelift` platform names. It names six, every one of them another ecosystem's registry; Go appears nowhere in it. That is why the roster at `skills/oss-audit/ecosystems.json` carries no `tidelift` key for this ecosystem.

Source: [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).

The strongest documented fallback is the rest of the same file. The `github`, `open_collective`, `liberapay`, and `custom` keys are forge-level rather than ecosystem-level, so they reach a Go project exactly as they reach any other. Nothing else is available on this side: `go.mod` has no funding directive any more than it has a license one, and the module proxy serves no project metadata a funding link could live in.

No rule in `STANDARD.md` requires a funding file at all, so this gap costs a repository nothing when it is scored. Tidelift adding a Go platform, and GitHub's funding documentation listing it, is what would retire it.

Verified 2026-07-31 against [Go modules reference](https://go.dev/ref/mod), [License policy](https://pkg.go.dev/license-policy), and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
