---
name: oss-audit
description: "Score an open source repository against the oss-kit standard and report what is missing. Checks documentation, community files, CI, security posture, release process, and changelog discipline, then names the skill that fixes each gap. Use when the user asks how healthy a repo is, what an open source project is missing, to audit or review a repository's open source practices, or where to start improving one."
license: MIT
---

# Score a repository against the oss-kit standard

This skill scores a repository against `STANDARD.md`, the file that ships with oss-kit and states every rule the kit holds, one at a time. Read that file at the start of every audit and treat its rules as the checklist. Do not write the rules down anywhere else, in this file or in your notes: `STANDARD.md` is the one place they live, a rule change there must not require a matching change here, and a copy that drifts from the source scores repositories against criteria the kit no longer holds.

This skill owns no rule. It reads what `STANDARD.md` says a rule needs, checks the repository against that, and names the skill that owns the fix. It never fixes anything itself.

## Step 1: Find STANDARD.md

`STANDARD.md` sits inside this skill's own directory, next to this file, at `skills/oss-audit/STANDARD.md`. The path `./STANDARD.md`, relative to `SKILL.md`, resolves it in every documented install, because an install that fetches this skill at all fetches its whole directory: a git checkout, the Claude Code plugin install, `npx skills add svyatov/oss-kit` for the whole kit, and `npx skills add svyatov/oss-kit --skill oss-audit` for this skill alone. There is no documented install that brings in this skill's directory but leaves one of its own files behind.

If `./STANDARD.md` does not resolve, the file is genuinely missing: the skill's own directory did not install completely, or the file was moved or deleted afterward. Say this plainly, name the file that is missing, and stop rather than guessing at another path or scoring against a remembered or reconstructed rule set. An audit with no rules to check against is not a smaller audit; it is no audit.

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

Two SEC rules name evidence a plain checkout cannot produce and that OpenSSF Scorecard already checks: R-SEC-04, whose `Check:` line reads branch protection settings through a forge API, and R-SEC-05, whose `Check:` line needs the maintainer's signing key fetched from outside the repository to verify a signed tag. Do not query Scorecard or reimplement its checks from this skill; `skills/oss-harden` already reads Scorecard results, including what a repository with no scan yet returns, and maps its findings to the same rule IDs. Mark R-SEC-04 and R-SEC-05 unknown here and point at `oss-harden` to resolve them, rather than duplicating that lookup.

R-SEC-01, R-SEC-02, and R-SEC-03 are not deferred here: their `Check:` lines name evidence a checkout already has, pinned SHAs in `.github/workflows/`, a `permissions:` block in each workflow file, and a dependency-update configuration file, so Step 3 scores them directly.

## Output format

Report a table with one row per applicable rule: the rule ID, the status (pass, fail, or unknown), the evidence you found, and the skill named in that rule's `Fixed by:` line. For example:

| Rule | Status | Evidence | Fixed by |
|---|---|---|---|
| R-DOC-01 | fail | README.md opens with a badge row before any sentence about the project | oss-readme |

After the table, give a short prioritized list of what to do first. Put fails ahead of unknowns, since a fail is a confirmed gap and an unknown is only a gap in the audit itself. Within the fails, list a rule that blocks other rules from being checked or fixed before an independent one: a missing license blocks the newcomer-facing community rules that assume the project can legally be used, a missing CONTRIBUTING.md blocks the CI rule that checks its commands match, and a missing SECURITY.md or unset branch protection blocks the security rules that build on it. List the rest in the order that most reduces risk or friction for a new contributor. Name the skill that fixes each item as you list it.

Close with the count: how many rules were applicable, how many of those passed, failed, or came back unknown, and how many were marked not applicable, whether for forge scope or for a missing precondition. State the unknown count on its own, next to the fail count, not folded into either the pass or the fail total.
