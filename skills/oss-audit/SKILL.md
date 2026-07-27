---
name: oss-audit
description: "Score an open source repository against the oss-kit standard and report what is missing. Checks documentation, community files, CI, security posture, release process, changelog discipline, and the structure of any agent skills the repository ships, then names the skill that fixes each gap. Use when the user asks how healthy a repo is, what an open source project is missing, to audit or review a repository's open source practices, or where to start improving one."
license: MIT
---

# Score a repository against the oss-kit standard

This skill scores a repository against `STANDARD.md`, the file that ships with oss-kit and states every rule the kit holds, one at a time. Read that file at the start of every audit and treat its rules as the checklist. Do not write the rules down anywhere else, in this file or in your notes: `STANDARD.md` is the one place they live, a rule change there must not require a matching change here, and a copy that drifts from the source scores repositories against criteria the kit no longer holds.

This skill owns no rule. It reads what `STANDARD.md` says a rule needs, checks the repository against that, and names the skill that owns the fix. It never fixes anything itself.

## Step 1: Find STANDARD.md

`STANDARD.md` sits next to this file, in this skill's own installed directory. Read it from there, not from the repository under audit. The audit runs with the target repository as the working directory, so a bare `STANDARD.md` or `./STANDARD.md` resolves against that repository and is the wrong file or no file. Resolve the standard from the absolute directory this `SKILL.md` was loaded from, and read `STANDARD.md` beside it.

The directory travels intact in every documented install, so the file is always beside this one: a git checkout, the Claude Code plugin install, `npx skills add svyatov/oss-kit --skill '*'` for the whole kit, and `npx skills add svyatov/oss-kit --skill oss-audit` for this skill alone. There is no documented install that brings in this skill's directory but leaves one of its own files behind.

If no `STANDARD.md` sits beside this file, the file is genuinely missing: the skill's own directory did not install completely, or the file was moved or deleted afterward. Say this plainly, name the file that is missing, and stop rather than guessing at another path or scoring against a remembered or reconstructed rule set. An audit with no rules to check against is not a smaller audit; it is no audit.

## Step 2: Read the rules

Each rule in `STANDARD.md` is a block with an ID (`R-<AREA>-<NN>`), a statement, one `Check:` line naming the evidence to look for, one `Fixed by:` line naming the skill that owns the fix, and one `Forges:` line naming whether the rule applies to GitHub, GitLab, or both. Read every block; do not sample.

Detect which forge the repository under audit uses: look for `.github/workflows/` or `.gitlab-ci.yml`, check the git remote, or ask if neither signal is present. Skip a rule whose `Forges:` line names only the other forge, and report it as not applicable rather than folding it into the pass, fail, or unknown counts.

One area is scoped by repository type rather than by forge. The SKL area carries a preamble scoping it to a repository that ships agent skills. Look for at least one `SKILL.md`, resolving symlinked directories as R-SKL-01's check requires. Where none exists, mark the whole area not applicable in one step and report it that way, rather than checking its rules one at a time.

## Step 3: Check each rule, area by area

`STANDARD.md`'s areas, DOC, COM, CI, SEC, PUB, CHG, and SKL, are independent and share no state, so they can be checked in any order. SKL is the one area gated on a precondition, stated in its own preamble and resolved in Step 2. More than one skill can own rules within one area, so read each rule's own `Fixed by:` line rather than assuming every rule in an area routes to the same place.

For every applicable rule, turn its `Check:` line into an observation against the repository: open the file or configuration it names, and record what is actually there. A `Check:` line asking whether the README's first paragraph is a single sentence before any heading is answered by reading `README.md`. A `Check:` line asking whether every `uses:` line resolves to a 40-character SHA is answered by reading every workflow file. Mark the rule pass when the evidence matches what the `Check:` line asks for and fail when it does not. Hold both to the same standard of evidence, whether or not the rule reaches the report: a fail with no evidence is a guess rather than a finding, and a pass with no evidence is the score that discredits every other one.

Mark a rule not applicable only when its area preamble, rule text, or `Check:` line states a precondition that the repository does not meet. Do not infer an unstated precondition from missing evidence: where the rule requires a file, setting, or value and does not define an exception, its absence is a failure. Record the scope sentence that made each rule not applicable so another audit reaches the same result.

## Step 4: Report unknown where the checkout cannot answer

Some `Check:` lines name evidence a repository checkout does not carry on its own: a forge API call (branch protection settings, environment approvers, a job token's scope), a registry endpoint (whether a published package carries a provenance attestation), or a maintainer's signing key fetched from outside the repository. You do not need a list of which rules these are memorized ahead of time; the `Check:` line itself tells you, because it names the API call, the endpoint, or the external key it needs.

A `Check:` line that names a script another skill ships is the same case. Where that skill is not installed, and a reader who took one skill rather than the kit is the common reason, the evidence is out of reach and the rule is unknown. Reading the files yourself and calling it a pass substitutes your judgment for the tool the rule names, which is the score two auditors will not agree on.

Where you actually have the access a `Check:` line asks for, network reachable, the right credentials available, use it and score the rule on what it returns. Where you do not, or an attempt fails, mark the rule unknown. Unknown is not a softened fail and not a cautious pass; it is a distinct third state, because a rule scored pass on no evidence is the failure mode that discredits every other score in the report. Give unknown its own line in the report, after the fails, and its own count. Never round unknown up to pass because the rest of the repository looks well kept, and never round it down to fail because access was inconvenient to get.

## Output format

Report only what the maintainer has to act on. A rule that passed gets no line of its own. You checked every applicable rule and you hold the evidence for every one of them, but a reader who came for the gaps does not need thirty rows confirming what already works, and printing them pushes the four that matter off the screen.

Open with one count line: how many rules were applicable, how many of those passed, failed, or came back unknown, and how many were marked not applicable, whether for forge scope or for a missing precondition. State the unknown count on its own, next to the fail count, not folded into either the pass or the fail total. On a repository with nothing to fix this line is the whole report, and it is what tells the reader the audit ran rather than stalled.

Say in a parenthetical why the not-applicable rules were skipped, grouped by reason, so the reader can tell a rule that does not reach their repository from one the audit quietly dropped. Group by the scope sentence you recorded in Step 3 rather than listing rule IDs one by one. This is the count line's only qualifier; do not follow it with a section listing what was skipped.

Then list every fail and every unknown, most important first, one line each. A line carries the rule ID, the status, the evidence you found, and the skill named in that rule's `Fixed by:` line:

```text
Audited 34 applicable rules: 28 pass, 4 fail, 2 unknown, 5 not applicable (4 PUB, the project publishes no package; 1 GitLab-only).

1. R-COM-01 fail, no LICENSE file, run oss-community
2. R-DOC-01 fail, README.md opens with a badge row before any sentence about the project, run oss-readme
3. R-SEC-01 fail, three uses: lines in .github/workflows/ci.yml pin a tag rather than a SHA, at lines 12, 19, and 31, run oss-harden
4. R-SEC-04 unknown, the check reads repos/{owner}/{repo}/rulesets and no forge access was available, run oss-harden
```

The order is the priority, so there is no second list saying what to do first. Put every fail ahead of every unknown, since a fail is a confirmed gap and an unknown is only a gap in the audit itself. Within the fails, put a rule that blocks other rules from being checked or fixed ahead of an independent one: a missing license blocks the newcomer-facing community rules that assume the project can legally be used, a missing CONTRIBUTING.md blocks the CI rule that checks its commands match, and a missing SECURITY.md or unset branch protection blocks the security rules that build on it. Order the rest by what most reduces risk or friction for a new contributor.

Keep each line to one line. The evidence is the specific thing you found, with the file and where in it, and nothing else: the rule statement is in `STANDARD.md` and the fix is in the skill you just named, so restating either here costs the reader the scan the format exists to give them.
