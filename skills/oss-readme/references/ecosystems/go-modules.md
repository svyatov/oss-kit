# Go modules

## Version badge

Shields.io serves no version badge for a Go module. Its version category carries `github/v/tag` and `gitlab/v/tag` and nothing that reads a module proxy, and there is nothing on the other side to read: proxy.golang.org runs a module mirror, a checksum database, and a version index, none of which serves a badge. pkg.go.dev does publish a badge, the Go Reference one, and that badge links to the package documentation rather than reporting a version, so the live-fact test in `badges.md` keeps it out of the row.

Source: [Go Module Mirror, Index, and Checksum Database](https://proxy.golang.org/) and [pkg.go.dev badge](https://pkg.go.dev/badge).

For a repository that tags only this module, a tag badge can show its highest semantic version:

```markdown
[![tag](https://img.shields.io/github/v/tag/OWNER/REPO?sort=semver)](https://github.com/OWNER/REPO/tags)
```

On self-managed GitLab, set the badge's `gitlab_url` parameter to the instance URL. Link the badge to the project's tag list on that instance. A git tag does not establish that the Go proxy serves the module version.

Nested modules can have their own tag prefix. Use a tag source scoped to the module's own releases, or omit the badge.

## Install command

```bash
go get MODULE
```

That is the line for a module a reader imports. For an executable, locate its `main` package first, such as `example.com/module/cmd/tool`. The command package path can differ from the module root. A module whose point is an executable shows `go install COMMAND_PACKAGE@latest` instead, which Go documents as building in module-aware mode and ignoring any `go.mod` in the current directory, so it installs the tool without touching the reader's own dependencies.

Copy the `module` path exactly from `go.mod`. Preserve its declared major-version suffix, including `/v2` or the `gopkg.in` form `.v2`.

Verified 2026-07-31 against [Managing dependencies](https://go.dev/doc/modules/managing-dependencies), [Go Modules Reference](https://go.dev/ref/mod), [Go Module Mirror, Index, and Checksum Database](https://proxy.golang.org/), [pkg.go.dev badge](https://pkg.go.dev/badge), [GitHub Tag badge](https://shields.io/badges/git-hub-tag), and `services/github/github-tag.service.js` plus `services/gitlab/gitlab-tag.service.js` and `services/github/github-common-release.js` in [badges/shields](https://github.com/badges/shields).
