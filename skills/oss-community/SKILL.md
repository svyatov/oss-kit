---
name: oss-community
description: "Create the community and governance files an open source project needs: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY.md, issue forms and pull request templates, CODEOWNERS, FUNDING, and the license file, and set the forge project's description, topics, and homepage. Use when starting a new open source project, opening a private repo to the public, when a repo is missing its community health files, or when its issue templates collect reports that still cannot be triaged. Covers GitHub and GitLab. README structure belongs to oss-readme."
license: MIT
---

# Community and governance files

Create the files that tell a newcomer how to contribute, a security researcher how to report a bug, and a forge how to route reviews, and set the handful of forge settings that decide what a stranger sees before any of those files. The decisions below, what each file must contain, are forge-independent. The schema, path, filename, and setting each forge expects are not, so they live in [references/github.md](references/github.md) and [references/gitlab.md](references/gitlab.md). Read the matching reference file before writing any issue template, CODEOWNERS entry, or FUNDING key, or changing any project setting; do not write one forge's file by guessing at the other's shape.

A scaffolded file nobody maintains is worse than no file at all. A CODE_OF_CONDUCT.md with a placeholder contact, a SECURITY.md pointing at an address nobody reads, or a CONTRIBUTING.md with setup commands that do not run, each looks like progress and is actually a trap for the next person who trusts it. Gather the facts below before writing anything, and stop to ask when a file needs a fact the repository does not contain.

## Scope

The COM rules below (R-COM-*) belong here: what CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, the issue and change-request templates, CODEOWNERS, and the license file must each contain, and the forge project's own description, topics, and homepage. The DOC rules split by concern: R-DOC-01 through R-DOC-04 and R-DOC-06 through R-DOC-10, README structure including the paragraph that links to the license, the changelog, and CONTRIBUTING.md, belong to `oss-readme`; R-DOC-05, the sentences in every file this skill creates, belongs to `oss-writing`. R-SEC-12, enforcing CODEOWNERS review as part of branch protection, belongs to `oss-harden`, as does every other protection, scanning, or token setting; R-COM-07's description, topics, homepage, and feature tabs are the only forge settings this skill touches. Do not reorder or rewrite README sections, decide how a file's sentences are phrased, or configure branch protection while working from this skill; note that the project needs it and hand the work to the owning skill.

## Ask rather than invent

Three files fail this skill's job if their content is invented rather than verified:

SECURITY.md needs a channel the maintainer actually monitors, that an unaffiliated reporter can reach, and a response time the maintainer can keep. Read the existing SECURITY.md if one exists, the README's contact or maintainers section, the package manifest's author or maintainers field, and the forge settings. GitHub private vulnerability reporting works only on a public repository and only after it is enabled. GitLab Service Desk accepts email from people with no GitLab account and creates a confidential ticket. A GitLab confidential issue is suitable only when the project's permissions let the intended reporters create one. If none of that surfaces a working channel, ask which one the maintainer will use and what response window they will commit to. Never write `security@example.com` or a plausible-looking address that nobody confirmed.

CODE_OF_CONDUCT.md needs a real enforcement contact. Read the same sources: an existing CODE_OF_CONDUCT.md, the README, the package manifest, CODEOWNERS. A template CODE_OF_CONDUCT.md often ships with `[INSERT CONTACT METHOD]` or similar placeholder text still in it; carrying that text forward fails R-COM-03 outright, since the rule treats a dead channel as worse than none. If reading the repository does not surface a name and a reachable address or handle, ask for one.

CONTRIBUTING.md needs the actual local setup, test, and submission commands, not the generic ones for the ecosystem. Read the package manifest's scripts, a Makefile, a Rakefile, or whatever the project already uses to define these, and quote the commands that exist there. If no test command is defined anywhere in the repository, say so instead of inventing one, and ask whether to add one to the project or document that none exists yet.

## Process

### Step 1: Establish whether scaffolding is warranted, and gather facts

Confirm the project accepts outside contributions at all before writing a file that invites them. Check the README for a statement either way, check whether the repository is archived, and ask directly if neither answers it; a project that does not want contributions needs a license and a security policy, not a CONTRIBUTING.md.

Identify the language and ecosystem from the package manifest and source layout, so the commands quoted in CONTRIBUTING.md match reality. Identify the forge from the git remote or by asking; this decides which reference file governs Steps 6 through 9. Identify whether the repository sits under a personal account or an organization: a personal account has no teams, so a CODEOWNERS entry there must name a `@username` or an email address, never an `@org/team-name`. List the community files that already exist, in every location each forge recognizes, so Steps 2 through 9 extend or replace rather than duplicate them.

### Step 2: License file (R-COM-01)

Read every package manifest's `license` field. If a manifest names a license and no `LICENSE` or `LICENSE.md` file exists, fetch the matching text from the license steward or the SPDX License List by its current identifier, then fill only the replaceable copyright fields. Do not reconstruct license text from memory. If no manifest names a license, ask which one to use rather than defaulting to MIT or any other license silently. If a `LICENSE` file already exists and disagrees with a manifest, point out the mismatch and ask which one is correct instead of picking one.

A manifest that declares no license at all, because the package is private or the project publishes nothing, leaves this rule with no manifest to match. The license file still has to exist and still has to say which license it is, so read the file itself and confirm it is the full text of a license you can name, not a stub or a header. Check what else in the repository states a license, such as a skill's frontmatter or the forge's own detected license, and raise it if any of them disagree with the file.

### Step 3: CONTRIBUTING.md (R-COM-02)

State the setup command, the test command, and how to open a pull request or merge request, using the commands verified in Step 1's read of the manifest and any build files. Name the actual branch and fork workflow the repository uses; do not describe a generic GitHub flow for a project that requires a different one.

Two more sentences close the rule. State that a change adding functionality arrives with a test. Then name the document that says what an acceptable contribution must satisfy, and link it, whether that is a coding standard, a style guide, or the repository's own instructions file. Open the link before shipping the guide, because the rule checks that the document resolves. Where the project has no such document, say so and ask which one to name, rather than inventing requirements nobody agreed to. Place the file at the repository root unless the project already keeps community files in `.github/` or `docs/` on GitHub, in which case match that convention; GitLab recognizes no alternate location for this file, so keep it at the root there.

### Step 4: CODE_OF_CONDUCT.md (R-COM-03)

Use an established code of conduct rather than drafting new standards of behavior. Read the steward's official site for the version it currently publishes and fetch that adoption template from there; do not assume a version number, because the one a skill or an existing file names goes stale the moment the steward publishes the next one. Preserve the attribution and license notice, and customize only the fields that version's own adoption instructions invite the project to customize, which for the Contributor Covenant is the reporting instructions and, in versions that have one, the section describing the project's own enforcement process. Fill in the verified reporting contact, and confirm no placeholder text survives before finishing.

A code of conduct already in the repository at an older version of the same document still satisfies R-COM-03, provided its reporting contact works. Say that the newer version exists and let the maintainer decide; do not replace a working file to chase a version number.

### Step 5: SECURITY.md (R-COM-04)

State the private reporting channel gathered above and the response window the maintainer confirmed. Do not state a response window nobody committed to keeping; a generic "we aim to respond within 48 hours" that the maintainer never agreed to is exactly the kind of unmaintained promise this skill exists to avoid. The window they commit to is 14 days or less, because R-COM-04 accepts no longer one. Where the maintainer will not commit inside that ceiling, say so rather than writing a number they will miss. On GitHub, confirm the repository is public and private vulnerability reporting is enabled before naming its report form. On GitLab, prefer an enabled Service Desk address or a monitored security email. Name a confidential-issue URL only after verifying that a reporter with the documented audience's role can create the issue as confidential. A channel that requires undisclosed project membership is not a public security contact.

### Step 6: Issue and pull or merge request templates (R-COM-05, R-COM-09)

Open the reference file for the forge chosen in Step 1 before writing any template; the two forges differ enough here that guessing at the other's shape produces a template the forge will not render. At minimum, ship one issue template and one pull or merge request template.

The rule asks that reports arrive with the facts you need, and which facts those are is a property of this project, not of bug reports in general. They are the variables that decide whether a defect reproduces. A template asking for steps, expected, and actual collects a report that still cannot be triaged whenever the axis that actually differs between the reporter's run and the maintainer's is missing from it, which is the normal case. Derive the fields from evidence in the repository using [references/report-fields.md](references/report-fields.md), which carries the test for whether a field belongs, the five places that evidence lives, which schema element carries each kind of fact, and how many templates the project's own triage actually needs.

Present the derived fields, the template categories, and the change-request template's sections before writing any file. The maintainer pays the triage cost and the cost of every section on every change request, and owns the scope claim an option list makes, so the slate is theirs to cut, and naming the source of each field is what lets them cut it. Say which fields they did not ask for, and give the reason: the most valuable one is usually the variable their own setup holds fixed, such as the harness and model a skill runs under or the base image a container inherits, because a variable that never varies for the maintainer is invisible to the maintainer and still decides the outcome for everyone else.

A template made of Markdown headings cannot require any of those fields: a contributor can delete every heading and submit an empty issue. On a public GitHub repository, write issue forms instead, and mark the fields you cannot triage without as required, because that is the only shape either forge enforces and it works only in public repositories. Verify the form renders in the template chooser before treating it as finished, since the form schema is in public preview. Fall back to a Markdown template on a private repository, on GitLab, or when a form does not render, and say which one you shipped and what it does not enforce.

Write the chooser config as well on GitHub whenever the project has somewhere to send what is not a defect (R-COM-09). Routing questions and support requests to a discussion forum or chat channel with `contact_links` removes more noise than any field can, because a question is not a defect in any shape. Ask where that traffic already goes rather than assuming the tracker; a project with a forum nobody links to has the channel and not the door. Open the linked URL before shipping the file, since the rule checks that the destination exists and a link to a forum that was never opened costs a contributor the same round trip as no link at all. Leave the blank issue enabled unless the templates cover every kind of report the project accepts, and leave `blank_issues_enabled` alone otherwise: R-COM-09 scores the routing, not the tracker's front door.

Whether the project runs such a channel at all is the maintainer's decision and not this rule's business. Where they want one and the project is on GitHub, Discussions is the cheapest to open, and it is a repository setting rather than a file, so Step 9's rules about settings apply. A Discussions category can carry a form of its own in the same schema the issue forms use, which is worth proposing only for a category that already collects a recurring shape of report; [references/github.md](references/github.md) has the path, the naming rule, and the keys that differ from an issue form.

A change-request template collects what review needs and the pipeline cannot report. A checkbox asking whether the contributor ran the tests duplicates a required check and reads as satisfied whether or not it is, so read the project's own pipeline first and ask for nothing it already answers. Ask instead for what no job produces: which part of the declared public API the change touches, where the project declares one, and the evidence behind a change nothing automated can score. Derive the sections from what this project's review actually needs, the same way the issue fields are derived, because a section every project ships is a section that collects nothing.

A change request is read on the forge, in a rendered description a reviewer skims before opening the diff, so write the template for that reader. Use headings the forge renders, one bullet per separable part of the change, and a table where the answer is a list of things and a fact about each. A description that arrives as one flat paragraph is read by nobody, however true every sentence in it is. A repository configured to reuse the description as its squash commit message is not a reason to write one that way: the forge is where the text is read, and the commit is a copy of it. Put each section's guidance in an HTML comment under its heading, so it disappears once the description renders. Neither forge can require a field here, so keep the list short enough to be read, and say in the template that a heading with nothing under it should be deleted, since an empty section reads as an unanswered one.

### Step 7: CODEOWNERS (R-COM-06)

R-COM-06 reaches a repository where two or more principals hold push, maintain, or admin access, the same condition R-SEC-12 states. Read the access list first, and where one principal holds every merge path, say the rule does not reach the repository and skip this step; a code owner who is also the only person who could merge the change assigns a reviewer to nobody. Where it does reach, open the matching reference file. GitHub reads CODEOWNERS in public repositories on GitHub Free and in public or private repositories on paid plans. GitLab's Code Owners feature, including reading this file at all, requires Premium or Ultimate. Only GitLab supports sections, exclusions, role owners, and a required approval count within a section. Enforcing CODEOWNERS approval, where the tier allows it, is a branch or merge request protection setting outside this file. Note that setting is needed and hand it to `oss-harden` rather than attempting it here. Every CODEOWNERS file this skill writes needs at least one catch-all `*` rule naming a real owner; ask who that should be if it is not already obvious from the repository's single maintainer or an existing CODEOWNERS file.

### Step 8: FUNDING (optional)

No rule in `STANDARD.md` requires a funding file; only add one if the maintainer wants a sponsor button or funding link, and only list a platform the project is actually registered on. Read `references/github.md` for the accepted keys before writing `.github/FUNDING.yml`; GitLab has no equivalent file.

### Step 9: Forge project settings (R-COM-07)

The description, homepage, and topics are what a stranger reads in a search result or a social card before deciding whether to open the README, and none of them live in a file, so nothing in a clone reveals that they are empty. Read the current values from the forge, then propose a one-sentence description saying the same thing as the README's opening line, a homepage pointing at the documentation site or package page where one exists, and topics someone searching would actually type. Read the matching reference file for the field limits, the commands, and the feature tabs, and confirm Issues is enabled at all, since Step 6's templates are unreachable without it.

A setting is not a file: it takes effect the moment it is applied, it appears in no diff, and it cannot be reviewed before it is public. Apply these only with the maintainer's agreement, and say for each one what it will look like publicly. Branch protection, required reviews, scanning, and tokens are settings too, and they belong to `oss-harden`; note that they are needed and change nothing here.

### Step 10: Governance and succession (R-COM-08)

Write who decides and what happens if they stop. For a project with one maintainer, that is two honest sentences in CONTRIBUTING.md or a GOVERNANCE.md: this person merges and releases, and there is no succession arranged. Do not talk a solo maintainer into inventing a steering committee, and do not name a second maintainer who has not agreed to be one; both read as governance and are neither. Where the repository already sits under an organization or foundation, say which, since that is the succession answer. Read the repository first: an existing GOVERNANCE.md, a CONTRIBUTING.md section on who reviews, or a CODEOWNERS file naming a team rather than a person all tell you what is already true. If nothing does, ask, because this is the one COM file whose content cannot be inferred from the repository at all.

### Step 11: Present the result

List every file written or proposed, every setting changed or proposed, the rule each satisfies, and every fact that came from asking rather than reading, so the maintainer can see what they confirmed. Flag anything left unresolved, such as a CONTRIBUTING.md with no test command because the repository has no tests, rather than silently shipping a gap.

## Rules this skill owns

R-COM-01: The repository ships a license file whose license matches the package manifest

R-COM-02: CONTRIBUTING.md tells a newcomer how to set up, test, and submit a change

R-COM-03: CODE_OF_CONDUCT.md exists and names a working reporting contact

R-COM-04: SECURITY.md states a private reporting channel and a response window

R-COM-05: Issue and change-request templates exist so reports arrive with the facts you need

R-COM-06: A CODEOWNERS file assigns a reviewer to every path

R-COM-07: The forge project page says what the project is and where it lives

R-COM-08: A documented statement says who decides, and what happens if they stop

R-COM-09: When questions and defects have different homes, the issue chooser says so
