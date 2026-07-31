# RubyGems

## Automated dependency updates (R-SEC-03)

Dependabot's `bundler` value carries version updates and security updates, and it is one of the few ecosystems where the table also marks vendoring supported, so a project that checks its gems into `vendor/cache` still gets updates.

On GitLab the Renovate manager is `bundler`.

## Lockfile and frozen install (R-SEC-08)

Bundler writes `Gemfile.lock` without being asked, and the frozen mode is configuration rather than a command flag. `bundle config set --local frozen true` sets it in `.bundle/config` inside the repository, where the workflow file and a reviewer can both see it. Bundler documents `frozen` as "Disallow any automatic changes to `Gemfile.lock`. Bundler commands will be blocked unless the lockfile can be installed exactly as written", and names the usual trigger, a `Gemfile` edited by hand without regenerating the lockfile.

`deployment` is documented as equivalent to setting `frozen` to `true` and `path` to `vendor/bundle`, so it is the stricter of the two only in where the gems land. Where a project already sets `deployment`, that is the frozen half satisfied; do not add both and report them as two controls.

## Static analysis (R-SEC-09)

CodeQL supports Ruby, so CodeQL default setup covers this ecosystem on GitHub. GitLab's SAST table lists Ruby under its Semgrep-based analyzer with GitLab-managed rules.

## Vulnerability watch (R-SEC-11)

The dependency graph parses `Gemfile.lock` as its recommended file, with `Gemfile` and `*.gemspec` as additional files. The RubyGems row marks static transitive dependencies, Dependabot graph jobs, and automatic dependency submission all unsupported, so the coverage a committed `Gemfile.lock` buys is what the lockfile itself lists rather than a resolved graph the forge builds.

Advisories come from the GitHub Advisory Database, which names this ecosystem RubyGems against the rubygems.org registry.

`osv-scanner` reads `Gemfile.lock` and `gems.locked`.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [bundle config](https://github.com/rubygems/rubygems/blob/master/lib/bundler/man/bundle-config.1.ronn), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
