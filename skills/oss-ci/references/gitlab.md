# GitLab CI/CD reference

Concrete syntax for the decisions `SKILL.md` makes, written for `.gitlab-ci.yml`. This file covers what runs: pipeline structure, triggers, matrices, caching, timeouts, and cancellation. It does not cover the security posture of the same pipeline, such as pinning `image:` and `include:` to a digest or a SHA, or job token scope; that is `oss-harden`'s reference (R-SEC-06). It does not cover a publish job; that is `oss-release`'s reference.

Every keyword below was checked against the current GitLab CI/CD YAML reference at `docs.gitlab.com/ci/yaml/` before it was written here. GitLab's closest equivalent to a GitHub Actions `uses:` step is a CI/CD component, reusable pipeline configuration consumed through `include:` with a component path and `inputs:`; components reached general availability in GitLab 17.0. A pipeline can also call project commands directly in `script:`, or reuse plain configuration through `include:`.

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

The same rule applies as on GitHub Actions: a job's `script:` should call the command a contributor runs locally and that `CONTRIBUTING.md` documents, not a longer invocation with extra flags baked in.

```yaml
test:
  stage: test
  script:
    - npm test
```

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

Include the oldest and the newest version the manifest claims to support; do not add or drop a version the manifest does not mention.

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
    fallback_keys:
      - npm-default
```

Cache `.npm/`, not `node_modules`: `npm ci` deletes `node_modules` before installing, so a cache of `node_modules` returns nothing on the next run. `npm ci --cache .npm --prefer-offline` points npm's own cache at a project-local directory GitLab can persist between jobs.

If no cache is found for `cache:key`, GitLab runs the job without a cache; there is no automatic fallback to the closest prior key. `cache:fallback_keys` is what makes a fallback happen: up to five keys, tried in the listed order, before the job falls back to running uncached. A project-wide `CACHE_FALLBACK_KEY` variable is also available and is tried last, after `cache:key` and every entry in `fallback_keys`.

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
    on_job_failure: all
```

`on_new_commit` takes `conservative` (the default: cancel the pipeline only if no `interruptible: false` job has already started), `interruptible` (cancel only jobs marked `interruptible: true`), or `none`. `on_job_failure` takes `all` (cancel the rest of the pipeline as soon as one job fails) or `none`, and defaults to `none`. `workflow:rules:auto_cancel` overrides either value per rule, for example to turn cancellation off on a protected branch. A job left at the `interruptible` default of `false` is never itself cancelled, and under the default `on_new_commit: conservative` it also blocks cancellation of the whole pipeline while it is running, so mark every job that is safe to cancel, not just one.

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
