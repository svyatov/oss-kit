---
name: oss-audit
description: "Score an open source repository against the oss-kit standard and report what is missing. Checks documentation, community files, CI, security posture, release process, and changelog discipline, then names the skill that fixes each gap. Use when the user asks how healthy a repo is, what an open source project is missing, to audit or review a repository's open source practices, or where to start improving one."
license: MIT
---

# Score a repository against the oss-kit standard

This skill scores a repository against `STANDARD.md`, the file that ships with oss-kit and states every rule the kit holds, one at a time. Read that file at the start of every audit and treat its rules as the checklist. Do not write the rules down anywhere else, in this file or in your notes: `STANDARD.md` is the one place they live, a rule change there must not require a matching change here, and a copy that drifts from the source scores repositories against criteria the kit no longer holds.

This skill owns no rule. It reads what `STANDARD.md` says a rule needs, checks the repository against that, and names the skill that owns the fix. It never fixes anything itself.

## Step 1: Find STANDARD.md

`STANDARD.md` sits one directory above `skills/`, so from this file at `skills/oss-audit/SKILL.md` the path `../../STANDARD.md` resolves it in every install layout that keeps this skill's directory attached to the rest of the repository it came from: a git checkout, a Claude Code plugin install (the marketplace entry declares the plugin's source as the repository root, so the installed copy mirrors this layout), and a whole-kit install through a skills package manager that preserves the source repository's directory tree.

If that path does not resolve, search outward from the current working directory and from this file's own location for a `STANDARD.md` that sits next to a `skills/` directory containing this skill, in case the kit was vendored at a different depth.

If neither finds it, the most likely cause is that only this one skill was installed on its own: a single-skill install fetches this skill's own directory and nothing outside it, and `STANDARD.md` lives outside every skill's directory by design, so it does not travel with a single-skill install. Say this plainly, name the file that is missing and why an audit cannot proceed without it, and point at `STANDARD.md` in the oss-kit repository (the link `README.md` itself gives) as the source to fetch or to install the kit from in a way that includes it. Do not score against a remembered or reconstructed rule set. An audit with no rules to check against is not a smaller audit; it is no audit.

## Step 2: Read the rules

Each rule in `STANDARD.md` is a block with an ID (`R-<AREA>-<NN>`), a statement, one `Check:` line naming the evidence to look for, one `Fixed by:` line naming the skill that owns the fix, and one `Forges:` line naming whether the rule applies to GitHub, GitLab, or both. Read every block; do not sample.

Detect which forge the repository under audit uses: look for `.github/workflows/` or `.gitlab-ci.yml`, check the git remote, or ask if neither signal is present. Skip a rule whose `Forges:` line names only the other forge, and report it as not applicable rather than folding it into the pass, fail, or unknown counts.

## Step 3: Check each rule, area by area

`STANDARD.md`'s areas, DOC, COM, CI, SEC, REL, and CHG, are independent and share no state, so they can be checked in any order. More than one skill can own rules within one area, so read each rule's own `Fixed by:` line rather than assuming every rule in an area routes to the same place.

For every applicable rule, turn its `Check:` line into an observation against the repository: open the file or configuration it names, and record what is actually there. A `Check:` line asking whether the README's first paragraph is a single sentence before any heading is answered by reading `README.md`. A `Check:` line asking whether every `uses:` line resolves to a 40-character SHA is answered by reading every workflow file. Mark the rule pass when the evidence matches what the `Check:` line asks for, fail when it does not, and cite the concrete evidence either way: a fail with no evidence is a guess, not a finding.

Some `Check:` lines presuppose something the repository does not have yet, such as a release tag before any release has shipped or a package manifest for a repository that ships none. Treat that the same way as a rule outside the detected forge's scope: not applicable, with a note of what is missing that would make the rule checkable, rather than scoring an absent precondition as a failure of the rule built on top of it.

## Step 4: Report unknown where the checkout cannot answer

Some `Check:` lines name evidence a repository checkout does not carry on its own: a forge API call (branch protection settings, environment approvers, a job token's scope), a registry endpoint (whether a published package carries a provenance attestation), or a maintainer's signing key fetched from outside the repository. You do not need a list of which rules these are memorized ahead of time; the `Check:` line itself tells you, because it names the API call, the endpoint, or the external key it needs.

Where you actually have the access a `Check:` line asks for, network reachable, the right credentials available, use it and score the rule on what it returns. Where you do not, or an attempt fails, mark the rule unknown. Unknown is not a softened fail and not a cautious pass; it is a distinct third state, because a rule scored pass on no evidence is the failure mode that discredits every other score in the report. Give unknown its own row in the table, its own place in the prioritized list if closing it would let a fail turn into a pass or stay a fail, and its own count. Never round unknown up to pass because the rest of the repository looks well kept, and never round it down to fail because access was inconvenient to get.

## Step 5: OpenSSF Scorecard

Several SEC rules overlap what OpenSSF Scorecard already checks. Do not query Scorecard or reimplement its checks from this skill; `skills/oss-harden` already reads Scorecard results, including what a repository with no scan yet returns, and maps its findings to the same rule IDs. Where a SEC rule's evidence would come from Scorecard, mark it unknown here and point at `oss-harden` to resolve it, rather than duplicating that lookup.

## Output format

Report a table with one row per applicable rule: the rule ID, the status (pass, fail, or unknown), the evidence you found, and the skill named in that rule's `Fixed by:` line. For example:

| Rule | Status | Evidence | Fixed by |
|---|---|---|---|
| R-DOC-01 | fail | README.md opens with a badge row before any sentence about the project | oss-readme |

After the table, give a short prioritized list of what to do first. Put fails ahead of unknowns, since a fail is a confirmed gap and an unknown is only a gap in the audit itself. Within the fails, list a rule that blocks other rules from being checked or fixed before an independent one: a missing license blocks the newcomer-facing community rules that assume the project can legally be used, a missing CONTRIBUTING.md blocks the CI rule that checks its commands match, and a missing SECURITY.md or unset branch protection blocks the security rules that build on it. List the rest in the order that most reduces risk or friction for a new contributor. Name the skill that fixes each item as you list it.

Close with the count: how many rules were applicable, how many of those passed, failed, or came back unknown, and how many were marked not applicable, whether for forge scope or for a missing precondition. State the unknown count on its own, next to the fail count, not folded into either the pass or the fail total.
