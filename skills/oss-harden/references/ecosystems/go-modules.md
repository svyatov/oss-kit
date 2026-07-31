# Go modules

## Automated dependency updates (R-SEC-03)

Dependabot's `gomod` value carries version updates and security updates, and vendoring is supported, so a project with a `vendor/` directory still gets both. Private registries are not supported for this value.

On GitLab the Renovate manager is `gomod`.

## Lockfile and frozen install (R-SEC-08)

Go splits what other ecosystems put in one file. `go.mod` fixes the selected versions, and `go.sum` records the hashes, so both halves need reading before this is reported either way.

The freeze is the default rather than a flag. Since Go 1.16 the `go` command acts as if `-mod=readonly` were set: it reports an error and suggests a fix if `go.mod` needs updating, rather than editing it. A project with a `vendor/` directory and a `go` directive of 1.14 or higher gets `-mod=vendor` instead, which is a different guarantee, so read the directive before assuming which applies. Setting `-mod=readonly` explicitly in CI is worth doing for the same reason a `permissions:` block is written down: it makes the behaviour visible in the file rather than derived from a toolchain version.

`go mod verify` is the integrity half. It hashes each downloaded module zip and extracted directory in the module cache, compares them against the hash recorded when the module was first downloaded, prints "all modules verified" on success, and exits non-zero naming what changed. Every module-aware command already checks the cache against `go.sum`, so `go mod verify` in CI is a deliberate re-check rather than the only one.

## Static analysis (R-SEC-09)

CodeQL supports Go, so CodeQL default setup covers this ecosystem on GitHub. GitLab's SAST table lists Go under its Semgrep-based analyzer with GitLab-managed rules.

## Vulnerability watch (R-SEC-11)

The dependency graph parses `go.mod` and nothing else; `go.sum` is not in its table. The Go modules row does support Dependabot graph jobs, which is how the resolved set reaches the graph despite only the manifest being parsed.

Advisories come from the GitHub Advisory Database, which names this ecosystem Go against the pkg.go.dev registry.

Go also publishes a database of its own at `https://vuln.go.dev`, curated by the Go security team from the National Vulnerability Database, the GitHub Advisory Database, and reports from Go package maintainers, in OSV format. `govulncheck`, installed with `go install golang.org/x/vuln/cmd/govulncheck@latest` and run as `govulncheck ./...`, reads it and "only surfaces vulnerabilities that actually affect you, based on which functions in your code are transitively calling vulnerable functions". That reachability filter is a different question from the one a version-matching scanner answers, so the two are complementary: `govulncheck` says whether this code reaches the vulnerable symbol, and `osv-scanner`, which reads `go.mod`, says whether the version is affected at all.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [Go Modules Reference](https://go.dev/ref/mod), [Go vulnerability management](https://go.dev/doc/security/vuln/), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
