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

Packagist has no documented per-version withdrawal state. Preserve the released tag and its contents under R-SEC-13. For package-wide retirement, Composer's `abandoned` property can warn consumers and name a replacement. That property cannot withdraw one version.

Mark the changelog heading `[YANKED]` and state the replacement and the registry limitation. This is a project warning, not a registry-enforced withdrawal. Do not delete or move the tag, or weaken tag protection. A documented per-version withdrawal mechanism would close this gap.

Verified 2026-07-31 against [Packagist about](https://packagist.org/about), [Composer schema](https://getcomposer.org/doc/04-schema.md), and [Composer versions and constraints](https://getcomposer.org/doc/articles/versions.md).
