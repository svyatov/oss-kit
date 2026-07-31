---
name: oss-audit
description: "Score an open source repository against the oss-kit standard and report what is missing. Checks documentation, community files, CI, security posture, release process, changelog discipline, and the structure of any agent skills the repository ships, then names the skill that fixes each gap. Use when the user asks how healthy a repo is, what an open source project is missing, to audit or review a repository's open source practices, where to start improving one, what to do before opening a private repository to the public, or to score a repository against a named standard."
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

A rule marked retired is not scored, and appears in no count. Its number is kept so nobody reuses it, which is the whole of what it is still doing there.

Then detect which distribution ecosystems the repository uses. `ecosystems.json` sits beside `STANDARD.md` in this skill's own installed directory, so Step 1's rule reads it: resolve it from the absolute directory this `SKILL.md` was loaded from, never from the repository under audit. It names every ecosystem the kit covers and, for each, the manifest and lockfile names that mark it, the registry it publishes to, and the release track it takes. Where it disagrees with anything written in prose, including the files this skill's `references/ecosystems/` directory ships, it wins. If it is missing, say so, and score what you can from the manifests you find rather than reconstructing a roster from memory.

Detection runs on two axes, and the two answers stay apart.

An ecosystem is present when any manifest or lockfile the roster lists for it turns up anywhere in the checkout. A dev-only manifest counts. So does one that builds the docs site, one inside an example, and one that declares nothing publishable at all.

An ecosystem is shipped when the repository publishes to it. The release area's preamble states what makes an artifact published, and that is the evidence to look for; for container images, which have no manifest, the signal is a push to a registry rather than a Dockerfile.

Keeping the axes apart is what makes the rest of the audit accurate. What a repository ships is what reaches the PUB area and R-CHG-07. What is merely present is what reaches R-CI-03, R-SEC-03, R-SEC-08, and R-SEC-11, because a vulnerability arrives through a dependency whether or not anything is published from it. Fold the two together and a Go command-line tool carrying a `package.json` under `docs/` gets told to configure npm trusted publishing, while a repository that ships a gem and builds its site with npm has its npm lockfile scored as though it were not there.

The signals that decide each ecosystem, including the cases that are easy to get backwards, a `package.json` carrying `"private": true`, a manifest that exists only to configure a linter, and a lockfile with no manifest beside it, are in `references/ecosystems/<name>.md`, one file per roster entry. Read the file for an ecosystem before recording it as shipped, present, or absent.

Some areas carry a preamble under their own `##` heading that gates the area rather than any single rule, scoping it to a kind of repository rather than to a forge. Read that preamble before the area's first rule. Where its precondition is unmet, mark the whole area not applicable in one step and report it that way, rather than checking its rules one at a time. Where a precondition names a file, resolve symlinked directories before concluding the file is absent, as R-SKL-01's check requires.

## Step 3: Check each rule, area by area

`STANDARD.md`'s areas, DOC, COM, CI, SEC, PUB, CHG, and SKL, are independent and share no state, so they can be checked in any order. An area gated on a precondition states that precondition in its own preamble, and Step 2 resolved it. More than one skill can own rules within one area, so read each rule's own `Fixed by:` line rather than assuming every rule in an area routes to the same place.

For every applicable rule, turn its `Check:` line into an observation against the repository: open the file or configuration it names, and record what is actually there. A `Check:` line asking whether the README's first paragraph is a single sentence before any heading is answered by reading `README.md`. A `Check:` line asking whether every `uses:` line resolves to a 40-character SHA is answered by reading every workflow file. Mark the rule pass when the evidence matches what the `Check:` line asks for and fail when it does not. Hold both to the same standard of evidence, whether or not the rule reaches the report: a fail with no evidence is a guess rather than a finding, and a pass with no evidence is the score that discredits every other one.

A rule met by a fallback the standard marks below the bar is a pass, and counts as one. Give that rule a report line naming which fallback carried it, which is the one place a pass earns a line of its own. `STANDARD.md`'s preamble tells the reader to revisit a below-the-bar fallback when the platform catches up, and an unqualified pass leaves them nothing to revisit: a maintainer publishing on a long-lived scoped token reads that pass and never learns they are on the degraded variant.

Some `Check:` lines name evidence that exists once per ecosystem rather than once per repository: a lockfile, a toolchain matrix, an update configuration, a vulnerability feed. Score such a rule against every ecosystem the relevant axis from Step 2 puts in scope for it, one observation each, and mark it pass only when every one of them passes. One failing ecosystem fails the rule, because a repository whose Ruby dependencies are watched and whose JavaScript ones are not is not two thirds covered, it is uncovered on one side. Carry the ecosystem name with the observation; Step 6 puts it in the finding.

The PUB area resolves in one step from the shipped set, not rule by rule. Where nothing is shipped, the whole area is not applicable, which is Step 2's preamble handling and nothing more. Where something is shipped, read the preamble for the track each shipped ecosystem takes, confirm it against that ecosystem's `references/ecosystems/<name>.md`, and record the track once. The track decides which of the area's rules reach the repository at all, so a repository on the tag-published track has the rules that track drops marked not applicable together, on one scope sentence, and they are not checked one at a time. A repository shipping on both tracks scores each rule against the ecosystems whose track keeps it.

Mark a rule not applicable only when its area preamble, rule text, or `Check:` line states a precondition that the repository does not meet. Do not infer an unstated precondition from missing evidence: where the rule requires a file, setting, or value and does not define an exception, its absence is a failure. Record the scope sentence that made each rule not applicable so another audit reaches the same result.

## Step 4: Report unknown where the checkout cannot answer

Some `Check:` lines name evidence a repository checkout does not carry on its own: a forge API call (branch protection settings, environment approvers, a job token's scope), a registry endpoint (whether a published package carries a provenance attestation), or a maintainer's signing key fetched from outside the repository. You do not need a list of which rules these are memorized ahead of time; the `Check:` line itself tells you, because it names the API call, the endpoint, or the external key it needs.

Where you actually have the access a `Check:` line asks for, network reachable, the right credentials available, use it and score the rule on what it returns. Where you do not, or an attempt fails, mark the rule unknown. Unknown is not a softened fail and not a cautious pass; it is a distinct third state, because a rule scored pass on no evidence is the failure mode that discredits every other score in the report. Give unknown its own line in the report, after the fails, and its own count. Never round unknown up to pass because the rest of the repository looks well kept, and never round it down to fail because access was inconvenient to get.

## Step 5: Count what you checked

Count the rules the standard defines before writing any total:

```bash
grep -c '^### R-' <absolute path to STANDARD.md>
```

Every rule you read carries exactly one status, so pass, fail, unknown, and not applicable add up to that number once the retired rules are subtracted from both sides. Subtract them explicitly: the grep counts a retired rule's heading, and a bare comparison drops the first retired ID into the unchecked bucket and reintroduces the mis-scoring Step 2 exists to prevent.

Where the four counts fall short, a rule has no status and is unchecked rather than passing. Go back to Step 3, check it, and count again. Do not report until the arithmetic closes.

## Step 6: Report

Report only what the maintainer has to act on. A rule that passed gets no line of its own, unless a below-the-bar fallback carried it. You checked every applicable rule and you hold the evidence for every one of them, but a reader who came for the gaps does not need thirty rows confirming what already works, and printing them pushes the four that matter off the screen.

Open with one count line: how many rules were applicable, how many of those passed, failed, or came back unknown, and how many were marked not applicable, whether for forge scope or for a missing precondition. State the unknown count on its own, next to the fail count, not folded into either the pass or the fail total. On a repository with nothing to fix this line is the whole report, and it is what tells the reader the audit ran rather than stalled.

Say in a parenthetical why the not-applicable rules were skipped, grouped by reason, so the reader can tell a rule that does not reach their repository from one the audit quietly dropped. Group by the scope sentence you recorded in Step 3 rather than listing rule IDs one by one. This is the count line's only qualifier; do not follow it with a section listing what was skipped.

Under it, give one line for the ecosystems you detected, with shipped and present kept apart and named in that order, and say plainly when nothing is shipped. Every per-ecosystem finding below was scored against one of those two sets, so a reader who disputes a finding needs to see which set produced it, and one sentence saying the repository publishes nothing is what explains an entire area marked not applicable.

Then list every fail and every unknown, most important first, one line each. A line carries the rule ID, the status, the evidence you found, and the skill named in that rule's `Fixed by:` line. Where the rule was scored per ecosystem, name the ecosystem that failed, before the evidence:

```text
Audited 50 applicable rules: 45 pass, 4 fail, 1 unknown, 9 not applicable
(7 SKL, the repository ships no agent skills; 1 GitLab-only; 1 where the
ecosystem does not encode the major version in package identity).
Ships rubygems. npm present through site/package.json and site/package-lock.json.

1. R-COM-01 fail, no LICENSE file, run oss-community
2. R-DOC-01 fail, README.md opens with a badge row before any sentence about the project, run oss-readme
3. R-SEC-01 fail, three uses: lines in .github/workflows/ci.yml pin a tag rather than a SHA, at lines 12, 19, and 31, run oss-harden
4. R-SEC-08 fail, npm: site/package-lock.json is committed but the docs job runs npm install rather than npm ci, run oss-harden
5. R-SEC-04 unknown, the check reads repos/{owner}/{repo}/rulesets and no forge access was available, run oss-harden
```

Naming the ecosystem is what completes the routing. Every skill that fixes an ecosystem-sensitive rule carries a `references/ecosystems/<name>.md` for each roster entry, so the skill from the `Fixed by:` line plus the ecosystem name is the address of the fix, and there is no roster entry that address fails to resolve for. Without the ecosystem, line 4 above sends a maintainer to read four files to work out which lockfile you meant.

The numbers above illustrate the shape. Derive yours from the count in Step 5.

The order is the priority, so there is no second list saying what to do first. Put every fail ahead of every unknown, since a fail is a confirmed gap and an unknown is only a gap in the audit itself. Within the fails, put a rule that blocks other rules from being checked or fixed ahead of an independent one: a missing license blocks the newcomer-facing community rules that assume the project can legally be used, a missing CONTRIBUTING.md blocks the CI rule that checks its commands match, and a missing SECURITY.md or unset branch protection blocks the security rules that build on it. Order the rest by what most reduces risk or friction for a new contributor.

Keep each line to one line. The evidence is the specific thing you found, with the file and where in it, and nothing else: the rule statement is in `STANDARD.md` and the fix is in the skill you just named, so restating either here costs the reader the scan the format exists to give them.
