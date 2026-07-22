---
name: oss-ci
description: "Set up continuous integration for an open source project on GitHub Actions or GitLab CI/CD. Use when the user asks to set up CI, create workflows or pipelines, add automated testing, building, or linting on push and pull requests, or review existing CI configuration. Also use when the user mentions automating tests, running checks on PRs, or a build matrix, even without saying CI. Covers what runs. Security posture of those workflows belongs to oss-harden, and publishing belongs to oss-release."
license: MIT
---

# Continuous integration setup

Decide what runs on push and on every change request, then write it in the syntax the project's forge understands. The decisions in this file are forge-independent: detect the ecosystem, decide what needs to run, choose a matrix, decide caching. The syntax that expresses those decisions is not, so it lives in [references/github-actions.md](references/github-actions.md) for GitHub Actions and [references/gitlab.md](references/gitlab.md) for GitLab CI/CD. Read the matching reference file before writing any configuration; do not write one forge's syntax by translating the other's keywords, because the two have different shapes for triggers, matrices, and caching.

## Scope

This skill owns what runs: which checks execute, on which triggers, across which versions, with what caching. It shares the workflow and pipeline files it writes with two other skills, and the boundary between them is the rule area, not a description of files.

The CI rules below (R-CI-*) belong here. The SEC rules, security posture of the same files such as pinned action SHAs, minimal permissions, dependency updaters, branch protection, and pinned images, belong to oss-harden. The REL rules, publishing a built artifact to a registry with trusted publishing, provenance, and an approval gate, belong to oss-release. Do not add a `permissions:` block, pin a SHA, configure branch protection, or write a publish job while working from this skill; note that the project needs it and hand the work to the owning skill.

## Principles

Verify everything before adding a step, a secret, or a config value: read the actual repository rather than guessing at its shape. Ask when something is uncertain instead of inventing a plausible answer.

Call the project's own automation instead of writing shell logic inside the pipeline. A step that runs `npm test` instead of `jest --coverage --ci` keeps the pipeline and a contributor's laptop running the same command, which is what R-CI-02 checks for. When no such automation exists, ask whether to add it to the project or fall back to inline commands.

Present policy choices instead of guessing at them, even when the repository already contains tests, a Dockerfile, or a pipeline. What runs on a change request, what triggers a release build, and how deployment happens are decisions the user makes; code only tells you what is possible, not what is wanted.

## Process

### Step 1: Detect the forge

Look for an existing `.github/workflows/` directory or `.gitlab-ci.yml` file, check the git remote for a github.com or gitlab host, or ask directly if neither signal is present. This decides which reference file governs Steps 6 and 7. If the user states the forge explicitly, trust that over any signal found in the repository.

### Step 2: Analyze the repository

Identify the language and runtime from source files and the package manifest, and note the version range the project claims to support; the matrix in Step 4 has to cover all of it, including the oldest and newest supported version, per R-CI-03.

Find the lint, test, and build commands the project already defines, whether that is package manager scripts, a Makefile, a Rakefile, or a tool like tox or just, and read them closely enough to know their arguments and side effects. If the repository has a CONTRIBUTING guide, the commands there are authoritative; the pipeline must call the same strings, per R-CI-02.

Read any existing CI configuration before changing it, so you know whether to extend it or replace it.

Identify the lockfile the project commits, such as `package-lock.json`, `Gemfile.lock`, `poetry.lock`, or `Cargo.lock`; Step 5 keys the cache on it.

Find `.env.example` and search the source for required environment variables, so a step needing a secret is identified before generation rather than after a failed run.

### Step 3: Present findings and ask

Summarize what Step 2 found, then ask about the choices code alone cannot answer: what should run on a pull or merge request, what should trigger a release build, and whether existing CI should be extended or replaced. Ask only what applies to this project; a project with no Dockerfile gets no question about a registry.

### Step 4: Choose the matrix

Build the version matrix from the range identified in Step 2, not from a single pinned version. A project with no stated support range gets a single-version pipeline instead of an invented matrix; do not manufacture support claims the manifest does not make.

### Step 5: Decide caching

Cache dependencies keyed on the lockfile identified in Step 2, with a fallback key so a changed lockfile still restores from the closest prior cache instead of starting cold, per R-CI-04. A project with no lockfile, such as one with no external dependencies, gets no cache step.

### Step 6: Write the configuration

Open the reference file for the forge chosen in Step 1 and follow its syntax exactly. Both reference files cover triggering on push to the default branch and on every change request (R-CI-01), a timeout on every job with cancellation of superseded runs on the same branch (R-CI-05), and the cache key shape from Step 5 (R-CI-04). Neither reference file covers permissions, SHA pinning, or publishing; those stay out of the file you write here.

### Step 7: Validate before presenting

Confirm the configuration is syntactically valid for the target forge and that every command it calls exists in the repository. List any secrets the pipeline needs, with the command to add each one, without running that command. Confirm the matrix matches the supported version range and that every job carries a timeout and participates in cancellation of superseded runs.

### Step 8: Present the result

Show the generated file, a short summary of what was detected and decided, the list of secrets to configure, and anything left for the user to set at the repository or project level, such as branch protection or environment approvers, naming the skill that owns it rather than attempting it here.

## Rules this skill owns

R-CI-01: CI runs on every push to the default branch and on every change request

R-CI-02: CI runs the same lint, test, and build commands the contributing guide gives to humans

R-CI-03: The test matrix covers every runtime version the project claims to support

R-CI-04: Dependency caches are keyed on the lockfile

R-CI-05: Every job has a timeout, and superseded runs for the same branch are cancelled
