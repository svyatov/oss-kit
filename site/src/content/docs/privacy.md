---
title: Privacy
description: What data oss-kit and this site collect, send, and keep.
---

oss-kit collects no data. It has no server, no account, no telemetry, and no
analytics, and it keeps nothing about you or your repositories.

## The skills

The skills are instructions and reference files that your agent reads. They
run inside your agent, on your machine or wherever your agent runs, under your
agent's own privacy terms. Installing the kit runs nothing.

When you ask for a job, a skill tells your agent to read your repository and to
run `gh` or `glab` against it. Those tools talk to GitHub or GitLab with the
credentials they already hold, and nothing they send passes through this
project.

Two bundled scripts reach the network, both in `oss-harden`:

- `scripts/resolve-pin.mjs` reads tags and commits from `api.github.com` to pin
  an action to a commit SHA. It sends `GH_TOKEN` or `GITHUB_TOKEN` to that host
  when one is set, only to raise the rate limit.
- `scripts/ruleset.mjs` reads and writes a repository ruleset through `gh`.

Every other bundled script reads local files only.

## This site

This site is static and hosted on GitHub Pages. It sets no cookies and loads
no analytics or third-party scripts. GitHub records the requests it serves, as
its own [privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
describes.

## Contact

Ask about this policy in
[GitHub Discussions](https://github.com/svyatov/oss-kit/discussions), or email
leonid@svyatov.com.
