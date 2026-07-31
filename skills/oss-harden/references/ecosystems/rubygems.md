# RubyGems

## Automated dependency updates (R-SEC-03)

Dependabot's `bundler` value carries version updates and security updates, and it is one of the few ecosystems where the table also marks vendoring supported, so a project that checks its gems into `vendor/cache` still gets updates.

On GitLab the Renovate manager is `bundler`.

## Lockfile and frozen install (R-SEC-08)

Bundler writes `Gemfile.lock` without being asked, and the frozen mode is configuration rather than a command flag. `bundle config set --local frozen true` sets it in `.bundle/config` inside the repository, where the workflow file and a reviewer can both see it. Bundler documents `frozen` as "Disallow any automatic changes to `Gemfile.lock`. Bundler commands will be blocked unless the lockfile can be installed exactly as written", and names the usual trigger, a `Gemfile` edited by hand without regenerating the lockfile.

`deployment` is documented as equivalent to setting `frozen` to `true` and `path` to `vendor/bundle`, so it is the stricter of the two only in where the gems land. Where a project already sets `deployment`, that is the frozen half satisfied; do not add both and report them as two controls.

### What breaks the first time you commit the lockfile

Committing the lockfile is the easy half. Three things fail afterward, all of them in CI rather than on the machine that generated the lock.

**Generate the lock on the lowest Ruby the matrix tests.** Frozen mode compares the `Gemfile`'s declared dependency set against the lock's `DEPENDENCIES` section, and refuses when they differ. A gem whose requirement resolves differently by Ruby version therefore records a different `DEPENDENCIES` set on each one. Generate the lock on the newest Ruby and every job on the oldest fails before install begins, with `You have deleted from the Gemfile` naming a gem nobody deleted. Pin such a gem to a version the whole matrix resolves, and say in a comment which Ruby floor lifts the pin. A `RUBY_VERSION` conditional in the `Gemfile` does not work here and fails harder, because it makes the declared set itself vary by job.

**A gemfiles matrix needs its own committed locks, and Dependabot will not maintain them.** Dependabot's Bundler file fetcher looks for `Gemfile` or `gems.rb`, and `Gemfile.lock` or `gems.locked`, by exact name. An appraisal-style `gemfiles/rails_8.0.gemfile` and its `gemfiles/rails_8.0.gemfile.lock` match none of those, so a Dependabot pull request updates the root lock and leaves the matrix locks behind.

That is less dangerous than it reads, because the matrix locks `eval_gemfile` the root `Gemfile` and record its requirement strings. A Dependabot change to a requirement therefore turns the matrix jobs red on its own pull request, which is the reminder to regenerate. What drifts quietly is only a bump inside an unchanged requirement, where the matrix keeps testing a slightly older patch version until the next regeneration. Give the project one command that regenerates every lock, and name it in the contributing guide rather than only in a Rakefile comment.

Count the jobs that are actually frozen before relying on that reminder. A matrix job running unfrozen, or marked `continue-on-error`, cannot report the mismatch.

**Add the CI platform.** A lock generated on a developer's macOS records that platform alone, and a Linux runner then has no resolution to install. `bundle lock --add-platform x86_64-linux` "adds a new platform to the lockfile, re-resolving for the addition of that platform", with no machine of that platform needed.

Verified 2026-07-31 against [dependabot-core's Bundler file fetcher](https://github.com/dependabot/dependabot-core/blob/main/bundler/lib/dependabot/bundler/file_fetcher.rb) and [bundle lock](https://github.com/rubygems/rubygems/blob/master/lib/bundler/man/bundle-lock.1.ronn).

## Static analysis (R-SEC-09)

CodeQL supports Ruby, so CodeQL default setup covers this ecosystem on GitHub. GitLab's SAST table lists Ruby under its Semgrep-based analyzer with GitLab-managed rules.

## Vulnerability watch (R-SEC-11)

The dependency graph parses `Gemfile.lock` as its recommended file, with `Gemfile` and `*.gemspec` as additional files. The RubyGems row marks static transitive dependencies, Dependabot graph jobs, and automatic dependency submission all unsupported, so the coverage a committed `Gemfile.lock` buys is what the lockfile itself lists rather than a resolved graph the forge builds.

Advisories come from the GitHub Advisory Database, which names this ecosystem RubyGems against the rubygems.org registry.

`osv-scanner` reads `Gemfile.lock` and `gems.locked`.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [bundle config](https://github.com/rubygems/rubygems/blob/master/lib/bundler/man/bundle-config.1.ronn), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
