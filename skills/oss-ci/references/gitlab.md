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
  - lint
  - test
  - build
  - deploy

lint:
  stage: lint
  script:
    - npm run lint
```

## Triggers (R-CI-01)

Use a top-level `workflow:rules` block to control which events start a pipeline, so it runs on merge requests and on pushes to the default branch without duplicating the run when both happen for the same change:

```yaml
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

The second rule admits every default-branch push, including when that branch has an outgoing merge request. Feature-branch pushes match neither rule, so they do not duplicate merge request pipelines.

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

`cache:key:files` hashes the contents of the listed paths. Use up to two literal lockfile paths for portability. GitLab 19.5 introduced a ten-path limit behind `increase_ci_cache_key_files_limit`, disabled by default. Confirm instance support before using more than two paths. CI/CD variables do not expand here.

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

With `conservative` (default), pending jobs count as interruptible until they start. Once a job with `interruptible: false` starts, the pipeline is protected from auto-cancellation. With `interruptible`, GitLab cancels only jobs marked `interruptible: true`. With `none`, it leaves the pipeline running. Use `workflow:rules:auto_cancel` for branch-specific overrides. Keep deployments and migrations non-interruptible when stopping them could leave partial changes.

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
  stage: deploy  # placeholder: an existing deployment stage, or add it to stages
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

Keep `interruptible: false` and the default-branch rule. Adapt the commands, output directory, and deployment stage to the project. Use Pages syntax for the target GitLab version:

- **17.10 and later:** Use `pages.publish` as shown. GitLab adds the published directory to `artifacts:paths` automatically.
- **17.9:** Use `pages.publish` and list the same directory under `artifacts:paths`.
- **Before 17.9:** Use a job named `pages`, place the built site in `public/`, and list `public` under `artifacts:paths`. Omit the nested `pages` keyword.

Validate the job with CI Lint on the target instance.

`interruptible: false` is deliberate here and is the one place R-CI-05's cancellation guidance inverts, for the reason the timeout section above gives: a deploy cancelled mid-publish can leave the previous build live. Leave the rest of the pipeline interruptible.

Pages settings that a pipeline cannot set for itself, including the primary domain, a custom domain and its certificate, and access control on a private project, live under Deploy > Pages in the project settings; present them in Step 8 with the resolved project URL rather than changing them.

## CI/CD variables

A pipeline reads a secret from a project CI/CD variable. Add one under Settings > CI/CD > Variables in the project, or with the `glab` CLI:

```bash
glab variable set NPM_TOKEN -v "$NPM_TOKEN" --masked --protected
```

Both flags are off by default. The default is an unmasked, unprotected variable that GitLab prints in full in any job log that echoes it, so name both flags in the command rather than relying on what the form defaults to.

Masking replaces the value with `[MASKED]` in the job log. GitLab masks a value only when it is one line, has no spaces, and is 8 characters or longer. A value that fails those conditions cannot be masked, so change the value rather than dropping the flag. A job that transforms the value before printing it, by escaping or encoding it, defeats the masking either way.

Protected variables are available on protected branches and tags. For a merge request pipeline, check every condition:

- the project enables **Allow merge request pipelines to access protected variables and runners** (GitLab 18.1 and later)
- the source branch and the target branch are both protected
- both branches belong to the same project
- the triggering user can push or merge into the target branch

A merge request from a fork reaches no protected variable, whatever the branches are called. A check that needs the variable on every merge request therefore gives up either the protection or the run on forks. Present that choice in Step 3 rather than shipping a job that fails only for outside contributors.

Take the value from an environment variable or from stdin. A literal on the command line lands in shell history, and `glab variable set SERVER_TOKEN < token.txt` reads the value from a file instead.

List every variable a generated pipeline needs, with the `glab variable set` command to add it, but do not run that command; setting a variable is the project owner's action, not this skill's. Print the command whether or not `glab` is installed here, because the owner runs it on their own machine.
