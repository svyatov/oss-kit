# Go modules

## Version sources (R-CHG-03)

No file in a Go repository states the release version. `go.mod` carries a `module` directive defining the module path and a `go` directive setting the minimum Go version the module was written for; neither is the release number. The tag is the version, and `go.sum` records dependency hashes rather than anything about this module.

So the comparison reduces to the tag and the changelog, plus one manifest fact that has to move with a major: the `/vN` suffix on the `module` line, covered in the next section but one.

A repository holding several modules tags each one with its subdirectory as a prefix. The reference gives `golang.org/x/tools/gopls`, which lives in the `gopls` subdirectory of the repository rooted at `golang.org/x/tools`, and states that the module subdirectory also serves as a prefix for semantic version tags, so that module's tags read `gopls/vX.Y.Z`. Each such module is its own release unit with its own tag prefix and, in most repositories, its own changelog section.

## Version syntax (R-CHG-02)

A canonical Go version starts with the letter `v` followed by a semantic version: three non-negative integers separated by dots, an optional pre-release string after a hyphen, and an optional build metadata string after a plus. `v0.0.0`, `v1.12.134`, `v8.0.5-pre`, and `v2.0.9+meta` are all valid. The `v` is not optional here, which is the reverse of every other ecosystem on this roster, and it is the case R-CHG-02's tag-name allowance exists for.

Build metadata is ignored for comparison, and the `go` command converts a version carrying it into a pseudo-version to keep the ordering total. Two suffixes are special and are not build metadata in that sense: `+incompatible`, which the `go` command adds to a version at major 2 or higher published without a `go.mod` file, and `+dirty`. `+incompatible` should never appear on a tag; it appears only in versions the `go` command computes.

A pseudo-version is what a consumer gets for an untagged revision, built from a base version prefix, a UTC timestamp `yyyymmddhhmmss`, and a twelve-character commit hash prefix. It takes one of three forms, `vX.0.0-yyyymmddhhmmss-abcdefabcdef` with no known base version, `vX.Y.Z-pre.0.yyyymmddhhmmss-abcdefabcdef` after a pre-release, and `vX.Y.(Z+1)-0.yyyymmddhhmmss-abcdefabcdef` after a release. None of those is something a maintainer writes, and seeing one in a consumer's `go.mod` means the module was never tagged at that point rather than that somebody chose an odd version.

## Major version in package identity (R-CHG-07)

Go is the one ecosystem on this roster that does encode the major version in package identity, and it is the case R-CHG-07 exists for. The reference states it directly: "If the module is released at major version 2 or higher, the module path must end with a major version suffix like `/v2`", and "Major version suffixes are not allowed at major versions `v0` or `v1`". A module at `example.com/mod` on `v1.0.0` must be `example.com/mod/v2` at `v2.0.0`. The suffix must not have a leading zero, must not be `/v1`, and must not contain a dot.

Releasing a new major is therefore a source change, not just a tag. The `module` line changes, every import path inside the module that names the module path changes with it, and the tag follows. A repository tagged `v2.0.0` whose `go.mod` still names the v1 path has published something no consumer of v2 can import, which is why R-CHG-03's agreement on one number does not catch this.

`gopkg.in` paths are the exception in the other direction: they always carry a suffix, at every major including v0 and v1, and separate it with a dot rather than a slash, as in `gopkg.in/yaml.v2`.

## Withdrawing a release (R-CHG-01)

Deleting the tag does not withdraw anything. The checksum database ensures the bits for a version do not change from one day to the next even if the author later alters the tags, and the reference is explicit that "this bad release may still be available in the mirror even if it is not available at the origin. The same situation applies if you delete your entire repository." Withdrawal here is an act of publishing rather than an act of removal.

The mechanism is the `retract` directive. Add it to `go.mod` and publish a new version containing it, higher than every other release and pre-release of the module, since a consumer only learns of a retraction from a version they can see. Retracted versions stay available so existing builds keep working, are excluded from `@latest` and from range queries, are hidden from `go list -m -versions` unless `-retracted` is passed, and are reported to users who run `go list -m -u` or update a related module. A version that contains retractions may retract itself, and where the highest version does that, `@latest` resolves to a lower one.

That gives the changelog two entries rather than one. Mark the withdrawn version's heading `[YANKED]` and keep it, and give the retracting version its own entry saying which versions it retracts and why, because that version is a real release users will see.

Verified 2026-07-31 against [Go modules reference](https://go.dev/ref/mod) and [Publishing a module](https://go.dev/doc/modules/publishing).
