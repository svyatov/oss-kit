# Go modules

## Automated dependency updates (R-SEC-03)

Dependabot's `gomod` value carries version updates and security updates, and vendoring is supported, so a project with a `vendor/` directory still gets both. Private registries are not supported for this value.

On GitLab the Renovate manager is `gomod`.

## Lockfile and frozen install (R-SEC-08)

Go splits what other ecosystems put in one file. `go.mod` fixes the selected versions, and `go.sum` records the hashes, so both halves need reading before this is reported either way.

The freeze is the default rather than a flag. Since Go 1.16 the `go` command acts as if `-mod=readonly` were set: it reports an error and suggests a fix if `go.mod` needs updating, rather than editing it. A project with a `vendor/` directory and a `go` directive of 1.14 or higher gets `-mod=vendor` instead, which is a different guarantee, so read the directive before assuming which applies. Setting `-mod=readonly` explicitly in CI is worth doing for the same reason a `permissions:` block is written down: it makes the behaviour visible in the file rather than derived from a toolchain version.

`go mod verify` is the integrity half. It hashes each downloaded module zip and extracted directory in the module cache, compares them against the hash recorded when the module was first downloaded, prints "all modules verified" on success, and exits non-zero naming what changed. Every module-aware command already checks the cache against `go.sum`, so `go mod verify` in CI is a deliberate re-check rather than the only one.

### What breaks the first time you commit go.mod and go.sum

**The matrix floor is the `go` directive, and a dependency update can raise it.** Before Go 1.21 the directive was advisory; it is now a requirement, and "Go toolchains refuse to use modules declaring newer Go versions". Worse for an updater pull request, the `go` command "writes its own toolchain name in a `toolchain` line any time it is updating the `go` version in the `go.mod` file (usually during `go get`)". So a routine bump can raise the floor in the same commit that raises the dependency, and every job below the new floor stops before compiling. Read the diff for a changed `go` or `toolchain` line before merging one.

**`go.sum` is pruned against the previous release, and `-compat` moves that.** `go mod tidy` records "checksums needed by the Go version one below the version specified in its `go` directive", and `-compat` overrides which version that is. A matrix reaching two releases below the directive therefore needs `-compat` set to its oldest leg, or that leg fails on a missing checksum rather than on a missing module.

**Platform is not a dimension here.** Build constraints other than `ignore` "are not considered" by `go mod tidy` and the other module commands, so a module imported only under one `GOOS` stays in `go.mod` and `go.sum` whatever machine ran tidy. There is no per-platform regeneration to arrange and no equivalent of adding a platform to the lock.

Verified 2026-07-31 against [Go modules reference](https://go.dev/ref/mod) and [go mod tidy](https://pkg.go.dev/cmd/go#hdr-Add_missing_and_remove_unused_modules).

## Static analysis (R-SEC-09)

CodeQL supports Go, so CodeQL default setup covers this ecosystem on GitHub. GitLab's SAST table lists Go under its Semgrep-based analyzer with GitLab-managed rules.

## Vulnerability watch (R-SEC-11)

The dependency graph parses `go.mod` and nothing else; `go.sum` is not in its table. The Go modules row does support Dependabot graph jobs, which is how the resolved set reaches the graph despite only the manifest being parsed.

Advisories come from the GitHub Advisory Database, which names this ecosystem Go against the pkg.go.dev registry.

Go also publishes a database of its own at `https://vuln.go.dev`, curated by the Go security team from the National Vulnerability Database, the GitHub Advisory Database, and reports from Go package maintainers, in OSV format. `govulncheck`, installed with `go install golang.org/x/vuln/cmd/govulncheck@latest` and run as `govulncheck ./...`, reads it and "only surfaces vulnerabilities that actually affect you, based on which functions in your code are transitively calling vulnerable functions". That reachability filter is a different question from the one a version-matching scanner answers, so the two are complementary: `govulncheck` says whether this code reaches the vulnerable symbol, and `osv-scanner`, which reads `go.mod`, says whether the version is affected at all.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [Go Modules Reference](https://go.dev/ref/mod), [Go vulnerability management](https://go.dev/doc/security/vuln/), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
