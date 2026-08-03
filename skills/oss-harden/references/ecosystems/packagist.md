# Packagist

## Automated dependency updates (R-SEC-03)

Dependabot's `composer` value carries version updates and security updates, for Composer v2, including private repositories and private registries. Vendored dependencies are not supported.

On GitLab the Renovate manager is `composer`.

## Lockfile and frozen install (R-SEC-08)

Composer writes `composer.lock` without being asked, and `composer install` "will use the exact versions from there instead of resolving them", so the install command is already the frozen one and there is no flag to add.

What Composer does not do is fail when that lockfile has drifted from `composer.json`, and its documentation describes no install option that makes it fail. The gate is a separate step: `composer validate --strict`, whose `--check-lock` option checks that the lockfile is up to date and whose `--no-check-lock` option is documented as the way to "Do not emit an error if `composer.lock` exists and is not up to date". A pipeline running `composer install` alone installs a stale resolution happily, so read for the validate step before reporting this ecosystem satisfied.

### What breaks the first time you commit the lockfile

**Resolution reads the PHP you run, and Composer publishes the fix.** A lock generated on the newest PHP can name a package release the oldest matrix job cannot install. The `config.platform` setting exists for this, letting a project "fake platform packages (PHP and extensions) so that you can emulate a production env or define your target platform". Set `config.platform.php` to the lowest PHP the matrix tests before generating the lock, and Composer then makes sure "no package requiring more than" that version "can be installed regardless of the actual PHP version you run locally".

**That setting makes the check inexact, so add the one Composer names.** Its own documentation warns that with a faked platform "the dependencies are not checked correctly anymore", and directs a project to run `composer check-platform-reqs` during deployment. Run it in each matrix job, so a real extension or version gap surfaces on the job that has it rather than on the machine that wrote the lock. `platform-check` is the related autoloader control, defaulting to `php-only` and taking `true` to also check that extensions are present.

**Platform in the operating-system sense is not a dimension.** Composer's platform packages are the PHP runtime and its extensions, and the lockfile records no per-architecture entry, so a lock written on macOS installs on a Linux runner unchanged.

Verified 2026-07-31 against [the Composer config reference](https://getcomposer.org/doc/06-config.md).

## Dependency install scripts (R-SEC-15)

Composer runs two kinds of package-supplied code, and they take different controls.

Scripts are the ones a `composer.json` declares under `scripts`, including the `post-install-cmd` and `post-update-cmd` events an install fires. `--no-scripts` "Skips execution of scripts defined in `composer.json`", and it is what a CI install should carry, with the project's own scripts run as explicit steps after it where they are needed.

Plugins are the sharper problem, because a plugin executes during the Composer run itself rather than at an event the project chose. `--no-plugins` disables them for one run. The durable form is the `allow-plugins` map in `composer.json`, added in Composer 2.2.0 to "restrict which Composer plugins are able to execute code during a Composer run". It "Defaults to `{}` which does not allow any plugins to be loaded", and an unlisted plugin prints a warning and, in an interactive run, a prompt. That default is what makes the map worth committing rather than relying on: a non-interactive CI run with no map loads nothing, and a developer answering the prompt locally is how an entry gets added without anybody deciding to add it.

So the rule is satisfied here by `--no-scripts --no-plugins` on the CI install, or by a committed `allow-plugins` map that names only what the project has actually reviewed.

Verified 2026-08-03 against [Composer CLI](https://getcomposer.org/doc/03-cli.md) and [Composer config](https://getcomposer.org/doc/06-config.md).

## Static analysis (R-SEC-09)

CodeQL does not support PHP; it appears nowhere in the supported languages list, so CodeQL default setup is not the answer here and adding an empty CodeQL configuration would be worse than none.

GitLab ships one: its SAST table lists PHP under the Semgrep-based analyzer with GitLab-managed rules, in the tier that carries the open source analyzers.

On GitHub the analyzer comes from the PHP ecosystem itself. Psalm's security analysis, enabled with the `--taint-analysis` command line flag, traces connections between user-controlled input and places unescaped input should not reach, across taint types including SQL injection, cross-site scripting, shell command injection, insecure deserialization, remote code inclusion, and server-side request forgery. Run it on pull requests and make its result a required check, which is what the rule asks of a project whose language CodeQL does not cover.

## Vulnerability watch (R-SEC-11)

The dependency graph parses `composer.lock` as its recommended file, with `composer.json` as an additional file. The Composer row marks static transitive dependencies, Dependabot graph jobs, and automatic dependency submission all unsupported, so what the graph knows is what the committed lockfile says.

Advisories come from the GitHub Advisory Database, which names this ecosystem Composer against the packagist.org registry.

`osv-scanner` reads `composer.lock`.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [Composer command line interface](https://getcomposer.org/doc/03-cli.md), [Psalm security analysis](https://psalm.dev/docs/security_analysis/), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
