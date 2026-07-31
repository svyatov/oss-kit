# pub.dev

## Version sources (R-CHG-03)

`pubspec.yaml`'s `version` field is the source, and it is the only file in a published package that states one.

`pubspec.lock` is not a second source. Dart documents that an application package should check the lockfile into source control and a regular package, which is Dart's word for a library, should not, because a library is expected to work with a range of dependency versions. A published library therefore has the pubspec, the tag, and the changelog to compare, and an application repository that also publishes has the lockfile as one more file to keep current.

A monorepo with several packages has one `pubspec.yaml` each, and each is its own release unit.

## Version syntax (R-CHG-02)

Pub requires semantic versioning: "Pub requires versions to be formatted that way, and to play well with the pub community, your package should follow the semantics it specifies." Two Dart conventions sit on top of that.

Before 1.0.0 the Dart community shifts the interpretation down one slot, so `0.1.2` to `0.2.0` is a breaking change, `0.1.2` to `0.1.3` is a new feature, and `0.1.2` to `0.1.2+1` is a change that does not affect the public API. The first of those agrees with what R-CHG-02 asks for during initial development, so a Dart package following its own community convention lands on the same bump.

The `+` suffix is the deviation to watch. It is SemVer build metadata, and Dart uses it as a real release channel before 1.0.0 while noting that suffixes such as `-0` or `-beta` do not affect dependency resolution, and recommends avoiding `+` once the package reaches 1.0.0. A `+1` release still needs a changelog entry and a tag, so it is a release for R-CHG-03 whatever the resolver does with it.

## Major version in package identity (R-CHG-07)

pub.dev does not encode the major version in package identity. A package name is claimed once and holds every version, so R-CHG-07 does not reach this ecosystem.

## Withdrawing a release (R-CHG-01)

Retraction is the mechanism and it is time-boxed at both ends. A published version can be retracted within seven days of publication, and a retracted version can be restored within seven days of the retraction. Both windows are short enough that a maintainer who finds the problem in week two has no retraction to make.

Retraction does not remove anything: "Retraction isn't deletion." A retracted version stays visible on pub.dev under a Retracted versions section with a RETRACTED badge, a project whose `pubspec.lock` already names the version keeps resolving it, and a developer who wants to depend on a retracted version has to pin it in `dependency_overrides` in `pubspec.yaml`. pub.dev documents no deletion at all.

Past the seven-day window the response is the same as on any registry with no withdrawal: publish a fixed version and say so. `[YANKED]` on the changelog heading maps to a retraction, and after the window it is the only record of the withdrawal that exists, which is what makes leaving the entry in place matter.

Verified 2026-07-31 against [Publishing packages](https://dart.dev/tools/pub/publishing), [Package versioning](https://dart.dev/tools/pub/versioning), and [Pub glossary](https://dart.dev/tools/pub/glossary).
