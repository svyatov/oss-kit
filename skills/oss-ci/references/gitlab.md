# GitLab CI/CD reference

Concrete syntax for the decisions `SKILL.md` makes, written for `.gitlab-ci.yml`. This file covers what runs: pipeline structure, triggers, matrices, caching, timeouts, and cancellation. It does not cover the security posture of the same pipeline, such as pinning `image:` and `include:` to a digest or a SHA, or job token scope; that is `oss-harden`'s reference (R-SEC-06). It does not cover a publish job; that is `oss-publish`'s reference.

Every keyword below was checked against the current GitLab CI/CD YAML reference at `docs.gitlab.com/ci/yaml/` before it was written here. GitLab's closest equivalent to a GitHub Actions `uses:` step is a CI/CD component, reusable pipeline configuration consumed through `include:` with a component path and `inputs:`; components reached general availability in GitLab 17.0. A pipeline can also call project commands directly in `script:`, or reuse plain configuration through `include:`.

## Contents

- [Pipeline structure](#pipeline-structure)
- [Triggers (R-CI-01)](#triggers-r-ci-01)
- [Call project automation, not inline logic (R-CI-02)](#call-project-automation-not-inline-logic-r-ci-02)
- [Test matrix (R-CI-03)](#test-matrix-r-ci-03)
- [Caching keyed on the lockfile (R-CI-04)](#caching-keyed-on-the-lockfile-r-ci-04)
- [Timeout and cancellation of superseded runs (R-CI-05)](#timeout-and-cancellation-of-superseded-runs-r-ci-05)
- [Test reports](#test-reports)
- [Deploying a static site to GitLab Pages](#deploying-a-static-site-to-gitlab-pages)
- [CI/CD variables](#cicd-variables)

## Pipeline structure

A `.gitlab-ci.yml` is a set of jobs, each a top-level key with a `script:`. `stages:` names the stages and their order; jobs run in the stage they declare with `stage:`, and jobs in the same stage run in parallel. If `stages:` is omitted, GitLab uses the default order `.pre`, `build`, `test`, `deploy`, `.post`. `.pre` always runs first and `.post` always runs last regardless of where they appear in the file; a pipeline containing only `.pre` or `.post` jobs does not run, so name at least one job in an ordinary stage.

```yaml
stages:
  - build
  - test
  - deploy

lint:
  stage: test
  script:
    - npm run lint
```

## Triggers (R-CI-01)

Use a top-level `workflow:rules` block to control which events start a pipeline, so it runs on merge requests and on pushes to the default branch without duplicating the run when both happen for the same change:

```yaml
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS
      when: never
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

The second rule skips the branch pipeline while an open merge request already covers the same commits; the third rule keeps the branch pipeline for a direct push to the default branch, where no merge request exists.

A job can also carry its own `rules:` to run only for certain events:

```yaml
test:
  stage: test
  script:
    - npm test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

## Call project automation, not inline logic (R-CI-02)

`SKILL.md` states this policy under Principles. Its shape here is a `script:` naming the project's own command, as the `lint` job above does.

## Test matrix (R-CI-03)

`parallel:matrix` runs one job once per combination of the listed variables, in parallel, within a single pipeline:

```yaml
test:
  stage: test
  parallel:
    matrix:
      - NODE_VERSION: ['20', '22', '24']
  image: node:$NODE_VERSION
  script:
    - npm test
```

## Caching keyed on the lockfile (R-CI-04)

`cache:key:files` generates a new cache key when the content of the named files changes, which is how a GitLab cache stays keyed on the lockfile. It accepts at most two files, and it does not expand CI/CD variables, so name the lockfile paths literally:

```yaml
test:
  stage: test
  script:
    - npm ci --cache .npm --prefer-offline
    - npm test
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - .npm/
```

Cache `.npm/`, not `node_modules`: `npm ci` deletes `node_modules` before installing, so a cache of `node_modules` returns nothing on the next run. `npm ci --cache .npm --prefer-offline` points npm's own cache at a project-local directory GitLab can persist between jobs.

If no cache is found for `cache:key`, GitLab runs the job without a cache. Add `fallback_keys` only when the package manager can validate and safely reuse older download data. GitLab tries up to five fallback keys in order, then a project-wide `CACHE_FALLBACK_KEY`, before running uncached. A fallback must preserve every compatibility boundary in the primary key. Never use a broad fallback for installed dependencies or build outputs.

## Timeout and cancellation of superseded runs (R-CI-05)

A job-level `timeout:` overrides the project-wide default and takes a duration string:

```yaml
test:
  stage: test
  timeout: 10 minutes
  script:
    - npm test
```

Mark a job `interruptible: true` so it is a candidate for cancellation when a newer pipeline supersedes it:

```yaml
test:
  stage: test
  interruptible: true
  script:
    - npm test
```

`workflow:auto_cancel:on_new_commit` is the top-level keyword that turns that candidacy into an actual cancellation when a new commit lands on the same branch:

```yaml
workflow:
  auto_cancel:
    on_new_commit: interruptible
```

`on_new_commit` takes `conservative` (the default: cancel the pipeline only if no `interruptible: false` job has already started), `interruptible` (cancel only jobs marked `interruptible: true`), or `none`. `workflow:rules:auto_cancel` can override it per rule, for example to turn cancellation off on a protected branch. A job left at the `interruptible` default of `false` is never itself cancelled, and under the default `on_new_commit: conservative` it also blocks cancellation of the whole pipeline while it is running, so mark every job that is safe to cancel. Deployment and migration jobs are usually not safe to cancel.

The project setting Auto-cancel redundant pipelines, under Settings > CI/CD > General pipelines, is an older, coarser mechanism that still works alongside these keywords. Prefer the YAML above so the behavior travels with the pipeline definition; mention the project setting in the setup summary only as a fallback for a GitLab version that predates these keywords.

## Test reports

`artifacts:reports:junit` attaches JUnit XML test results to a job so GitLab shows pass and fail counts on the merge request. Point it at the report path the project's own test runner already writes, configured in the project's test config rather than as extra flags bolted onto the CI command, so the `script:` line stays the same command a contributor runs locally:

```yaml
test:
  stage: test
  script:
    - npm test
  artifacts:
    when: always
    reports:
      junit: report.xml
```

`artifacts:reports` also accepts other report types such as `coverage_report` and `dotenv`. `sast` is available on GitLab Free; its advanced features, such as GitLab Advanced SAST cross-file analysis, are gated to Ultimate. `dependency_scanning` and `container_scanning` ship as part of GitLab's paid tiers. Do not add a report type without confirming the project's GitLab tier supports it.

## Deploying a static site to GitLab Pages

No rule in `STANDARD.md` requires a project to publish a site, so nothing below is cited against a rule ID and none of it is a gap in a project that publishes no site. Write a Pages job only where the repository already builds a site and the user asks for it to deploy. Ask in Step 3 rather than inferring the intent from the presence of a static build.

Unlike GitHub, GitLab deploys Pages from a job inside the ordinary pipeline, so this is a job in the existing `.gitlab-ci.yml` rather than a second file. Restrict it to the default branch: a merge request pipeline must not replace what visitors are served.

```yaml
pages:
  stage: deploy
  timeout: 10 minutes
  interruptible: false
  script:
    - npm ci --cache .npm --prefer-offline  # placeholder: the project's own install command
    - npm run build  # placeholder: the project's own build command
  pages:
    publish: dist  # placeholder: the directory the build writes
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

Everything not marked a placeholder is copied exactly: the `pages:` hash with its `publish` key, `interruptible: false`, and the `rules:` condition restricting the job to the default branch. The two `script` commands and the published directory are the only project-specific values here.

`pages:` as a job keyword is what marks a job as a Pages deployment. Setting it to `true` is the short form; the hash form takes `publish` for the built directory and `path_prefix` for parallel deployments under one site. GitLab 17.6 and later accept any job name once the keyword is present, so the job above could be called `deploy-docs`; before that the job had to be named `pages`, which is why so many pipelines still are.

In GitLab 17.10 and later, the `pages.publish` path is appended to `artifacts:paths` automatically, and `public` is appended when `publish` is not set at all. On an older GitLab, name the directory in `artifacts:paths` as well, or the job publishes nothing.

`interruptible: false` is deliberate here and is the one place R-CI-05's cancellation guidance inverts, for the reason the timeout section above gives: a deploy cancelled mid-publish can leave the previous build live. Leave the rest of the pipeline interruptible.

Pages settings that a pipeline cannot set for itself, including the primary domain, a custom domain and its certificate, and access control on a private project, live under Deploy > Pages in the project settings; present them in Step 8 with the resolved project URL rather than changing them.

## CI/CD variables

A pipeline reads a secret from a project CI/CD variable. Add one under Settings > CI/CD > Variables in the project, or with the `glab` CLI:

```bash
glab variable set NPM_TOKEN -v "$NPM_TOKEN" --masked --protected
```

Both flags are off by default. The default is an unmasked, unprotected variable that GitLab prints in full in any job log that echoes it, so name both flags in the command rather than relying on what the form defaults to.

Masking replaces the value with `[MASKED]` in the job log. GitLab masks a value only when it is one line, has no spaces, and is 8 characters or longer. A value that fails those conditions cannot be masked, so change the value rather than dropping the flag. A job that transforms the value before printing it, by escaping or encoding it, defeats the masking either way.

`--protected` restricts the variable to pipelines running on protected branches and protected tags. A merge request pipeline reaches a protected variable only when all three of these hold:

- the source branch and the target branch are both protected
- both branches belong to the same project
- the user who triggered the pipeline can push to the target branch

A merge request from a fork reaches no protected variable, whatever the branches are called. A check that needs the variable on every merge request therefore gives up either the protection or the run on forks. Present that choice in Step 3 rather than shipping a job that fails only for outside contributors.

Take the value from an environment variable or from stdin. A literal on the command line lands in shell history, and `glab variable set SERVER_TOKEN < token.txt` reads the value from a file instead.

List every variable a generated pipeline needs, with the `glab variable set` command to add it, but do not run that command; setting a variable is the project owner's action, not this skill's. Print the command whether or not `glab` is installed here, because the owner runs it on their own machine.
