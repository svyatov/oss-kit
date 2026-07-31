# RubyGems

## Version badge

Shields.io serves this one at `img.shields.io/gem/v/GEM`, taking the gem name as its only path parameter. `?include_prereleases` widens it to pre-release versions, which a README wants only while the stable line is the one nobody should install yet.

The default label is `gem`. Keep it.

Link the badge to the gem page:

```markdown
[![gem](https://img.shields.io/gem/v/GEM)](https://rubygems.org/gems/GEM)
```

## Install command

```bash
gem install GEM
```

That is what RubyGems documents, and it is the right line for a gem a reader installs on its own, which mostly means a command-line tool. A library that lands in an application's `Gemfile` shows Bundler's command instead:

```bash
bundle add GEM
```

Bundler documents that as adding the named gem to the `Gemfile` and running `bundle install`, so it is one line where the alternative is a line to paste into a file plus a second command to run. Show one of the two, chosen by how the gem is actually consumed, not both.

Verified 2026-07-31 against [RubyGems basics](https://guides.rubygems.org/rubygems-basics/), `lib/bundler/man/bundle-add.1.ronn` in [rubygems/rubygems](https://github.com/rubygems/rubygems), and `services/gem/gem-version.service.js` in [badges/shields](https://github.com/badges/shields).
