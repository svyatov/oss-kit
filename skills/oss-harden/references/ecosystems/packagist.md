# Packagist

## Automated dependency updates (R-SEC-03)

Dependabot's `composer` value carries version updates and security updates, for Composer v2, including private repositories and private registries. Vendored dependencies are not supported.

On GitLab the Renovate manager is `composer`.

## Lockfile and frozen install (R-SEC-08)

Composer writes `composer.lock` without being asked, and `composer install` "will use the exact versions from there instead of resolving them", so the install command is already the frozen one and there is no flag to add.

What Composer does not do is fail when that lockfile has drifted from `composer.json`, and its documentation describes no install option that makes it fail. The gate is a separate step: `composer validate --strict`, whose `--check-lock` option checks that the lockfile is up to date and whose `--no-check-lock` option is documented as the way to "Do not emit an error if `composer.lock` exists and is not up to date". A pipeline running `composer install` alone installs a stale resolution happily, so read for the validate step before reporting this ecosystem satisfied.

## Static analysis (R-SEC-09)

CodeQL does not support PHP; it appears nowhere in the supported languages list, so CodeQL default setup is not the answer here and adding an empty CodeQL configuration would be worse than none.

GitLab ships one: its SAST table lists PHP under the Semgrep-based analyzer with GitLab-managed rules, in the tier that carries the open source analyzers.

On GitHub the analyzer comes from the PHP ecosystem itself. Psalm's security analysis, enabled with the `--taint-analysis` command line flag, traces connections between user-controlled input and places unescaped input should not reach, across taint types including SQL injection, cross-site scripting, shell command injection, insecure deserialization, remote code inclusion, and server-side request forgery. Run it on pull requests and make its result a required check, which is what the rule asks of a project whose language CodeQL does not cover.

## Vulnerability watch (R-SEC-11)

The dependency graph parses `composer.lock` as its recommended file, with `composer.json` as an additional file. The Composer row marks static transitive dependencies, Dependabot graph jobs, and automatic dependency submission all unsupported, so what the graph knows is what the committed lockfile says.

Advisories come from the GitHub Advisory Database, which names this ecosystem Composer against the packagist.org registry.

`osv-scanner` reads `composer.lock`.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [Composer command line interface](https://getcomposer.org/doc/03-cli.md), [Psalm security analysis](https://psalm.dev/docs/security_analysis/), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
