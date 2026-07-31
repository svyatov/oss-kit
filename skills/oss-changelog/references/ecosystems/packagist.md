# Packagist

## Version sources (R-CHG-03)

The tag is the version, and `composer.json` should not carry one. Packagist states that "New versions of your package are automatically fetched from tags you create in your VCS repository", and Composer's schema says of the `version` field that "In most cases this is not required and should be omitted", that it is optional where the repository can infer the version from the tag name, and that stating it yourself "will most likely end up creating problems at some point due to human error".

So a well-formed PHP library has two things to compare, the tag and the changelog. A repository that does state `version` in `composer.json` has a third, and the fix is to delete the field rather than to keep it in step. `composer.lock` belongs to an application and records resolved dependencies, so it is not a version source for a published library.

## Version syntax (R-CHG-02)

Composer accepts `X.Y.Z` or `vX.Y.Z` and strips the `v` prefix from the tag name to get the version number, so `v1.1` and `1.1` are one version and either tag form works. Stability comes from the suffix, across five levels from least to most stable: dev, alpha, beta, RC, and stable. The schema's own examples include `1.0.0-alpha3` and `v2.0.4-p1`, and the uppercase `RC` and the `-p1` patch suffix are both idiomatic here and outside what SemVer spells that way.

Branches are versions too, which is the deviation most likely to confuse a reader. Composer adds a `-dev` suffix to numeric branches and prefixes every other branch imported from a VCS with `dev-`, so a project has resolvable versions it never tagged. Those are not releases and get no changelog entry.

## Major version in package identity (R-CHG-07)

Packagist does not encode the major version in package identity. The `vendor/project` name is fixed at submission and is stable across majors, so R-CHG-07 does not reach this ecosystem. A PHP project that versions its namespace instead is changing source, which R-CHG-02 already governs as an incompatible change to the public API.

## Withdrawing a release (R-CHG-01)

Packagist documents no withdrawal. Its about page covers submitting a package, how versions are fetched from tags, how the crawl is scheduled, and how to force an update, and says nothing about deleting a package or removing a published version. Composer's schema documents no per-version state either.

Source: [Packagist about](https://packagist.org/about) and [Composer schema](https://getcomposer.org/doc/04-schema.md).

The strongest documented fallback has two parts, and neither is a yank. Because the version comes from the tag, deleting the tag in the repository removes that version from Packagist at the next crawl, which is every push where a hook is installed and weekly where one is not, so the removal is neither immediate nor observable at the moment it is made. And where the package as a whole is going away, Composer's `abandoned` property, either `true` or the name of a recommended replacement, makes Composer warn every user who installs it. That property is package-level, so it cannot say that one version was bad.

This sits below what R-CHG-01 expects a `[YANKED]` heading to correspond to, because nothing in the registry records the withdrawal for a consumer's tooling to read, which leaves the changelog as the only place the fact exists. Mark the heading `[YANKED]`, say what replaced the version, and delete the tag. A per-version withdrawal state documented by Packagist, of the kind crates.io and PyPI already have, would retire the gap.

Verified 2026-07-31 against [Packagist about](https://packagist.org/about), [Composer schema](https://getcomposer.org/doc/04-schema.md), and [Composer versions and constraints](https://getcomposer.org/doc/articles/versions.md).
