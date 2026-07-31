# npm

## Toolchain and matrix (R-CI-03)

On GitHub Actions, `actions/setup-node` installs a Node version and puts it on the PATH. Drive the matrix from `engines.node` in `package.json`, which is where a package states the Node versions it works on. npm treats that field as advisory unless the installing user sets `engine-strict`, so it is a support claim rather than an enforced constraint, and that is exactly the claim the matrix has to cover.

```yaml
strategy:
  matrix:
    node-version: ['20', '22', '24']
steps:
  - uses: actions/setup-node@v7  # oss-harden pins this to a commit SHA
    with:
      node-version: ${{ matrix.node-version }}
```

`node-version-file` reads `package.json`, `.nvmrc`, `.node-version`, or `.tool-versions`. It resolves one version, so it describes the contributor toolchain and does not build a matrix; `node-version` wins when both are given.

On GitLab, run the job in the Node official image and vary the tag with `parallel:matrix`, as `references/gitlab.md` shows.

Sources: [actions/setup-node](https://github.com/actions/setup-node), [package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json), [nodejs/docker-node](https://github.com/nodejs/docker-node).

## Dependency caching (R-CI-04)

`actions/setup-node` caches the package manager's global download data rather than `node_modules`. Since v5 it enables caching by default when no `cache` input is given; v6 narrowed the automatic case to projects that name npm in `devEngines.packageManager` or in the top-level `packageManager` field, and left yarn and pnpm to an explicit `cache: yarn` or `cache: pnpm`. `cache-dependency-path` names the file whose hash goes into the primary key.

```yaml
- uses: actions/setup-node@v7  # oss-harden pins this to a commit SHA
  with:
    node-version: ${{ matrix.node-version }}
    cache: npm
    cache-dependency-path: package-lock.json
```

The roster lists five lockfiles under npm, `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `pnpm-lock.yaml`, and `bun.lock`, so read which one the repository actually commits before naming a path. setup-node's own README recommends `package-manager-cache: false` for a workflow running with elevated privileges.

On GitLab there is no equivalent action. Key `cache:key:files` on the lockfile and point npm's cache at a project-local directory, which is the `npm ci --cache .npm --prefer-offline` shape in `references/gitlab.md`; GitLab caches only paths inside the project directory, so npm's default global cache under the home directory cannot be cached where it lies.

Sources: [actions/setup-node](https://github.com/actions/setup-node), [GitLab CI/CD YAML reference, cache](https://docs.gitlab.com/ci/yaml/#cachepaths).

## Test command (R-CI-06)

`npm test` runs whatever the `test` property of the `scripts` object in `package.json` holds, so `package.json` is where the project declares the command and CI calls the alias rather than the runner. `npm init` scaffolds that property as `echo "Error: no test specified" && exit 1`, which is a repository with no suite rather than one with a failing suite; read the property's body before treating its presence as an answer.

Sources: [npm test](https://docs.npmjs.com/cli/v11/commands/npm-test), [package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json).

Verified 2026-07-31 against https://github.com/actions/setup-node, https://docs.npmjs.com/cli/v11/commands/npm-test, https://docs.npmjs.com/cli/v11/configuring-npm/package-json, https://github.com/nodejs/docker-node, and https://docs.gitlab.com/ci/yaml/.
