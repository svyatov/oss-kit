# npm

## Version sources (R-CHG-03)

`package.json`'s `version` field is the source. npm requires it to be parseable by node-semver, and states that the name and version together form an identifier assumed to be completely unique.

`npm version <newversion>` writes the new number into `package.json` and `package-lock.json`, so a committed lockfile is a second version source that drifts the moment someone edits the manifest by hand. It used to write `npm-shrinkwrap.json` too; npm 12 removed that file from the ecosystem, so a repository still carrying one has a third version source nothing updates. In a git repository the same command also makes a commit and a tag by default, under the `git-tag-version` config, so the tag being compared usually comes out of the release command rather than being typed separately.

A workspaces repository has one `package.json` per workspace. Each is its own release unit unless the project deliberately versions them together, so check each against its own tag and changelog rather than forcing one number across all of them.

## Version syntax (R-CHG-02)

node-semver is Semantic Versioning 2.0.0 as npm implements it, so a published npm version already has the syntax R-CHG-02 asks for. The registry's own constraint is only that the string parses; npm's guidance says it recommends publishing a new version following the specification, not that it enforces the semantics behind the number.

Two things sit beside the version and are not versions. A distribution tag is a named pointer the registry resolves for an install, so `latest` is a moving alias rather than a number, and `npm publish --tag next` ships a stable-looking version that no plain `npm install` selects. A `v` prefix belongs on the git tag only; `package.json` carries the bare number.

## Major version in package identity (R-CHG-07)

npm does not encode the major version in package identity. A package name is stable across majors and `foo@1` and `foo@2` are the same registry entry, so R-CHG-07 does not reach this ecosystem. A project that maintains two majors side by side does it by publishing a second package under a different name, which makes them two release units for R-CHG-03 rather than one identity to check.

## Withdrawing a release (R-CHG-01)

npm has two mechanisms and only one of them removes anything.

Unpublishing inside 72 hours of the publish has no conditions. After that window npm permits it only when no other package in the public registry depends on it, it had fewer than 300 downloads over the last week, and it has a single owner. The version string is spent either way: "Once `package@version` has been used, you can never use it again. You must publish a new version even if you unpublished the old one." Republishing the same package name is blocked for 24 hours after an unpublish.

Deprecation is what npm recommends where those criteria are not met, and it removes nothing. `npm deprecate <pkg>@"<range>" "<message>"` updates the registry entry so an install prints the message, and passing an empty string undoes it. The range form covers versions in bulk, including prereleases, so `npm deprecate my-thing@1.x "1.x is no longer supported"` also flags `1.0.0-beta.0`.

An unpublished version, and a deprecation whose message tells users to stop using that version, are both withdrawal for changelog purposes: mark that version's heading `[YANKED]` and leave the entry in place, which is what R-CHG-01 asks for. A reader who installed the version before it went is exactly who the record exists for. A deprecation that only points at a newer release is not a withdrawal, and belongs under `Deprecated` in the release that adds it.

Verified 2026-08-03 against [package.json](https://docs.npmjs.com/cli/v12/configuring-npm/package-json), [npm version](https://docs.npmjs.com/cli/v12/commands/npm-version), [About semantic versioning](https://docs.npmjs.com/about-semantic-versioning), [Unpublishing packages from the registry](https://docs.npmjs.com/unpublishing-packages-from-the-registry), [npm unpublish policy](https://docs.npmjs.com/policies/unpublish), and [npm deprecate](https://docs.npmjs.com/cli/v12/commands/npm-deprecate).
