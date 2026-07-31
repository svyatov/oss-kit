# pub.dev

## Detection signals

pub.dev is present when a `pubspec.yaml` or a `pubspec.lock` turns up anywhere in the checkout. Dart requires `name` in every pubspec, published or not, so the manifest's identity field settles nothing about publishing on its own.

pub.dev is shipped when the pubspec carries the fields Dart requires only of published packages and publish evidence exists: a release workflow running `dart pub publish` or `flutter pub publish`, or an existing page on pub.dev for that name. Dart documents `version` and `description` as mandatory "only when you intend to publish your package to the pub.dev site", which makes their presence a useful signal and their absence a decisive one.

Sources: [Pubspec format](https://dart.dev/tools/pub/pubspec), [Publishing packages](https://dart.dev/tools/pub/publishing).

Three cases decide most arguments:

- `publish_to: none` settles the shipped answer. Dart's own words: "Specify `none` to prevent a package from being published." Almost every Flutter application carries it, which is why a repository full of Dart code often ships nothing through pub.dev.
- `publish_to` naming a custom server means the package ships somewhere else. Report it as shipped and name the server, rather than reading a redirect as an absence.
- A `pubspec.lock` decides nothing in either direction, because Dart tells a library package not to commit it and an application to commit it. Its absence from a library is the documented convention rather than a gap. An `example/pubspec.yaml` inside a published package is present and is not separately shipped.

## Release track

pub.dev takes the registry-push track. `dart pub publish` uploads a built archive to pub.dev under an authenticated account, so there is an upload to secure and a credential to scope, which is what assigns the track. The roster records `"track": "registry-push"` for pub.dev and the release area's preamble names pub.dev in its registry-push list.

Verified 2026-07-31 against https://dart.dev/tools/pub/pubspec and https://dart.dev/tools/pub/publishing.
