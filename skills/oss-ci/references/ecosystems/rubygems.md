# RubyGems

## Toolchain and matrix (R-CI-03)

On GitHub Actions, `ruby/setup-ruby` downloads a prebuilt Ruby and puts it on the PATH. Drive the matrix from `required_ruby_version` in the gemspec, which is where a gem declares the Ruby versions it supports. The `ruby-version` input also accepts engine names, so a gem that claims JRuby or TruffleRuby support adds `jruby` and `truffleruby` as matrix entries rather than another MRI version.

```yaml
strategy:
  fail-fast: false
  matrix:
    ruby: ['3.3', '3.4', '4.0', jruby, truffleruby]
steps:
  - uses: ruby/setup-ruby@v1
    with:
      ruby-version: ${{ matrix.ruby }}
      bundler-cache: true
```

Upstream tells readers to use `ruby/setup-ruby@v1` and not to pin further: pinning to a commit freezes the set of Ruby versions the action can install to whatever existed at that commit, so a new Ruby release needs a bump before it can be tested. That collides with R-SEC-01, which `oss-harden` owns, so raise the conflict there rather than resolving it here. With no `ruby-version` input the action reads `.ruby-version`, then `.tool-versions`, then `mise.toml`, which pins one version instead of a matrix.

The action supports a fixed list of runner images, and the README carries the table. Check it before adding an operating system to the matrix.

On GitLab, run the job in the Ruby official image and vary the tag with `parallel:matrix`.

Sources: [ruby/setup-ruby](https://github.com/ruby/setup-ruby), [Gemspec reference](https://guides.rubygems.org/specification-reference/), [docker-library/ruby](https://github.com/docker-library/ruby).

## Dependency caching (R-CI-04)

`bundler-cache: true` runs `bundle install` and caches the result. It needs a `Gemfile`, or `$BUNDLE_GEMFILE` or `gems.rb`, under the working directory, and it uses `bundle config --local path $PWD/vendor/bundle`, so the cached directory holds installed gems rather than a download cache. That is the action's documented design rather than a mistake to correct: because it owns the install, it can key the cache on the lockfile hash and rebuild from it. Do not set `bundle config path` yourself in the workflow, which moves the directory out from under the cache.

The key comes from the lockfile hash. Where the repository commits no `Gemfile.lock`, which is the normal case for a gem, the action generates one with `bundle lock` first and hashes that, so the key still tracks a resolved dependency set rather than a range. A committed `Gemfile.lock` additionally turns on `bundle config --local deployment true`. `cache-version` is the documented escape hatch for a cache that has gone bad, for instance a gem with a C extension built against a system library that has since changed.

On GitLab there is no equivalent. Set `BUNDLE_PATH` to a project-relative directory, key `cache:key:files` on `Gemfile.lock`, and cache that directory, because GitLab caches only paths inside the project directory.

Sources: [ruby/setup-ruby](https://github.com/ruby/setup-ruby), [GitLab CI/CD YAML reference, cache](https://docs.gitlab.com/ci/yaml/#cachepaths).

## Test command (R-CI-06)

A gem declares its test task in the `Rakefile`, and the conventional entry point is `bundle exec rake`, which runs the default task; setup-ruby's own examples end on that line. Where the Rakefile defines the suite under a named task, `bundle exec rake test`, or where the project drives RSpec directly, `bundle exec rspec`, call the project's task rather than the runner, so the Rakefile stays the one place the arguments live.

`bundle exec` is the part that matters for reproducibility: it runs the binary Bundler resolved for this `Gemfile.lock` rather than whatever version of the gem is on the PATH.

Sources: [ruby/setup-ruby](https://github.com/ruby/setup-ruby).

Verified 2026-07-31 against https://github.com/ruby/setup-ruby, https://guides.rubygems.org/specification-reference/, https://github.com/docker-library/ruby, and https://docs.gitlab.com/ci/yaml/.
