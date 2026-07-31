# pub.dev

## Toolchain and matrix (R-CI-03)

On GitHub Actions, `dart-lang/setup-dart` downloads a Dart SDK and adds `dart` to the PATH. Its `sdk` input takes a release channel, `stable`, `beta`, `dev`, or `main`, an SDK release version such as `3.1`, or an exact version, so a matrix mixes pinned versions with channels:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    sdk: ['3.1', stable, beta]
steps:
  - uses: dart-lang/setup-dart@v1  # oss-harden pins this to a commit SHA
    with:
      sdk: ${{ matrix.sdk }}
```

The support claim lives in the `environment` field of `pubspec.yaml`, the `sdk` constraint, and it is not optional: Dart documents that omitting it is an error and `dart pub get` fails. So every package here makes a claim the matrix can be built from, which is not true of every ecosystem in this directory.

On GitLab, run the job in the Dart image and vary the tag with `parallel:matrix`.

Sources: [dart-lang/setup-dart](https://github.com/dart-lang/setup-dart), [The pubspec file](https://dart.dev/tools/pub/pubspec), [dart-lang/dart-docker](https://github.com/dart-lang/dart-docker).

## Dependency caching (R-CI-04)

`dart-lang/setup-dart` has no cache input. Its README documents three inputs, `sdk`, `flavor`, and `architecture`, one output, `dart-version`, and nothing about dependencies; its own example runs `dart pub get` as an ordinary step.

Source: [dart-lang/setup-dart](https://github.com/dart-lang/setup-dart).

The strongest documented fallback is an explicit cache over the pub system cache, which Dart does document: `$HOME/.pub-cache` on macOS and Linux, `%LOCALAPPDATA%\Pub\Cache` on Windows, and relocatable through `PUB_CACHE`. That is genuine download data, so the directory is not the problem. The key is.

Dart documents that an application package checks `pubspec.lock` into source control and a regular package, its word for a library, does not, because a library is expected to work across a range of dependency versions. A library therefore commits no lockfile, and a cache keyed on `pubspec.yaml` instead survives every resolution change the manifest's ranges permit, which is what R-CI-04 is about. An application package that commits its lockfile has no gap: key on `pubspec.lock`. For a library, the honest options are to key on `pubspec.yaml` and accept that it caches across resolutions, or to run without a cache. Dart changing the library convention, or `setup-dart` gaining a keyed cache, would retire it.

On GitLab set `PUB_CACHE` to a project-relative directory first, because GitLab caches only paths inside the project directory.

Sources: [Pub environment variables](https://dart.dev/tools/pub/environment-variables), [Package layout conventions](https://dart.dev/tools/pub/package-layout), [GitLab CI/CD YAML reference, cache](https://docs.gitlab.com/ci/yaml/#cachepaths).

## Test command (R-CI-06)

`dart test` runs the tests, which live under the `test` directory of the package and depend on the `test` package being a dev dependency in `pubspec.yaml`. That dev dependency is the observable declaration: a package with no `test` entry under `dev_dependencies` has no suite `dart test` can run, whatever the directory holds.

setup-dart's own README shows the full check sequence a Dart package runs, `dart pub get`, `dart format --output=none --set-exit-if-changed .`, `dart analyze`, then `dart test`, which is the order to keep in CI so the fast checks fail first.

Sources: [dart test](https://dart.dev/tools/dart-test), [dart-lang/setup-dart](https://github.com/dart-lang/setup-dart).

Verified 2026-07-31 against https://github.com/dart-lang/setup-dart, https://dart.dev/tools/pub/pubspec, https://dart.dev/tools/pub/environment-variables, https://dart.dev/tools/dart-test, https://github.com/dart-lang/dart-docker, and https://docs.gitlab.com/ci/yaml/.
