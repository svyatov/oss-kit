# npm

## License declaration (R-COM-01)

`package.json` declares the license in a single `license` string holding an SPDX license expression. npm's field reference gives `"license": "BSD-3-Clause"` for one identifier and `"(ISC OR GPL-3.0)"` for a choice between two. The older forms, a `license` object and a `licenses` array, are deprecated; `npm pkg fix` rewrites them.

Two values name no license at all, and each changes what there is to compare. `"SEE LICENSE IN <filename>"` points at a file the package ships at its top level, so it is the next thing to read rather than the answer. `"UNLICENSED"` marks proprietary work, which is a package granting nobody a license rather than a package whose license is unstated.

The manifest side of R-COM-01 is therefore the `license` string of every `package.json` the repository publishes from, and the file side is the root license file. A workspace has one value per member manifest, so several comparisons rather than one. A manifest carrying `"private": true` and no `license` key declares nothing, which leaves that manifest out of the comparison without leaving the repository out of the rule.

Source: [package.json fields](https://docs.npmjs.com/cli/v11/configuring-npm/package-json).

## Funding platform name

Tidelift's platform name for this ecosystem is `npm`, so the GitHub funding file's entry reads `tidelift: npm/<package-name>` against the name the package publishes under. The accepted key format is `PLATFORM-NAME/PACKAGE-NAME`, described in `github.md` beside the rest of the accepted keys.

The roster at `skills/oss-audit/ecosystems.json` records `"tidelift": "npm"` and is the canonical copy. This line exists because a single-skill install of `oss-community` does not carry that file; where the two disagree, the roster is right and this line is corrected to it.

Verified 2026-07-31 against [package.json fields](https://docs.npmjs.com/cli/v11/configuring-npm/package-json) and [Displaying a sponsor button in your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).
