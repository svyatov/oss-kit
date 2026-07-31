# Packagist

## Toolchain and matrix (R-CI-03)

Neither the PHP project nor Composer publishes a GitHub Actions setup action, so there is no first-party equivalent of `actions/setup-node` here and no upstream-documented matrix input. What upstream does publish is the PHP official image and a fixed PHP on each runner image, and both give a way to build the matrix.

Source: [docker-library/php](https://github.com/docker-library/php), [actions/runner-images, Ubuntu 24.04](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md).

The strongest documented option on either forge is to run the job in the PHP official image, which GitHub Actions supports as a job-level `container:` and GitLab as `image:`, and to vary the tag across the matrix. The support claim itself lives in the `php` entry of `require` in `composer.json`, which takes a constraint such as `>=7.4`, so the matrix covers each PHP release line that constraint admits.

```yaml
strategy:
  matrix:
    php: ['8.2', '8.3', '8.4']
container: php:${{ matrix.php }}-cli
```

The runner image's own PHP, 8.3.6 with Composer on `ubuntu-24.04`, is a single version that changes when the image changes, so it serves a single-version pipeline and not a matrix. Report the missing action as what it is, an ecosystem with no first-party setup action rather than an ecosystem that cannot be matrixed. A first-party action from the PHP project or from Composer would retire the gap and let the matrix live in `with:` alongside every other ecosystem here.

Sources: [Composer schema, require](https://getcomposer.org/doc/04-schema.md), [docker-library/php](https://github.com/docker-library/php).

## Dependency caching (R-CI-04)

Composer's cache holds the zip archives of packages. `cache-files-dir` defaults to `$cache-dir/files`, `cache-dir` defaults per platform, and `COMPOSER_CACHE_DIR` overrides the whole thing. `composer config cache-files-dir` prints the resolved path, which is what to read rather than assuming the default.

Key on `composer.lock`. Do not cache `vendor/`, which holds installed dependencies that `composer install` recreates from the lockfile, and which carries autoloader state generated for the PHP version that installed it.

On both forges this is an explicit cache, since no setup action exists to carry one. On GitLab set `COMPOSER_CACHE_DIR` to a project-relative directory and key `cache:key:files` on `composer.lock`, because GitLab caches only paths inside the project directory.

Sources: [Composer config reference](https://getcomposer.org/doc/06-config.md), [Composer CLI, environment variables](https://getcomposer.org/doc/03-cli.md), [GitLab CI/CD YAML reference, cache](https://docs.gitlab.com/ci/yaml/#cachepaths).

## Test command (R-CI-06)

Composer defines no canonical test script name. It runs whatever the project declares under `scripts` in `composer.json` through `composer run-script <name>`, so a project that declares `test` there is called as `composer run-script test` and CI gets the same entry point a contributor has.

Where no script is declared, PHPUnit documents its own project-local invocation, `./vendor/bin/phpunit`, after `composer require --dev phpunit/phpunit`. Prefer the declared script when one exists, so the arguments stay in `composer.json` rather than in the pipeline. A repository with `phpunit.xml` and no `scripts.test` entry has a suite and no declared command, which is worth raising as the smaller half of the same question.

Sources: [Composer CLI, run-script](https://getcomposer.org/doc/03-cli.md), [PHPUnit, installation](https://docs.phpunit.de/en/12.0/installation.html).

Verified 2026-07-31 against https://getcomposer.org/doc/03-cli.md, https://getcomposer.org/doc/04-schema.md, https://getcomposer.org/doc/06-config.md, https://docs.phpunit.de/en/12.0/installation.html, https://github.com/docker-library/php, https://github.com/actions/runner-images, and https://docs.gitlab.com/ci/yaml/.
