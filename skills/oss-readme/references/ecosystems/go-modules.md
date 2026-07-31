# Go modules

## Version badge

Shields.io serves no version badge for a Go module. Its version category carries `github/v/tag` and `gitlab/v/tag` and nothing that reads a module proxy, and there is nothing on the other side to read: proxy.golang.org runs a module mirror, a checksum database, and a version index, none of which serves a badge. pkg.go.dev does publish a badge, the Go Reference one, and that badge links to the package documentation rather than reporting a version, so the live-fact test in `badges.md` keeps it out of the row.

Source: [Go Module Mirror, Index, and Checksum Database](https://proxy.golang.org/) and [pkg.go.dev badge](https://pkg.go.dev/badge).

The strongest documented fallback is the tag badge, which reports the same artifact the proxy resolves:

```markdown
[![version](https://img.shields.io/github/v/tag/OWNER/REPO?sort=semver&label=version)](https://pkg.go.dev/github.com/OWNER/REPO)
```

Neither query parameter is optional. `sort` defaults to `date`, which returns whichever tag was committed most recently rather than the highest version, so a repository that backports a patch to an old line reports the old line as current. And the default label is `tag`, which names a git artifact; `label=version` is what a reader needs, because a tag is the mechanism here and the version is the fact.

On GitLab the same badge is `img.shields.io/gitlab/v/tag/NAMESPACE/PROJECT?sort=semver&label=version`, which takes the full project path in one parameter and a `gitlab_url` parameter for a self-managed instance.

This sits below what a registry badge gives. A tag exists whether or not the proxy ever served that version, so the badge can state a version that `go get` will not resolve, and R-DOC-04 is what that risks. A version endpoint on proxy.golang.org, or a shields.io service reading index.golang.org, would retire the gap.

## Install command

```bash
go get MODULE
```

That is the line for a module a reader imports. A module whose point is an executable shows `go install MODULE@latest` instead, which Go documents as building in module-aware mode and ignoring any `go.mod` in the current directory, so it installs the tool without touching the reader's own dependencies.

Take `MODULE` from the `module` line of `go.mod` rather than from the repository URL. At major version 2 and above the two differ: the path carries a `/v2` suffix that the clone URL does not, and a README that drops it names a module that does not exist.

Verified 2026-07-31 against [Managing dependencies](https://go.dev/doc/modules/managing-dependencies), [Go Modules Reference](https://go.dev/ref/mod), [Go Module Mirror, Index, and Checksum Database](https://proxy.golang.org/), [pkg.go.dev badge](https://pkg.go.dev/badge), [GitHub Tag badge](https://shields.io/badges/git-hub-tag), and `services/github/github-tag.service.js` plus `services/gitlab/gitlab-tag.service.js` and `services/github/github-common-release.js` in [badges/shields](https://github.com/badges/shields).
