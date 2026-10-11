# Audit report format

The format is a contract, because a later run parses it. Use these four sections, in this order.

**Repository.** The facts you established in Step 2: forge and project path, shipped ecosystems, present ecosystems with the manifests that proved them, the CI configuration paths, the lockfiles, and how the project releases today. A fix session in a fresh context reads this instead of re-deriving it, and re-deriving it is most of what a fix session spends its first turns on.

**Prerequisites.** Every step the fix work needs that no API can perform: a registry's trusted-publisher form, anything behind a password or an MFA prompt, anything that exists only as a web form. Name the URL and the exact field values. The maintainer clears these before any fix group starts. Put this section above the verdicts even when it is empty, and say it is empty, because a reader who does not see the section cannot tell whether it was considered. A fix run that meets one of these mid-flight stalls with a loaded context window doing nothing, so the point of the section is that no fix session ever opens a browser.

**Verdicts.** One line per scored rule, including passes, in rule ID order:

```text
- R-DOC-01 pass README.md:3, one sentence before the first heading
- R-SEC-01 fail .github/workflows/main.yml:32,34,60 pin tags rather than SHAs
  Fixed by: oss-harden
  Check: every external `uses:` line in `.github/workflows/`, and in every
  `action.yml` or `action.yaml` the repository ships, ...
- R-SEC-04 unknown reads repos/{owner}/{repo}/rulesets, no forge access
  Fixed by: oss-harden
  Check: the default branch is protected, a pull request or merge request is ...
```

A verdict line opens `- `, then the rule ID, then `pass`, `fail`, `unknown`, or `n/a`, then the evidence. Where the rule scored per ecosystem, the ecosystem name comes before the evidence. A fail or an unknown carries two indented lines under it: `Fixed by:` naming the owning skill, and `Check:` quoting that rule's `Check:` line from `STANDARD.md` verbatim. A pass and a not-applicable carry neither, and a not-applicable carries the scope sentence as its evidence.

Quoting `Check:` verbatim is what makes a fix session self-sufficient. Without it every fix session reads `STANDARD.md` again to learn what the rule wanted, and reads it again each time the text scrolls out.

**Execution order.** One group per owning skill, one pull request per group, numbered in the order they should run. Every rule's `Fixed by:` line already decided which group it lands in, so compute the grouping rather than choosing it. Order the groups by the same dependency logic Step 6 orders findings by, and hold to three constraints:

- A group whose fixes other groups depend on runs before them.
- Tightening branch protection runs after the checks that protection will require exist and report.
- Cutting a release runs last, and gets its own final group. Rules that verify only against a published artifact or a newly pushed tag, which is where R-PUB-03 and R-SEC-05 sit, close there and nowhere earlier. Say so in that group, so a reader does not read them as defects they failed to fix.

Say in this section that each group is a fresh session that reads this file and works from it. A group finishing with a merged pull request is a checkpoint, so the next group starts from a small context rather than carrying every earlier group's in it. Carrying them all is what takes a run to a 300k window that every later turn then pays for.

Then close your reply with that same execution order, as the literal next invocations. The advice above is in a file nobody opens at the moment the decision gets made, so a run that reads it there goes on in the same session and pays for it in every later turn. Put it where the decision is:

```text
Fix in four sessions, one pull request each. Start each in a fresh session
in this repository; each reads oss-audit-report.md and needs no handover.

  1. oss-community   4 rules   branch docs/community-files
  2. oss-readme      6 rules   branch docs/readme-structure
  3. oss-harden      7 rules   branch ci/harden
  4. oss-publish     4 rules   branch build/release-workflow
     last: cuts the release, closes R-PUB-03 and R-SEC-05
```

One line per group, in the order this section computed, with the rule count and the branch name from `oss-writing`'s branch rule. Name the skill as the host invokes it: a slash command where this kit is installed as a plugin, the bare skill name otherwise. Where a group closes rules that can only close after a release, say so on its line rather than leaving the maintainer to read it as unfinished work.


## Chat report example

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
