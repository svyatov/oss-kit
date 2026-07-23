---
name: oss-community
description: "Create the community and governance files an open source project needs: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY.md, issue and pull request templates, CODEOWNERS, FUNDING, and the license file. Use when starting a new open source project, opening a private repo to the public, or when a repo is missing its community health files. Covers GitHub and GitLab. README structure belongs to oss-readme."
license: MIT
---

# Community and governance files

Create the files that tell a newcomer how to contribute, a security researcher how to report a bug, and a forge how to route reviews. The decisions below, what each file must contain, are forge-independent. The schema, path, and filename each forge expects are not, so they live in [references/github.md](references/github.md) and [references/gitlab.md](references/gitlab.md). Read the matching reference file before writing any issue template, CODEOWNERS entry, or FUNDING key; do not write one forge's file by guessing at the other's shape.

A scaffolded file nobody maintains is worse than no file at all. A CODE_OF_CONDUCT.md with a placeholder contact, a SECURITY.md pointing at an address nobody reads, or a CONTRIBUTING.md with setup commands that do not run, each looks like progress and is actually a trap for the next person who trusts it. Gather the facts below before writing anything, and stop to ask when a file needs a fact the repository does not contain.

## Scope

The COM rules below (R-COM-*) belong here: what CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, the issue and change-request templates, CODEOWNERS, and the license file must each contain. The DOC rules split by concern: R-DOC-01 through R-DOC-04, README structure including the paragraph that links to the license, the changelog, and CONTRIBUTING.md, belong to `oss-readme`; R-DOC-05, the sentences in every file this skill creates, belongs to `oss-writing`. R-SEC-04, enforcing CODEOWNERS review as part of branch protection, belongs to `oss-harden`. Do not reorder or rewrite README sections, decide how a file's sentences are phrased, or configure branch protection while working from this skill; note that the project needs it and hand the work to the owning skill.

## Ask rather than invent

Three files fail this skill's job if their content is invented rather than verified:

SECURITY.md needs a channel the maintainer actually monitors and a response time they can actually keep. Read the existing SECURITY.md if one exists, the README's contact or maintainers section, the package manifest's author or maintainers field, and whether the forge is GitHub, where private vulnerability reporting can serve as the channel with no email needed. If none of that surfaces a channel, ask which one the maintainer will use and what response window they will commit to. Never write `security@example.com` or a plausible-looking address that nobody confirmed.

CODE_OF_CONDUCT.md needs a real enforcement contact. Read the same sources: an existing CODE_OF_CONDUCT.md, the README, the package manifest, CODEOWNERS. A template CODE_OF_CONDUCT.md often ships with `[INSERT CONTACT METHOD]` or similar placeholder text still in it; carrying that text forward fails R-COM-03 outright, since the rule treats a dead channel as worse than none. If reading the repository does not surface a name and a reachable address or handle, ask for one.

CONTRIBUTING.md needs the actual local setup, test, and submission commands, not the generic ones for the ecosystem. Read the package manifest's scripts, a Makefile, a Rakefile, or whatever the project already uses to define these, and quote the commands that exist there. If no test command is defined anywhere in the repository, say so instead of inventing one, and ask whether to add one to the project or document that none exists yet.

## Process

### Step 1: Establish whether scaffolding is warranted, and gather facts

Confirm the project accepts outside contributions at all before writing a file that invites them. Check the README for a statement either way, check whether the repository is archived, and ask directly if neither answers it; a project that does not want contributions needs a license and a security policy, not a CONTRIBUTING.md.

Identify the language and ecosystem from the package manifest and source layout, so the license template and the commands quoted in CONTRIBUTING.md match reality. Identify the forge from the git remote or by asking; this decides which reference file governs Steps 6 through 8. Identify whether the repository sits under a personal account or an organization: a personal account has no teams, so a CODEOWNERS entry there must name a `@username` or an email address, never an `@org/team-name`. List the community files that already exist, in every location each forge recognizes, so Steps 2 through 8 extend or replace rather than duplicate them.

### Step 2: License file (R-COM-01)

Read the package manifest's `license` field. If it names a license and no `LICENSE` or `LICENSE.md` file exists, write the matching license's standard text; the text of a license is fixed and not a place to improvise. If the manifest names no license, or the repository ships no package manifest at all, ask which one to use rather than defaulting to MIT or any other license silently. If a `LICENSE` file already exists and disagrees with the manifest, point out the mismatch and ask which one is correct instead of picking one.

### Step 3: CONTRIBUTING.md (R-COM-02)

State the setup command, the test command, and how to open a pull request or merge request, using the commands verified in Step 1's read of the manifest and any build files. Name the actual branch and fork workflow the repository uses; do not describe a generic GitHub flow for a project that requires a different one. Place the file at the repository root unless the project already keeps community files in `.github/` or `docs/` on GitHub, in which case match that convention; GitLab recognizes no alternate location for this file, so keep it at the root there.

### Step 4: CODE_OF_CONDUCT.md (R-COM-03)

Use an established code of conduct, such as the Contributor Covenant, rather than drafting new standards of behavior; the content this skill owns for this file is the enforcement contact, not the community norms. Fill in the contact gathered in the ask-rather-than-invent step above. Confirm no placeholder text survives from the template before finishing. The Contributor Covenant ships its headings in Title Case (Our Pledge, Our Standards, Enforcement Responsibilities), which R-DOC-05 rejects: rewrite every heading in the adopted template to sentence case, keeping proper nouns like Contributor Covenant intact, so the file passes the same prose rule every other file here follows.

### Step 5: SECURITY.md (R-COM-04)

State the private reporting channel gathered above and the response window the maintainer confirmed. Do not state a response window nobody committed to keeping; a generic "we aim to respond within 48 hours" that the maintainer never agreed to is exactly the kind of unmaintained promise this skill exists to avoid. If the forge is GitHub and private vulnerability reporting is not yet enabled on the repository, say what enabling it involves and let the maintainer decide, rather than writing a channel that does not work yet.

### Step 6: Issue and pull or merge request templates (R-COM-05)

Open the reference file for the forge chosen in Step 1 before writing any template; the two forges differ enough here that guessing at the other's shape produces a template the forge will not render. At minimum, ship one issue template and one pull or merge request template. Ask what categories of issue the project wants to distinguish, such as a bug report and a feature request, rather than inventing categories the maintainer did not ask for.

### Step 7: CODEOWNERS (R-COM-06)

Open the matching reference file; GitHub reads CODEOWNERS on every plan, while GitLab's Code Owners feature, including reading this file at all, requires Premium or Ultimate, and only GitLab supports sections and a required approval count within a section. Enforcing CODEOWNERS approval, where the tier allows it, is a branch or merge request protection setting outside this file. Note that setting is needed and hand it to `oss-harden` rather than attempting it here. Every CODEOWNERS file this skill writes needs at least one catch-all `*` rule naming a real owner; ask who that should be if it is not already obvious from the repository's single maintainer or an existing CODEOWNERS file.

### Step 8: FUNDING (optional)

No rule in `STANDARD.md` requires a funding file; only add one if the maintainer wants a sponsor button or funding link, and only list a platform the project is actually registered on. Read `references/github.md` for the accepted keys before writing `.github/FUNDING.yml`; GitLab has no equivalent file.

### Step 9: Present the result

List every file written or proposed, the rule each satisfies, and every fact that came from asking rather than reading, so the maintainer can see what they confirmed. Flag anything left unresolved, such as a CONTRIBUTING.md with no test command because the repository has no tests, rather than silently shipping a gap.

## Rules this skill owns

R-COM-01: The repository ships a license file whose license matches the package manifest

R-COM-02: CONTRIBUTING.md tells a newcomer how to set up, test, and submit a change

R-COM-03: CODE_OF_CONDUCT.md exists and names a working reporting contact

R-COM-04: SECURITY.md states a private reporting channel and a response window

R-COM-05: Issue and change-request templates exist so reports arrive with the facts you need

R-COM-06: A CODEOWNERS file assigns a reviewer to every path
