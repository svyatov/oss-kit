---
name: oss-publish
description: "Set up secure package and container releases with trusted publishing, approval gates, provenance, SBOMs, and signed artifacts."
disable-model-invocation: true
license: MIT
---

# Secure package publishing

Set up CI releases with trusted publishing, a release tag, and a human approval gate. The workflow may receive the tag or create it during release automation. Gather the facts, configure authentication, prepare the workflow, gate publication, and verify provenance. Registry fields and workflow syntax differ by ecosystem and forge. Read the matching file before writing configuration or giving settings instructions: [npm](references/ecosystems/npm.md), [pypi](references/ecosystems/pypi.md), [rubygems](references/ecosystems/rubygems.md), [crates](references/ecosystems/crates.md), [go-modules](references/ecosystems/go-modules.md), [packagist](references/ecosystems/packagist.md), [nuget](references/ecosystems/nuget.md), [maven-central](references/ecosystems/maven-central.md), [hex](references/ecosystems/hex.md), [pubdev](references/ecosystems/pubdev.md), or [containers](references/ecosystems/containers.md). Each covers both forges and identifies unsupported steps. Do not infer one ecosystem's publication flow from another.

Two of the eleven run on the tag-published track, where the registry reads the forge instead of taking an upload: Go modules and Packagist. There is no publish credential on that track at all, so R-PUB-01 through R-PUB-04 do not reach it and R-PUB-07 does. `STANDARD.md`'s release preamble is what assigns the track, and each of those two files states it at the top.

## How to run this skill

Prepare repository files and give settings instructions with values resolved from the manifest and forge remote. Include the trusted publisher, approval environment, two-factor authentication, and tag protection. Continue preparing files while settings await confirmation. Verify the settings and obtain Step 2's confirmation before the first action that can trigger publication or before reporting completion.

## Principles

Verify every registry and forge claim against the current documentation before writing it into a repository. A wrong trusted publishing flow is worse than a missing one: it either fails at publish time or, if papered over with a long-lived token, defeats the entire point of this skill. Where a registry and forge combination has no supported trusted publishing flow, say so plainly and give the documented fallback; do not invent a flow to fill the gap.

A registry's documentation is not proof that a command still exists. Before handing a maintainer a command to run, confirm its flags parse against the client that will run it: `<tool> help <subcommand>` where the toolchain is installed, or that subcommand's source in the client's own repository where it is not. Where neither is available, say the command is unverified rather than presenting it as checked, and do not install a language toolchain to settle it unless the maintainer agrees. This is not hypothetical. This skill shipped a hex.pm key-generation command that the Hex client had removed a release earlier, and every re-verification passed, because hex.pm's own guide still documented it: reading the vendor's documentation confirmed the vendor's error. `references/ecosystems/hex.md` carries the case.

When a registry's documentation and its client disagree, that is a defect in the registry, not a puzzle to work around. Name which two sources disagree and what you ran to establish it. Do not improvise a substitute credential path, do not extract an undocumented on-disk token, and do not pin around the version where it last worked. Offer to report it upstream, and write the issue with `oss-writing`.

Configure one publication gate by default. Additional gates remain valid, but they add another human action to every release. In an established release flow, preserve every configured gate, report the human actions it requires, and recommend the default path. Change those gates only after the maintainer accepts the migration.

Present other policy choices instead of guessing at them, even when the repository already contains a release workflow or a stored token. Which cooldown to use, whether to keep an existing publish step, and how much of an existing workflow to carry over are decisions the user makes.

## The shape of a release workflow

One vocabulary, across all eleven ecosystems and both forges. A maintainer who reads two of these repositories should not have to work out that `pack` and `build` are the same job, and a form field that is always the same string is one nobody has to discover. This is a convention, not a rule: no `STANDARD.md` rule scores a job name, and none should, because failing a repository over a word is a cost with no security or correctness argument behind it. Follow it in what you write; do not rename a working job in a repository that already has one unless the user asks.

| | value |
| --- | --- |
| File | `.github/workflows/release.yml`, or the release section of `.gitlab-ci.yml` |
| Workflow name | `Release` |
| Trigger | push of tags matching `v*` |
| Environment | `release` |

Job names come from a fixed set, and a job appears only where the ecosystem needs one:

| Job | When it appears |
| --- | --- |
| `test` | always |
| `build` | where the artifact can be built separately from the push |
| `publish` | always |
| `github-release` | where the release attaches assets to a forge release |

`release` names the file, the trigger, and the environment, so it does not also name a job. Where an ecosystem departs from any of this, its reference file says so in one line and gives the reason, so a difference reads as a decision rather than as drift. Two departures are structural and both are recorded where they apply: the tag-published track keeps its release job inside the `CI` workflow, because pushing the tag is the publish; and Hex has no `build` job, because `mix hex.publish` builds the tarball it uploads and accepts no prebuilt path.

## Process

### Step 1: Gather repo facts

Detect the ecosystem from what the repository ships, using the signals in the routing table at the end of this file. A repository can ship more than one publishable thing; enumerate every one, since trusted publisher entries and approval environments are configured per package, not per repository. Container images stack rather than replace: a Go module or an npm package can also ship an image, so `containers` runs alongside the manifest-detected ecosystem rather than instead of it.

Detect what the repository ships, not what it merely contains. A manifest present only for a documentation site or a development dependency is not a published package, and a Dockerfile that builds a test harness is not a published image, so neither pulls this skill in. The signal for a container image is a workflow step pushing to a registry, or an image that already exists on the forge's registry.

Collect, from the manifest and the repository, before changing anything: the package, gem, or crate name and version; the owner and repository, from the manifest's own repository or source metadata first, falling back to the git remote; repository visibility and forge plan, since approval protection is not available on every plan; whether the owner is an organization or a personal account; whether the package is already published, since an unpublished package may need a different first-release path; the existing tag format from `git tag --sort=-creatordate | head`, keeping whatever format is already in use; and any existing release workflow or pipeline, especially one referencing a stored registry token, which this skill's changes should remove.

Identify each release flow. One tag or release event can publish several packages when they version and ship together. Independently tagged packages are separate flows. Include every public release asset in the flow's inventory. Inventory every forge and registry approval each flow already requires before proposing a change.

Detect the forge the same way `oss-ci` does: look for `.github/workflows/` or `.gitlab-ci.yml`, check the git remote host, or ask directly if neither signal is present. If the user states the forge explicitly, trust that over any signal found in the repository.

Route to the matching reference file now, using the table at the end of this file. If what the repository ships matches none of the eleven rows there, say so plainly: name the ecosystem found and state that this skill has no reference file for it, rather than improvising a publishing flow for a registry nobody has read the documentation of.

### Step 2: Configure trusted publishing

Open the matched reference file and read the section for the detected forge. Every reference file states, for each forge it covers, either the exact fields the registry's trusted publisher form asks for and the exact permission or `id_tokens` block the workflow needs, or, where the combination has no supported flow, a gap section naming that plainly and giving the strongest documented fallback.

Most of those forms ask for a workflow filename and an environment name, which are what Steps 3 and 4 produce. Do not wait for them and do not go looking for them: the reference file states both, so every field is resolvable now. Give the user the settings URL with all of them filled in, as this step's own message rather than as an item in a later summary, and carry on to Step 3 without waiting.

Identify the actual publication trigger before enabling the workflow. A tag workflow starts on a tag push; release automation may publish after a default-branch merge, push, or manual dispatch. Confirm the trusted publisher or fallback credential before that first triggering action. State the pending action beside the settings form. Prepare reviewable files without enabling publication while confirmation is pending.

### Step 3: Write a hardened release workflow

Use the existing release tool's trigger, or a version-tag trigger matching Step 1. For tag-triggered builds, fail when tag and manifest versions disagree. For release automation, verify the version and generated tag before publication. Isolate the publish job: use only a verified, version-locked publishing client and the actions named in the ecosystem reference. Give it no dependency cache. Build and verify the artifact separately, then transfer that artifact when the registry accepts prebuilt packages. Cargo and Hex rebuild during publication; container provenance needs the pushed digest. Follow the reference's safeguards for those exceptions. Ask before replacing an existing workflow. Preserve release-note generation outside jobs holding the registry credential or attestation identity.

### Step 4: Gate on manual approval with two-factor authentication

Choose the last enforced publication gate that covers the complete release flow, including public release assets. A registry gate qualifies only when the CI identity cannot approve its own staged artifact. It must also approve every package in the flow with one human action. npm staged publishing qualifies for one package with no public forge assets. When that flow also publishes forge assets, use one forge gate before direct package publication and asset upload.

Where a registry gate qualifies, use it as the default. Keep any forge environment binding that forms part of the publisher identity, but configure no required reviewer there. Where no registry gate qualifies, pin the publish job to a GitHub environment with required reviewers. On GitLab, use a protected environment with one blocking manual job. Set `when: manual` and `allow_failure: false`, and restrict deployment permission to at least one person who is not an automation account.

Check feature availability before writing the workflow. The ecosystem reference names the plan each gate needs. Do not simulate a missing native gate with an unverified third-party approval action. If the forge plan provides no native gate and the registry has no qualifying gate, report R-PUB-04 as unmet.

Additional gates still satisfy R-PUB-04. If a release flow already has more than one, report each human action and suggest the one-gate default. Do not remove or weaken an established gate until the maintainer accepts that change.

### Step 5: Verify provenance after the first release

After the first release, verify the published artifact against the repository and workflow using the reference's registry record or forge attestation. Record unsupported verification as a gap. OIDC authentication and a successful publish do not establish build provenance.

### Step 6: Describe and sign what the release ships (R-PUB-05, R-PUB-06)

This step applies when the release attaches built assets; forge-generated source archives do not qualify. Generate an SPDX or CycloneDX inventory of the exact assets in the unprivileged build job. Transfer the inventory and assets to a separate gated job for signing, attestation, and upload. Sign each asset or a manifest of its hashes. Prefer the forge's attestation when it covers those exact bytes; use `actions/attest` for new GitHub workflows. Otherwise identify the verification key and where consumers obtain it. Follow documented ecosystem exceptions where the build and publish boundary cannot be separated. A source-tree SBOM does not establish a binary's contents.

### Step 7: Verify before reporting done

Apply the R-PUB checks resolved at entry to the workflow, registry configuration, and released artifact. Fix failures and restart after each fix. Report unavailable checks explicitly. Report platform limitations as unmet with the reason, never as passed.

## Scope

The PUB rules belong here: R-PUB-01 publishing in CI tied to a release tag, R-PUB-02 trusted publishing, R-PUB-03 build provenance, R-PUB-04 human approval, R-PUB-05 artifact inventory, R-PUB-06 signed assets, and R-PUB-07 tag-published registry updates.

Use this skill's quoted checks from `oss-audit-report.md` when supplied. Otherwise resolve `../oss-audit/STANDARD.md` from this installed skill's directory before editing. If neither source exists, follow the request and report standard verification as unavailable. Use the same resolved checks at completion; supplied checks do not establish unlisted rules.

This skill owns publishing: trusted publishing, build provenance, the human approval gate on the release workflow, and what a release attaches alongside a built asset. It writes into the same workflow and pipeline files as two other skills, and the boundary between them is the rule area, not a description of files. `oss-ci` decides what runs on push and on every change request, including the test job this skill's publish job depends on; it does not decide how the publish job authenticates or who approves it. `oss-harden` owns the security posture of the same files: pinning third-party actions to a commit SHA, minimal workflow permissions, dependency updates, branch protection, and signed tags; it does not decide when a job runs or how a package is published. Do not pin an action to a SHA, add an unrelated `permissions:` scope, or configure branch protection from this skill; note that the project needs it and hand the work to `oss-harden`.

That hand-off assumes `oss-harden` still has a turn coming. Check whether it does. Where it has already run on this repository, handing off means the pins never happen, and this skill has just added unpinned `uses:` lines to the one workflow that authenticates to a registry. In that case pin what this skill added, to the same standard `oss-harden` uses, and say in the report that you did and why. The boundary exists so two skills do not fight over one line, not so a line ends up unpinned.

`oss-writing` is not one of those hand-offs. It owns no rule area and takes no work over, so nothing here is handed to it. Read it before writing a branch name, a commit message, a change request title or description, or an issue, which is all of what this skill leaves behind on the forge.

## Routing table

The signals below come from `skills/oss-audit/ecosystems.json`, which is the canonical copy. Where this table and that file disagree, the roster wins.

| Ecosystem | Signal | Track | Reference file |
| --- | --- | --- | --- |
| npm | `package.json` | registry push | [references/ecosystems/npm.md](references/ecosystems/npm.md) |
| PyPI | `pyproject.toml`, `setup.py`, or `setup.cfg` | registry push | [references/ecosystems/pypi.md](references/ecosystems/pypi.md) |
| RubyGems | `*.gemspec` or `Gemfile` | registry push | [references/ecosystems/rubygems.md](references/ecosystems/rubygems.md) |
| crates.io | `Cargo.toml` | registry push | [references/ecosystems/crates.md](references/ecosystems/crates.md) |
| Go modules | `go.mod` | tag published | [references/ecosystems/go-modules.md](references/ecosystems/go-modules.md) |
| Packagist | `composer.json` | tag published | [references/ecosystems/packagist.md](references/ecosystems/packagist.md) |
| NuGet | `*.csproj`, `*.fsproj`, or `*.vbproj` | registry push | [references/ecosystems/nuget.md](references/ecosystems/nuget.md) |
| Maven Central | `pom.xml`, `build.gradle`, or `build.gradle.kts` | registry push | [references/ecosystems/maven-central.md](references/ecosystems/maven-central.md) |
| Hex | `mix.exs` | registry push | [references/ecosystems/hex.md](references/ecosystems/hex.md) |
| pub.dev | `pubspec.yaml` | registry push | [references/ecosystems/pubdev.md](references/ecosystems/pubdev.md) |
| Container images | a workflow pushing to a registry, or an existing image on the forge's registry | registry push | [references/ecosystems/containers.md](references/ecosystems/containers.md) |
