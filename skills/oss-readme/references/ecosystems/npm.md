# npm

## Version badge

Shields.io serves this one at `img.shields.io/npm/v/PACKAGE`, and its route accepts a scope as part of the package name, so a scoped package needs no escaping and reads `img.shields.io/npm/v/@scope/name`. A further path segment selects a dist-tag: `img.shields.io/npm/v/PACKAGE/next` reports whatever `next` currently points at.

The default label is `npm`. Keep it. A dist-tag badge relabels itself to `npm@next` on its own, which is the one case where the label carries information the package name does not, so leave that alone too. Reach for the dist-tag form only when the README is documenting a pre-release channel; the plain form is what a reader wants to see.

Link the badge to the package page:

```markdown
[![npm](https://img.shields.io/npm/v/PACKAGE)](https://www.npmjs.com/package/PACKAGE)
```

## Install command

```bash
npm install PACKAGE
```

`npm install` is the documented command name. `add`, `i`, `in`, `ins`, and a dozen more are aliases of it, so a README showing `npm i` shows the same command in a form the reader has to decode. Write the package name exactly as published, scope included.

One command is enough. A README that stacks npm, Yarn, pnpm, and Bun rows for the same package spends four lines restating one fact, and every row is a line that can go stale independently. Show the second manager only where installing under it genuinely differs.

Verified 2026-07-31 against [npm-install](https://docs.npmjs.com/cli/v11/commands/npm-install), [NPM Version badge](https://shields.io/badges/npm-version), and `services/npm/npm-version.service.js` plus `services/npm/npm-base.js` and `services/version.js` in [badges/shields](https://github.com/badges/shields).
