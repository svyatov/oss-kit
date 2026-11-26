# npm

## Automated dependency updates (R-SEC-03)

Dependabot's `npm` value covers npm, Yarn v1 through v4, and pnpm, with both version updates and security updates. Bun is a separate value, `bun`, supported from Bun 1.1.39 for the text `bun.lock` and not for the legacy binary `bun.lockb`, and it carries version updates only: Dependabot's table marks security updates as not supported for it. A Bun project therefore gets scheduled bumps and no advisory-driven ones, which is the whole-feed residual the Vulnerability watch section below picks up.

On GitLab, where nothing equivalent to Dependabot ships with the platform, the Renovate managers are `npm` and `bun`.

## Lockfile and frozen install (R-SEC-08)

Every package manager here writes a lockfile without being asked: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, or `bun.lock`. The frozen-install command differs by manager, and each fails rather than re-resolving:

- `npm ci`, which needs a lockfile supported by the CI version of npm (see the shrinkwrap guidance below), and where "If dependencies in the package lock do not match those in `package.json`, `npm ci` will exit with an error, instead of updating the package lock".
- Yarn Classic (1.x): `yarn install --frozen-lockfile` fails if an update is needed. Modern Yarn (2+): `yarn install --immutable` fails if the lockfile would change.
- `pnpm install --frozen-lockfile`, which "doesn't generate a lockfile and fails to install if the lockfile is out of sync with the manifest / an update is needed or no lockfile is present".
- `bun install --frozen-lockfile`, which installs the exact versions in the lockfile and exits with an error when `package.json` disagrees with `bun.lock`.

Modern Yarn and pnpm both default that flag on in CI, and pnpm's default also requires a lockfile to be present. Write the flag anyway. A default that depends on the runner exporting `CI` is not evidence in a workflow file, and the same command run locally or on a runner that does not set it silently re-resolves.

### What breaks the first time you commit the lockfile

**Regenerate the lock with no `node_modules` present, or it records one platform.** A dependency gated by the `os` or `cpu` field is optional, and npm records the variant it resolved. Regenerating while a `node_modules` tree built on the maintainer's own machine is present has been reported to record that machine's variant alone, and `npm ci` on a Linux runner then skips the variant the runner needs rather than failing. Delete the lockfile and `node_modules` together, then reinstall. `npm install` takes `--os`, `--cpu`, and `--libc`, each documented as an override of the platform native modules are installed for, so one machine can confirm the lock covers the runner.

**Pin the npm version, not only the Node version.** The lockfile format is versioned against the npm major rather than the runtime. `lockfileVersion` 2 is what npm 7 and 8 write, and 3 is what npm 9 and above write. A job whose bundled npm predates the one that wrote the file rewrites the format during install, which surfaces as a lockfile the job modified rather than as a version difference.

**Every lockfile needs a directory the updater is configured to read.** Dependabot reaches the directories its configuration lists and no others, so a workspace or a nested package whose directory is unlisted keeps a lockfile nobody bumps. List each one, and give the project a single command that regenerates them all.

**Check the npm version before scoring shrinkwrap.** npm 11 honors `npm-shrinkwrap.json` and prefers it when both lockfiles exist. Accept a valid shrinkwrap on that version. npm 12 ignores shrinkwrap at the project root and in published tarballs. For npm 12 CI, use `package-lock.json`. If the project publishes a locked dependency tree, review `bundleDependencies` before migrating. For mixed-version CI or publication, verify which file each version consumes and whether the published package retains its intended dependencies.

Verified 2026-07-31 against [npm install](https://docs.npmjs.com/cli/v12/commands/npm-install), [package-lock.json](https://docs.npmjs.com/cli/v12/configuring-npm/package-lock-json), and [npm/cli issue 4828](https://github.com/npm/cli/issues/4828), and the shrinkwrap paragraph on 2026-08-03 against [npm CLI v12.0.0](https://github.com/npm/cli/releases/tag/v12.0.0). See also [npm 11 shrinkwrap](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json/) and [Yarn Classic install](https://classic.yarnpkg.com/en/docs/cli/install).

## Update cooldown (R-SEC-14)

The rule is scored against the updater, so `cooldown` in `dependabot.yml` or `minimumReleaseAge` in a Renovate configuration is what closes it, and `references/github.md` and `references/gitlab.md` carry those. Three of the four managers here also carry their own, which is worth setting alongside because it covers an install the updater never touched, such as a contributor adding a dependency by hand.

- **npm** has `min-release-age`, default `null`, counted in **days**: "only versions that were available more than the given number of days ago will be installed". `min-release-age-exclude` takes package names or minimatch globs. Note the interaction with `npm audit fix`: where the fix is younger than the threshold, npm keeps the vulnerable version and exits non-zero, which is a failure a project has to be ready to read.
- **Modern Yarn** has `npmMinimalAgeGate` and it is already on, defaulting to one week in versions that document this default. Yarn Classic has no `npmMinimalAgeGate` setting.
- **pnpm** has `minimumReleaseAge`, counted in **minutes**, and it is on by default at 1440, one day, from pnpm v11. Setting it to `0` turns the protection off.
- **bun** has `minimumReleaseAge` under `[install]` in `bunfig.toml`, counted in **seconds**, with `minimumReleaseAgeExcludes`. It is off by default and does not recheck versions already pinned in `bun.lock`, including under `--frozen-lockfile`. `bunx --minimum-release-age` applies the age gate; older versions affected by issue 30748 ignored it. `bun upgrade` has a separate unresolved limitation. Do not report the install setting as the project's only cooldown.

Three units across four managers, so read which manager the repository uses before writing a number. A value meant as one day is 1 in npm, 1440 in pnpm, and 86400 in bun.

Verified 2026-08-03 against [npm config](https://docs.npmjs.com/cli/v12/using-npm/config), [Yarn configuration](https://yarnpkg.com/configuration/yarnrc), [pnpm supply chain security](https://pnpm.io/supply-chain-security), [bun install](https://bun.com/docs/pm/cli/install.md), and the three bun issues at [30525](https://github.com/oven-sh/bun/issues/30525), [30748](https://github.com/oven-sh/bun/issues/30748), and [30533](https://github.com/oven-sh/bun/issues/30533).

## Dependency install scripts (R-SEC-15)

An install-time lifecycle script can give a compromised package access to the runner and its tokens. Defaults and exceptions differ by manager. Check the actual configuration before reporting dependency scripts blocked.

- **npm** blocks dependency lifecycle scripts by default from version 12, released 2026-07-08, and governs the exceptions with an `allowScripts` field in the root `package.json`. Maintain it with `npm install-scripts approve|deny|ls|prune`; `npm approve-scripts` and `npm deny-scripts` are aliases for the first two. `approve` writes a version-pinned entry such as `pkg@1.2.3` unless `--no-allow-scripts-pin` is passed, `deny` writes a name-only `false` entry that survives a later `approve --all`, `ls` reports what is blocked without editing anything, and `npm rebuild` runs a script that was approved after the install. npm 12 also changed `allow-git` and `allow-remote` to default to `none`, so a git or tarball-URL dependency no longer resolves until one of them is set to `all` or `root`.
- **Yarn Classic** supports `yarn install --ignore-scripts` to disable project and dependency scripts. For modern Yarn, set `enableScripts: false` explicitly in `.yarnrc.yml` and review any per-package `dependenciesMeta.built` exceptions. Check the project's Yarn version before relying on a default.
- **pnpm** disabled automatic execution of dependency `postinstall` scripts in version 10. `allowBuilds` lists the dependencies permitted to build; `dangerouslyAllowAllBuilds` turns the protection off wholesale and its name is the review comment.
- **bun** permits a built-in list of trusted npm packages when `trustedDependencies` is absent. An explicit `trustedDependencies` array replaces that list; `[]` trusts no dependencies. Use `--ignore-scripts` when no lifecycle script should run.

`--ignore-scripts` is a blunter and older instrument that still works and is worth writing in CI anyway, because it is evidence in the workflow file rather than a default the runner's manager version happens to carry. Note what it costs: it suppresses the project's own scripts too, which is why a job that needs `prepare` or `prepublishOnly` runs them as an explicit step rather than relying on the install to trigger them.

Verified 2026-08-03 against [npm config](https://docs.npmjs.com/cli/v12/using-npm/config), [npm install-scripts](https://github.com/npm/cli/blob/latest/docs/lib/content/commands/npm-install-scripts.md), [npm CLI v12.0.0](https://github.com/npm/cli/releases/tag/v12.0.0), [Yarn configuration](https://yarnpkg.com/configuration/yarnrc), [pnpm supply chain security](https://pnpm.io/supply-chain-security), and [bun install](https://bun.com/docs/pm/cli/install.md).

## Static analysis (R-SEC-09)

CodeQL supports JavaScript and TypeScript. Follow the shared required-check procedure in the GitHub reference to choose and configure setup. GitLab's SAST table lists both languages under its Semgrep-based analyzer with GitLab-managed rules.

## Vulnerability watch (R-SEC-11)

The dependency graph parses `package-lock.json` as its recommended file, with `package.json` as an additional file, and separately parses `yarn.lock` and `pnpm-lock.yaml`. All three carry static transitive dependency support, so a repository committing one of them gets direct and transitive coverage. `bun.lock` appears nowhere in that table, so a Bun project's graph falls back to `package.json` and reports direct dependencies alone.

Advisories come from the GitHub Advisory Database, which names this ecosystem Npm against the npmjs.com registry.

`osv-scanner` reads `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, and `bun.lock`, so it closes both the Bun parsing gap and the Bun security-update gap in one job.

Verified 2026-07-31 against [Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories.md), [Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems.md), [GitHub Advisory Database](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/github-advisory-database), [npm-ci](https://docs.npmjs.com/cli/v12/commands/npm-ci), [yarn install](https://yarnpkg.com/cli/install), [pnpm install](https://pnpm.io/cli/install), [bun install](https://bun.com/docs/pm/cli/install.md), [CodeQL supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/), [GitLab SAST](https://docs.gitlab.com/user/application_security/sast/), [Renovate managers](https://docs.renovatebot.com/modules/manager/), and [osv-scanner supported languages and lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
