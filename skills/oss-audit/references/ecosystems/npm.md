# npm

## Detection signals

npm is present when a `package.json` turns up anywhere in the checkout, or any of `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `pnpm-lock.yaml`, or `bun.lock` does. Depth and directory do not matter, and neither does whether the manifest declares anything publishable: the present axis exists to find dependency trees, and a tree under `site/` resolves packages exactly like one at the root.

npm is shipped when a manifest the repository publishes from carries `name` and `version`, which npm documents as required, and publish evidence exists: a release workflow running `npm publish`, or an existing page on npmjs.com for that name.

Source: [package.json fields](https://docs.npmjs.com/cli/v11/configuring-npm/package-json).

Three cases decide most arguments:

- `"private": true` settles the shipped answer on its own. npm's own words: "If you set `"private": true` in your package.json, then npm will refuse to publish it." The manifest is still present.
- A docs-only manifest, a `package.json` under `docs/`, `site/`, `www/`, or `examples/` whose whole job is building a page or an example, is present and not shipped. oss-kit itself is this case twice over: a root manifest marked `"private": true` for its maintenance scripts and a `site/package.json` that builds the docs, with a `bun.lock` beside each, which puts npm firmly on the present axis in a repository that publishes no package at all.
- A lockfile with no manifest beside it is present. So is a workspace root whose `package.json` carries only `workspaces` and `devDependencies`; each member answers the shipped question for itself.

## Release track

npm takes the registry-push track. `npm publish` uploads a built tarball to the registry under a credential, so there is an upload to secure and a credential to scope, which is what assigns the track. The roster records `"track": "registry-push"` for npm and the release area's preamble names npm in its registry-push list.

Verified 2026-07-31 against https://docs.npmjs.com/cli/v11/configuring-npm/package-json.
