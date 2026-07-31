# Hex

## Detection signals

Hex is present when a `mix.exs` or a `mix.lock` turns up anywhere in the checkout. Mix documents that "a Mix project is defined by calling `use Mix.Project` in a module, usually placed in `mix.exs`", exporting a `project/0` function that returns the project configuration, so the manifest is always that one file.

Hex is shipped when `project/0` returns a `:package` key and publish evidence exists: a release workflow running `mix hex.publish`, or an existing page on hex.pm for the package name, which defaults to the snake_case application name. Hex requires `:licenses` under `:package` and states plainly that "this attribute is required", so a `:package` block with no licenses is a half-configured publish rather than a publishing project.

Sources: [Publishing a package](https://hex.pm/docs/publish), [Mix.Project](https://mix.hexdocs.pm/Mix.Project.html).

Three cases decide most arguments:

- A `mix.exs` with no `:package` key is present and not shipped. Every Elixir application and every Phoenix service is this case, and they are far more common in the wild than published libraries.
- An umbrella project's root `mix.exs` usually carries no `:package`, and each application under `apps/` answers the shipped question for itself. Read the children before concluding the repository publishes nothing.
- A package published to a Hex organization is shipped, privately. Report it as shipped and name the organization, rather than reading a private scope as an absence. A `mix.lock` on its own is present and says nothing about publishing.

## Release track

Hex takes the registry-push track. `mix hex.publish` uploads a built tarball to hex.pm under an API key, so there is an upload to secure and a credential to scope, which is what assigns the track. The roster records `"track": "registry-push"` for Hex and the release area's preamble names Hex in its registry-push list.

Verified 2026-07-31 against https://hex.pm/docs/publish and https://mix.hexdocs.pm/Mix.Project.html.
