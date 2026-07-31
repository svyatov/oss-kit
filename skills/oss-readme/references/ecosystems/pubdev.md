# pub.dev

## Version badge

Shields.io serves this one at `img.shields.io/pub/v/PACKAGE`, taking the package name as its only path parameter. `?include_prereleases` widens it past stable releases.

The default label is `pub`. Keep it: `pub` is what the ecosystem calls its registry and its tool, and relabelling it `dart` or `flutter` claims a scope the badge does not check, since one package can serve both.

Link the badge to the package page:

```markdown
[![pub](https://img.shields.io/pub/v/PACKAGE)](https://pub.dev/packages/PACKAGE)
```

Shields.io also serves `pub/points`, `pub/likes`, and `pub/publisher` for the same package. The pub points score is tempting because pub.dev computes it, and it still fails the live-fact test in `badges.md`: it measures the package against the registry's own conventions rather than telling a reader whether the package works, and it is not the version, the build, or the coverage that the three slots are for.

## Install command

```bash
dart pub add PACKAGE
```

Dart documents that as adding the latest stable version compatible with the project's SDK constraints, which means the README does not have to state a version at all and the command cannot suggest one the reader's SDK rejects.

A package meant for Flutter shows `flutter pub add PACKAGE`, the same subcommand under the Flutter tool. Choose by what the package depends on rather than by preference: a package that imports `package:flutter` cannot be added to a plain Dart project, and showing the Dart form for it sends the reader into a resolution error.

Verified 2026-07-31 against [dart pub add](https://dart.dev/tools/pub/cmd/pub-add), [Using packages](https://docs.flutter.dev/packages-and-plugins/using-packages), [Pub Version badge](https://shields.io/badges/pub-version), and `services/pub/pub.service.js` in [badges/shields](https://github.com/badges/shields).
