# RubyGems

## Version sources (R-CHG-03)

The gemspec's `spec.version` is what the built gem carries. Most gems do not write a literal there. The layout `bundle gem` generates puts a `VERSION` constant in `lib/<gem_name>/version.rb` and has the gemspec read it, so the constant is the source and the gemspec is derived from it. Read the gemspec first, then follow it: a repository where the gemspec assigns a string directly has one source, and one where it references a constant has that file as the source and the gemspec as a pointer.

`Gemfile.lock` is not a version source for a published gem in the usual case, because a library is not expected to commit it. Where a repository does commit one and its `Gemfile` loads the gemspec, the resolved entry for the gem itself carries the number too, so it becomes a third place a release has to leave consistent.

## Version syntax (R-CHG-02)

RubyGems urges gem authors to follow Semantic Versioning, and a plain `MAJOR.MINOR.PATCH` gem version is both valid SemVer and a valid `Gem::Version`. The prerelease spelling is where the two part company. A gem version is a prerelease when it contains one or more letters anywhere in the string, and the convention separates the segments with dots rather than SemVer's hyphen, as in `1.0.0.pre`, `2.0.0.rc1`, and `1.5.0.beta.3`. Those versions install only with `gem install <gem> --pre`, so a prerelease that does not carry a letter is not treated as one and reaches everybody.

There is no build metadata concept, so a SemVer `+build` suffix has nowhere to go. Keep the released version free of letters and the syntax question does not arise; R-CHG-02 then turns entirely on the bump decision.

## Major version in package identity (R-CHG-07)

RubyGems does not encode the major version in package identity. A gem name is stable across majors, so R-CHG-07 does not reach this ecosystem. A project shipping an incompatible rewrite under a new gem name has created a second release unit, not a second identity for the same one.

## Withdrawing a release (R-CHG-01)

`gem yank GEM -v VERSION` is the mechanism. RubyGems documents that it removes the version from RubyGems.org's index, so the version stops being available to `gem install` and the other gem commands, and that since 2015-04-20 it also removes the gem file.

Two things follow. The guide warns that several hundred services are pinged when a gem is pushed, through the webhook and mirror system, so a credential pushed by accident has to be rotated even if the version is yanked immediately; a yank is not containment. And the guide does not say whether the same version number can be pushed again after a yank, or offer any deletion of a gem as a whole, so treat the number as spent and publish the fix under a new version rather than re-pushing.

`[YANKED]` on the changelog heading maps to a yank. The registry stops serving the version, which makes the changelog the only place a user who already installed it can find out why it went.

Verified 2026-07-31 against [Removing a published gem](https://guides.rubygems.org/removing-a-published-gem/), [Patterns](https://guides.rubygems.org/patterns/), and [Make your own gem](https://guides.rubygems.org/make-your-own-gem/).
