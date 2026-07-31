# Hex

## Version sources (R-CHG-03)

`mix.exs` is the source: the `:version` key in the project list returned by `project/0`. Hex reads it when publishing, so what the registry shows is whatever that key held at publish time.

An umbrella project has one `mix.exs` per application under `apps/`, each with its own `:version`. Those are separate release units unless the project versions them together, so compare each against the tag and the changelog section that names it. `mix.lock` records resolved dependencies and never the project's own version, so it is not a version source.

Where the project computes the version rather than writing a literal, for example by reading a file at the top of `mix.exs`, follow the expression to whatever it reads and treat that as the source.

## Version syntax (R-CHG-02)

Hex is the strictest SemVer on this roster, because the tooling rejects anything else. Elixir's `Version` module implements the SemVer 2.0 schema with `MAJOR.MINOR.PATCH` mandatory, and each numeric component limited to at most 14 digits. A two-part version does not parse: `Version.parse("2.0-alpha1")` returns `:error`.

The one place a component may be omitted is a requirement, not a version: the operand after `~>` may leave out the patch, which is what makes `~> 1.14` the idiomatic dependency constraint. So R-CHG-02's syntax half is enforced by the ecosystem here, and what remains to check is the bump decision behind the number.

## Major version in package identity (R-CHG-07)

Hex does not encode the major version in package identity. A package name is fixed at first publish and holds every version, so R-CHG-07 does not reach this ecosystem. Elixir projects that rename a module namespace across a major are changing source, which R-CHG-02 already covers as an incompatible change.

## Withdrawing a release (R-CHG-01)

Hex has two mechanisms separated by a hard one-hour boundary, re-verified upstream on 2026-07-31.

Inside one hour of the first publication, `mix hex.publish --revert VERSION` removes the release, and Hex documents that the package may be published again for up to one hour after first publication. That is the only removal Hex offers.

After that hour the version stays forever and the mechanism is retirement: `mix hex.retire PACKAGE VERSION REASON`, where the reason is one of renamed, deprecated, security, invalid, or other, each requiring a message that explains it. `mix hex.retire PACKAGE VERSION --unretire` reverses it. Retirement changes nothing about availability: "A retired package is still resolvable and usable but it will be flagged as retired in the repository and a message will be displayed to users when they use the package."

So a Hex withdrawal after the first hour is a label, not a removal, and the reason plus message is the whole of what a user sees. Write them to say what a reader of the changelog would need. `[YANKED]` on the changelog heading maps to a retirement, or to a revert inside the hour, and comes off again after an `--unretire`.

Verified 2026-07-31 against [Publishing a package](https://hex.pm/docs/publish), [mix hex.retire](https://hex.hexdocs.pm/Mix.Tasks.Hex.Retire.html), and [Elixir Version](https://elixir.hexdocs.pm/Version.html).
