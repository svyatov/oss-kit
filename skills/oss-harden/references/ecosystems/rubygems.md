# RubyGems

## Automated dependency updates (R-SEC-03)

Dependabot's `bundler` value carries version updates and security updates, and it is one of the few ecosystems where the table also marks vendoring supported, so a project that checks its gems into `vendor/cache` still gets updates.

On GitLab the Renovate manager is `bundler`.

## Lockfile and frozen install (R-SEC-08)

Bundler writes `Gemfile.lock` without being asked, and the frozen mode is configuration rather than a command flag. `bundle config set --local frozen true` writes it to `.bundle/config` in the working tree, which is not the same as writing it to the repository: `bundle gem` generates a `.gitignore` whose first line is `/.bundle/`, so on a gem skeleton the setting is invisible to a reviewer and absent from every checkout CI makes. Check the ignore file before reporting the control as set. Where it is ignored, either track the config file deliberately or set `BUNDLE_FROZEN=true` in the workflow, which reaches CI without depending on what got committed. Bundler documents `frozen` as "Disallow any automatic changes to `Gemfile.lock`. Bundler commands will be blocked unless the lockfile can be installed exactly as written", and names the usual trigger, a `Gemfile` edited by hand without regenerating the lockfile.

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

## Update cooldown (R-SEC-14)

The rule is scored against the updater, so `cooldown` in `dependabot.yml` or `minimumReleaseAge` in a Renovate configuration is what closes it, and `references/github.md` and `references/gitlab.md` carry those. Bundler has carried its own since 4.0.13, released 2026-06-03, where the changelog lists it under Security. It is worth setting alongside the updater because it covers an install the updater never touched, such as a contributor adding a gem by hand.

The unit is whole days and the default is unset, meaning no cooldown at all. Bundler resolves the effective value from three layers, highest precedence first: `--cooldown N` on `install`, `update`, `add`, and `outdated`; then `bundle config set cooldown N` or `BUNDLE_COOLDOWN=N`; then the per-source `cooldown:` keyword in the `Gemfile`.

```ruby
source "https://rubygems.org", cooldown: 3
```

Prefer the `Gemfile` form to `bundle config set cooldown`, for the reason the frozen section above gives: on a `bundle gem` skeleton `/.bundle/` is ignored, so the setting looks applied locally and reaches nobody else, while the `Gemfile` is already tracked. Note the trade that comes with it. The two higher layers apply uniformly to every source, including one that declared its own value, so a private registry is exempted permanently by declaring `source "https://internal", cooldown: 0` and not by any command line. `--cooldown 0` is the escape hatch for a single run, which the project wants the day a real security fix ships.

Two things make a configured cooldown cover less than it reads. Bundler filters on a per-version `created_at` timestamp in the v2 compact index, and a version whose server does not emit one is treated as outside the window and stays resolvable, which reaches older gem servers, rubygems.org entries predating its v2 cutover, and private registries still serving v1. Confirm the registry emits `created_at` in its `/info/<gem>` responses before reporting the control as covering the project's gems. Separately, from 4.0.15 a version already in `Gemfile.lock` is exempt on every resolution path, so the setting governs what enters the lockfile and never what is already pinned there. That is the same leak `references/ecosystems/npm.md` records for bun, and it is the reason cooldown is not a substitute for watching the lockfile under R-SEC-11.

Confirm it took effect rather than trusting the syntax. Bundler names the setting when it holds a version back, reporting the count of versions excluded and the `--cooldown 0` bypass.

Verified 2026-08-11 against `bundle install` and `bundle config` from Bundler 4.0.17 and the [Bundler changelog](https://github.com/rubygems/rubygems/blob/master/bundler/CHANGELOG.md) entries for 4.0.13 through 4.0.15.

## Install-time code execution (R-SEC-15)

R-SEC-15 places this ecosystem outside itself, and that stands: RubyGems documents no way to decline a dependency's install-time code, so there is nothing for the rule to check and no finding to report. What the rule's silence should not do is leave the reader believing the exposure is absent, because it is larger here than in the ecosystems the rule does reach.

A gem whose gemspec sets `spec.extensions` runs `extconf.rb`, `Rakefile`, or `mkrf_conf.rb` during `bundle install`, before anything is required. There is no `--ignore-scripts`, no allowlist, and no per-gem opt-out. The BufferZoneCorp campaign disclosed on 2026-05-01 used exactly this path: seven gems published under names resembling Rails and ActiveSupport utilities carried credential harvesting in `extconf.rb`, reading SSH keys, AWS credentials, `.npmrc`, `.netrc`, and RubyGems credentials from developer machines and CI runners.

So report the surface rather than a violation, and give the user its size:

```bash
ruby -e 'Gem::Specification.each { |s| puts s.name if s.extensions.any? }'
```

The controls that do apply are the ones the other sections carry. A committed lockfile and frozen install stop an unreviewed version arriving on its own, the cooldown above keeps a newly published one out of resolution long enough for a yank to land, and the vulnerability watch under R-SEC-11 is what eventually names it. Say which of the three the repository has, because for this ecosystem they are the whole answer.

Verified 2026-08-11 against [Socket's BufferZoneCorp research](https://socket.dev/blog/malicious-ruby-gems-and-go-modules-steal-secrets-poison-ci) and the R-SEC-15 `Check` line in `skills/oss-audit/STANDARD.md`.
