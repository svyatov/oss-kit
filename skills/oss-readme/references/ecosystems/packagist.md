# Packagist

## Version badge

Shields.io serves this one at `img.shields.io/packagist/v/VENDOR/PACKAGE`, taking the two halves of the package name as two path parameters. `?include_prereleases` widens it past stable releases.

The default label is `packagist`. Keep it.

Link the badge to the package page:

```markdown
[![packagist](https://img.shields.io/packagist/v/VENDOR/PACKAGE)](https://packagist.org/packages/VENDOR/PACKAGE)
```

The `vendor/project` name is fixed when the repository is first submitted and Packagist does not let it change afterwards, so the badge path, the link, and the `require` line below all carry the same string. Read it from `composer.json`'s `name` field, and if any of the three disagrees, that one is the typo.

## Install command

```bash
composer require vendor/package
```

Composer documents `require` as adding a package to `composer.json` in the current directory, and as selecting a version constraint itself when the command names none. Let it. A README that hardcodes `vendor/package:^3.1` is a constraint that goes stale on the next minor release, and the reader who pastes it after version 4 ships gets version 3.

A package that installs as a project rather than a dependency, such as a skeleton or a standalone application, shows `composer create-project vendor/package` instead. That is a different command with a different result, so show whichever one the project is, not both.

Verified 2026-07-31 against [Composer CLI](https://getcomposer.org/doc/03-cli.md), [About Packagist](https://packagist.org/about), and `services/packagist/packagist-version.service.js` in [badges/shields](https://github.com/badges/shields).
