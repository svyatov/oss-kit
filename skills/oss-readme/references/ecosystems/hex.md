# Hex

## Version badge

Shields.io serves this one at `img.shields.io/hexpm/v/PACKAGE`, taking the package name as its only path parameter. It reports the package's latest stable version and falls back to the latest version when there is no stable one, so a package that has only ever published a release candidate still gets a badge rather than an error.

The default label is `hex`. Keep it.

Link the badge to the package page:

```markdown
[![hex](https://img.shields.io/hexpm/v/PACKAGE)](https://hex.pm/packages/PACKAGE)
```

## Install command

There is no install command. A Hex package is declared in the `deps` list of `mix.exs` and fetched by a command that takes no package name, so a README shows the entry and then the fetch:

```elixir
defp deps do
  [
    {:package, "~> 1.0"}
  ]
end
```

```bash
mix deps.get
```

Hex documents the dependency form as `{:package, requirement}` and `mix deps.get` as fetching whatever is not already fetched. Write the requirement against the version actually published, because the `~>` operator is what decides how much of the next release a reader gets. Elixir's `Version` documentation reads `~> 2.0` as `>= 2.0.0 and < 3.0.0` and `~> 2.0.0` as `>= 2.0.0 and < 2.1.0`, so one extra digit in a README snippet is the difference between a reader tracking a major line and a reader pinned to a patch line.

Keep the atom and the package name identical. Hex documents the `:hex` option as the package name, defaulting to the dependency's application name, so a package whose Hex name differs from the atom needs that option in the snippet and a README that shows the atom alone documents a dependency that does not resolve.

Verified 2026-07-31 against [Hex usage](https://hex.pm/docs/usage), [Elixir Version](https://elixir.hexdocs.pm/Version.html), and `services/hexpm/hexpm.service.js` in [badges/shields](https://github.com/badges/shields).
