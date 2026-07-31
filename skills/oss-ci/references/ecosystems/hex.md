# Hex

## Toolchain and matrix (R-CI-03)

On GitHub Actions, `erlef/setup-beam` installs Erlang/OTP and optionally Elixir, Gleam, and `rebar3`. The matrix here is a pair rather than a single version, because an Elixir release supports a range of OTP releases and the combination is what breaks:

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - elixir: '1.17'
        otp: '26'
      - elixir: '1.18'
        otp: '27'
steps:
  - uses: erlef/setup-beam@v1
    with:
      otp-version: ${{ matrix.otp }}
      elixir-version: ${{ matrix.elixir }}
```

The support claim lives in the `:elixir` key of the project list in `mix.exs`, a version requirement such as `"~> 1.14"`. Quote every version as a YAML string, which the README asks for explicitly: `23.0` unquoted parses as the number 23, which is a different OTP release. Set `version-type: strict` with exact versions where the OTP version scheme matters, since the default is loose semver resolution.

Two constraints bound the matrix from outside the manifest. The README carries a table of which OTP releases work on which runner images, and a self-hosted runner has to set the `ImageOS` environment variable itself, because the action uses it to pick the assets to download.

On GitLab, run the job in the Elixir official image, whose tags carry both versions, and vary the tag with `parallel:matrix`.

Sources: [erlef/setup-beam](https://github.com/erlef/setup-beam), [Mix.Project](https://mix.hexdocs.pm/Mix.Project.html), [erlef/docker-elixir](https://github.com/erlef/docker-elixir).

## Dependency caching (R-CI-04)

Hex documents no cache directory to reuse, and `erlef/setup-beam` has no cache input. The action's README describes installing OTP, Elixir, Gleam, `rebar3`, and `local.hex`, with version resolution, problem matchers, and platform support, and no caching of anything. Hex's own FAQ and the `mix hex` task documentation cover configuration, publishing, and ownership, and name no local cache path and no `HEX_HOME`.

Source: [erlef/setup-beam](https://github.com/erlef/setup-beam), [Hex FAQ](https://hex.pm/docs/faq), [mix hex](https://hex.hexdocs.pm/Mix.Tasks.Hex.html).

The strongest documented fallback is an explicit cache over the two directories Mix does document, keyed on the lockfile Mix names: `:deps_path` defaults to `deps`, `:build_path` defaults to `_build`, and `:lockfile` defaults to `mix.lock`. Both are inside the project directory, so this shape works unchanged on GitLab.

```yaml
- uses: actions/cache@v4
  with:
    path: |
      deps
      _build
    key: ${{ runner.os }}-otp${{ matrix.otp }}-elixir${{ matrix.elixir }}-${{ hashFiles('mix.lock') }}
```

Both directories hold fetched sources and compiled BEAM files rather than package-manager download data, so this sits below the bar R-CI-04 sets and needs the OTP and Elixir versions in the key, since compiled artifacts are not portable across them. Hex documenting a download cache path, or `setup-beam` gaining a cache input keyed on `mix.lock`, would retire the gap.

Sources: [Mix.Project](https://mix.hexdocs.pm/Mix.Project.html), [GitLab CI/CD YAML reference, cache](https://docs.gitlab.com/ci/yaml/#cachepaths).

## Test command (R-CI-06)

`mix test` starts the application, loads `test/test_helper.exs`, and requires every file matching `test/**/*_test.exs` in parallel. `test_paths` defaults to `["test"]` when that directory exists and to an empty list when it does not, so a project with no `test/` directory runs nothing and reports success.

The command is declared by the layout rather than by a line in `mix.exs`, so read for the directory and the `_test.exs` files. A project that has moved its tests declares `test_paths` in the project list, and a project with an alias, such as an `aliases` entry mapping `test` to a setup step plus `test`, has already written the command CI should call.

Sources: [mix test](https://mix.hexdocs.pm/Mix.Tasks.Test.html).

Verified 2026-07-31 against https://github.com/erlef/setup-beam, https://mix.hexdocs.pm/Mix.Project.html, https://mix.hexdocs.pm/Mix.Tasks.Test.html, https://hex.pm/docs/faq, https://hex.hexdocs.pm/Mix.Tasks.Hex.html, https://github.com/erlef/docker-elixir, and https://docs.gitlab.com/ci/yaml/.
