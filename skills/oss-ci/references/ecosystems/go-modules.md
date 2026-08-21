# Go modules

## Toolchain and matrix (R-CI-03)

On GitHub Actions, `actions/setup-go` installs a Go version and puts it on the PATH. The support claim lives in the `go` directive in `go.mod`, which sets the minimum Go version required to use the module; since Go 1.21 that is a hard requirement rather than advice, and a toolchain older than the directive refuses to build the module at all.

```yaml
strategy:
  matrix:
    go-version: ['1.26', '1.27']  # the two supported lines on 2026-08-20; read the policy, not this list
steps:
  - uses: actions/setup-go@v7  # oss-harden pins this to a commit SHA
    with:
      go-version: ${{ matrix.go-version }}
```

`go-version-file: go.mod` reads the directive instead of repeating it, which keeps one version in one place; from v6 the action prefers the `toolchain` directive when the file carries one and falls back to `go`. That form pins a single version rather than a matrix, so use it for a single-version pipeline and the explicit list above for a matrix.

Go's own release policy bounds how many lines there are to cover: each major release is supported until two newer major releases exist. A module whose `go` directive names an unsupported version still claims it, so the matrix covers the directive's version and every supported line above it.

Compute the list rather than copying the one above, because Go ships a major release roughly every six months and any list written into a file is wrong within one of them. `curl -s 'https://go.dev/dl/?mode=json'` returns exactly the supported lines, which is the policy applied for you.

On GitLab, run the job in the Go official image and vary the tag with `parallel:matrix`.

Sources: [actions/setup-go](https://github.com/actions/setup-go), [Go modules reference](https://go.dev/ref/mod), [Go release policy](https://go.dev/doc/devel/release), [docker-library/golang](https://github.com/docker-library/golang).

## Dependency caching (R-CI-04)

`actions/setup-go` caches Go modules and build outputs, and unlike the other setup actions its caching is on by default; `cache: false` turns it off.

Read the key before trusting it. From v6 the action's default cache key hashes `go.mod`, not `go.sum`, and the README says to set `cache-dependency-path: go.sum` to key on the sum file instead. `go.mod` records the module requirements while `go.sum` records the resolved content hashes, so the default key survives a dependency change that only `go.sum` records.

```yaml
- uses: actions/setup-go@v7  # oss-harden pins this to a commit SHA
  with:
    go-version: ${{ matrix.go-version }}
    cache-dependency-path: go.sum
```

The module cache itself lives at `$GOMODCACHE`, defaulting to `$GOPATH/pkg/mod`, and it is download data by construction: the go command stores versioned, verified copies there. On GitLab set `GOMODCACHE` to a project-relative directory and key `cache:key:files` on `go.sum`, because GitLab caches only paths inside the project directory.

Sources: [actions/setup-go](https://github.com/actions/setup-go), [Go modules reference, module cache](https://go.dev/ref/mod), [GitLab CI/CD YAML reference, cache](https://docs.gitlab.com/ci/yaml/#cachepaths).

## Test command (R-CI-06)

`go test ./...` is the invocation, and it is what Go's own publishing guide runs before tagging a release. Go declares the suite by layout rather than in a manifest: the go command discovers `_test.go` files in every package the pattern matches, so `./...` covers the module and no configuration file states it.

That means `go.mod` carrying no test entry says nothing about whether a suite exists. Look for `_test.go` files, and treat a module with executable code and none as the gap.

Sources: [Publishing a module](https://go.dev/doc/modules/publishing).

Verified 2026-08-20 against https://github.com/actions/setup-go, https://go.dev/ref/mod, https://go.dev/doc/devel/release, https://go.dev/doc/modules/publishing, https://github.com/docker-library/golang, and https://docs.gitlab.com/ci/yaml/.
