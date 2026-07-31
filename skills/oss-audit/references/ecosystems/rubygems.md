# RubyGems

## Detection signals

RubyGems is present when a `*.gemspec`, a `Gemfile`, or a `Gemfile.lock` turns up anywhere in the checkout. The three are not interchangeable. A `Gemfile` lists what an application installs; a gemspec declares a package. RubyGems describes the gemspec as the file holding "the information for a gem", and requires `name`, `version`, `authors`, `summary`, and `files` in it.

RubyGems is shipped when a gemspec declares those fields and publish evidence exists: a release workflow running `gem push`, or an existing page on rubygems.org for that name.

Sources: [Specification reference](https://guides.rubygems.org/specification-reference/), [Publishing your gem](https://guides.rubygems.org/publishing/).

Three cases decide most arguments:

- `spec.metadata['allowed_push_host']` set to anything other than rubygems.org means the gem ships to a private host. RubyGems documents it as the way "to prevent accidental pushes to rubygems.org". Report the gem as shipped and name the host, rather than reading a restriction as an absence.
- A `Gemfile` with no gemspec beside it is present and not shipped. A repository that runs Jekyll for its docs, or Rake for its tests, is this case in full: it resolves gems and publishes none.
- A `Gemfile.lock` alone is present. So is a gemspec inside a fixture or an example directory, which is present and answers the shipped question for itself rather than for the repository.

## Release track

RubyGems takes the registry-push track. `gem push` uploads a built `.gem` file to the registry under a credential, so there is an upload to secure and a credential to scope, which is what assigns the track. The roster records `"track": "registry-push"` for RubyGems and the release area's preamble names RubyGems in its registry-push list.

Verified 2026-07-31 against https://guides.rubygems.org/specification-reference/ and https://guides.rubygems.org/publishing/.
