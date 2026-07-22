# GitLab CI/CD reference

Concrete syntax for the decisions `SKILL.md` makes, written for `.gitlab-ci.yml`. This file covers what runs: pipeline structure, triggers, matrices, caching, timeouts, and cancellation. It does not cover the security posture of the same pipeline, such as pinning `image:` and `include:` to a digest or a SHA, or job token scope; that is `oss-harden`'s reference (R-SEC-06). It does not cover a publish job; that is `oss-release`'s reference.

Every keyword below was checked against the current GitLab CI/CD YAML reference at `docs.gitlab.com/ci/yaml/` before it was written here. GitLab has no direct equivalent of a GitHub Actions `uses:` step; a pipeline calls project commands directly in `script:`, or reuses configuration through `include:`.

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

`cache:key:files` generates a new cache key when the content of the named files changes, which is how a GitLab cache stays keyed on the lockfile:

```yaml
test:
  stage: test
  script:
    - npm ci
    - npm test
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - node_modules
```

Unlike `actions/cache` on GitHub, `cache:key:files` needs no separate restore-key entry: GitLab falls back to the closest prior cache for the same key prefix automatically when no exact match exists.

## Timeout and cancellation of superseded runs (R-CI-05)

A job-level `timeout:` overrides the project-wide default and takes a duration string:

```yaml
test:
  stage: test
  timeout: 10 minutes
  script:
    - npm test
```

Mark a job `interruptible: true` so it can be cancelled if a newer pipeline supersedes it:

```yaml
test:
  stage: test
  interruptible: true
  script:
    - npm test
```

`interruptible: true` alone is not enough. GitLab only cancels a superseded pipeline when the project setting Auto-cancel redundant pipelines is also enabled, under Settings > CI/CD > General pipelines; this setting lives in the project, not in `.gitlab-ci.yml`, so name it in the setup summary rather than trying to express it as YAML. A single job left at the `interruptible` default of `false` makes the entire pipeline non-interruptible, so mark every job that is safe to cancel, not just one.

## Test reports

`artifacts:reports:junit` attaches JUnit XML test results to a job so GitLab shows pass and fail counts on the merge request, matching what R-CI-02 asks for: a pipeline that surfaces the same result a contributor sees locally.

```yaml
test:
  stage: test
  script:
    - npm test -- --reporter junit --output-file report.xml
  artifacts:
    when: always
    reports:
      junit: report.xml
```

`artifacts:reports` also accepts other report types such as `coverage_report` and `dotenv`. Several report types, including `sast`, `dependency_scanning`, and `container_scanning`, ship as part of GitLab's paid tiers rather than through this skill; do not add one without confirming the project's GitLab tier supports it.
