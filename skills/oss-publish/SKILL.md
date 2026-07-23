---
name: oss-publish
description: "Set up a secure release process for an open source package so no long-lived publishing token exists to steal. Covers trusted publishing with OIDC, build provenance, and approval-gated release workflows for npm, RubyGems, PyPI, and crates.io on both GitHub Actions and GitLab CI/CD. Use for any request to publish a package, secure or harden a release process, set up trusted publishing or provenance, or create a release workflow."
license: MIT
---

# Secure package publishing

Set up a release process where no registry token exists to steal, releases can come only from one CI workflow triggered by a tag, and a human still approves each one before it reaches the public registry. The decisions below are the same regardless of registry: gather the facts, configure trusted publishing, write a hardened workflow, gate it on approval, verify provenance. The exact fields a registry's trusted publisher form asks for, and the exact YAML a workflow needs, differ by registry and by forge, so that detail lives in one reference file per registry: [references/npm.md](references/npm.md), [references/rubygems.md](references/rubygems.md), [references/pypi.md](references/pypi.md), and [references/crates.md](references/crates.md). Each reference file covers both GitHub Actions and GitLab CI/CD. Read the matching file before writing any configuration or giving any settings instruction; do not carry a flow, a field name, or a workflow snippet from one registry or forge to another by analogy.

## How to run this skill

Half of this setup is repository files, which this skill writes directly. The other half is settings on the registry's website and on the forge that only the user can change: the trusted publisher entry, the approval environment, account-level two-factor authentication, tag protection. For that half, give click-by-click instructions with direct links resolved from the repository's own data: the package, gem, or crate name from its manifest, the owner and repository from the forge remote or the manifest's repository field, never a placeholder like "go to your package settings". Present each settings block, wait for the user to confirm it is done, then verify what can be verified from the command line before moving to the next block.

## Principles

Verify every registry and forge claim against the current documentation before writing it into a repository. A wrong trusted publishing flow is worse than a missing one: it either fails at publish time or, if papered over with a long-lived token, defeats the entire point of this skill. Where a registry and forge combination has no supported trusted publishing flow, say so plainly and give the documented fallback; do not invent a flow to fill the gap.

Present policy choices instead of guessing at them, even when the repository already contains a release workflow or a stored token. Which cooldown to use, whether to keep an existing publish step, and how much of an existing workflow to carry over are decisions the user makes.

## Process

### Step 1: Gather repo facts

Detect the ecosystem from the manifest the repository ships: `package.json` for npm, a `*.gemspec` for RubyGems, `pyproject.toml` or `setup.cfg` or `setup.py` for PyPI, `Cargo.toml` for crates.io. A repository can ship more than one package; enumerate every publishable one, since trusted publisher entries and approval environments are configured per package, not per repository.

Collect, from the manifest and the repository, before changing anything: the package, gem, or crate name; the owner and repository, from the manifest's own repository or source metadata first, falling back to the git remote; whether the owner is an organization or a personal account, since that changes the two-factor instructions and whether an approval environment is available; whether the package is already published, since an unpublished package needs a different first-release path; the existing tag format from `git tag --sort=-creatordate | head`, keeping whatever format is already in use; and any existing release workflow or pipeline, especially one referencing a stored registry token, which this skill's changes should remove.

Detect the forge the same way `oss-ci` does: look for `.github/workflows/` or `.gitlab-ci.yml`, check the git remote host, or ask directly if neither signal is present. If the user states the forge explicitly, trust that over any signal found in the repository.

Route to the matching reference file now, using the table at the end of this file. If the detected manifest does not match npm, RubyGems, PyPI, or crates.io, say so plainly: name the ecosystem found and state that this skill has no reference file for it, rather than improvising a publishing flow for an unsupported registry.

### Step 2: Configure trusted publishing

Open the matched reference file and read the section for the detected forge. Every reference file states, for each forge it covers, either the exact fields the registry's trusted publisher form asks for and the exact permission or `id_tokens` block the workflow needs, or, where the combination has no supported flow, a gap section naming that plainly and giving the strongest documented fallback. Give the user the resolved settings URL and the exact field values from the gathered facts; do not proceed to Step 3 until the user confirms the trusted publisher, or the fallback credential, is in place.

### Step 3: Write a hardened release workflow

Trigger the workflow on a version tag, matching the format found in Step 1. Isolate the publish job: it installs no dependencies beyond what publishing itself needs, uses no dependency cache, and calls no third-party action beyond what the reference file names, because anything running in a job that can authenticate to the registry can publish the package. Build the artifact in a separate job and hand it to the publish job as a workflow artifact, so build-time dependencies never run in the job that holds publish credentials. Ask before overwriting an existing release workflow, and carry over any extras the project relies on, such as changelog generation or forge release notes, into a job that has neither the publish credential nor `id-token: write`.

### Step 4: Gate on manual approval with two-factor authentication

Pin the publish job to a GitHub environment with required reviewers, or a GitLab protected environment with a manual job and approval rules, naming at least one approver who is not an automation account. This is the gate R-PUB-04 checks for, and it applies the same way regardless of registry. Where the registry itself offers an additional human gate, such as npm's staged publishing with a two-factor approval step, layer it on top of the environment gate rather than in place of it; the reference file for that registry says so explicitly where it applies.

### Step 5: Verify provenance after the first release

Once the first tag-triggered release runs, verify what the reference file says to verify: that the registry served an attestation or provenance record for the published version, using the command or the URL the reference file gives. A release that reaches the registry without provenance means Step 3 or Step 4 was skipped somewhere, not that provenance is optional.

## Scope

This skill owns publishing: trusted publishing, build provenance, and the human approval gate on the release workflow, the R-PUB rules below. It writes into the same workflow and pipeline files as two other skills, and the boundary between them is the rule area, not a description of files. `oss-ci` decides what runs on push and on every change request, including the test job this skill's publish job depends on; it does not decide how the publish job authenticates or who approves it. `oss-harden` owns the security posture of the same files: pinning third-party actions to a commit SHA, minimal workflow permissions, dependency updates, branch protection, and signed tags; it does not decide when a job runs or how a package is published. Do not pin an action to a SHA, add an unrelated `permissions:` scope, or configure branch protection from this skill; note that the project needs it and hand the work to `oss-harden`.

## Routing table

| Ecosystem | Manifest signal | Reference file |
| --- | --- | --- |
| npm | `package.json` | [references/npm.md](references/npm.md) |
| RubyGems | `*.gemspec` | [references/rubygems.md](references/rubygems.md) |
| PyPI | `pyproject.toml`, `setup.cfg`, or `setup.py` | [references/pypi.md](references/pypi.md) |
| crates.io | `Cargo.toml` | [references/crates.md](references/crates.md) |

## Rules this skill owns

R-PUB-01: Publishing happens in CI, triggered by a tag, never from a developer machine

R-PUB-02: The publish job authenticates to the registry with trusted publishing, not a stored token

R-PUB-03: Published artifacts carry build provenance

R-PUB-04: A human approves the run before anything reaches a public registry
