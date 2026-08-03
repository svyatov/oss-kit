# npm

## Toolchain and matrix (R-CI-03)

On GitHub Actions, `actions/setup-node` installs a Node version and puts it on the PATH. Drive the matrix from `engines.node` in `package.json`, which is where a package states the Node versions it works on. npm treats that field as advisory unless the installing user sets `engine-strict`, so it is a support claim rather than an enforced constraint, and that is exactly the claim the matrix has to cover.

```yaml
strategy:
  matrix:
    node-version: ['22', '24', '26']
steps:
  - uses: actions/setup-node@v7  # oss-harden pins this to a commit SHA
    with:
      node-version: ${{ matrix.node-version }}
```

Those three are the lines Node maintains as of 2026-08-03: 22 in maintenance until 2027-04-30, 24 in active long-term support, and 26 current. Node 20 reached end of life on 2026-04-30 and belongs in no matrix. Read the release schedule rather than copying the numbers above, because the set turns over on a published date: 26 becomes long-term support on 2026-10-28 and 24 drops to maintenance on 2026-10-20, and from Node 27 onward there is one major each April, every release becomes long-term support, and the odd-numbered and even-numbered distinction ends.

`node-version-file` reads `package.json`, `.nvmrc`, `.node-version`, or `.tool-versions`. It resolves one version, so it describes the contributor toolchain and does not build a matrix; `node-version` wins when both are given.

On GitLab, run the job in the Node official image and vary the tag with `parallel:matrix`, as `references/gitlab.md` shows.

Sources: [actions/setup-node](https://github.com/actions/setup-node), [package.json](https://docs.npmjs.com/cli/v12/configuring-npm/package-json), [nodejs/docker-node](https://github.com/nodejs/docker-node), [Node.js release schedule](https://github.com/nodejs/Release/blob/main/schedule.json).

## Dependency caching (R-CI-04)

`actions/setup-node` caches the package manager's global download data rather than `node_modules`. Since v5 it enables caching by default when no `cache` input is given; v6 narrowed the automatic case to projects that name npm in `devEngines.packageManager` or in the top-level `packageManager` field, and left yarn and pnpm to an explicit `cache: yarn` or `cache: pnpm`. `cache-dependency-path` names the file whose hash goes into the primary key.

```yaml
- uses: actions/setup-node@v7  # oss-harden pins this to a commit SHA
  with:
    node-version: ${{ matrix.node-version }}
    cache: npm
    cache-dependency-path: package-lock.json
```

The roster lists five lockfiles under npm, `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `pnpm-lock.yaml`, and `bun.lock`, so read which one the repository actually commits before naming a path. npm 12 removed the `npm shrinkwrap` command and no longer loads a file named `npm-shrinkwrap.json`, so one still committed today is a cache key pointing at a file the install ignores; it stays in the roster because repositories still carry it, and a repository that has one should rename it to `package-lock.json`. setup-node's own README recommends `package-manager-cache: false` for a workflow running with elevated privileges.

On GitLab there is no equivalent action. Key `cache:key:files` on the lockfile and point npm's cache at a project-local directory, which is the `npm ci --cache .npm --prefer-offline` shape in `references/gitlab.md`; GitLab caches only paths inside the project directory, so npm's default global cache under the home directory cannot be cached where it lies.

Sources: [actions/setup-node](https://github.com/actions/setup-node), [GitLab CI/CD YAML reference, cache](https://docs.gitlab.com/ci/yaml/#cachepaths).

## Test command (R-CI-06)

`npm test` runs whatever the `test` property of the `scripts` object in `package.json` holds, so `package.json` is where the project declares the command and CI calls the alias rather than the runner. `npm init` scaffolds that property as `echo "Error: no test specified" && exit 1`, which is a repository with no suite rather than one with a failing suite; read the property's body before treating its presence as an answer.

Sources: [npm test](https://docs.npmjs.com/cli/v12/commands/npm-test), [package.json](https://docs.npmjs.com/cli/v12/configuring-npm/package-json).

Verified 2026-08-03 against https://docs.npmjs.com/cli/v12/commands/npm-test, https://docs.npmjs.com/cli/v12/configuring-npm/package-json, and https://github.com/nodejs/Release/blob/main/schedule.json. The setup-node, docker-node, and GitLab claims were last read on 2026-07-31 and are unchanged here.
