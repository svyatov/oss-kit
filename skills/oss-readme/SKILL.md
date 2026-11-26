---
name: oss-readme
description: "Write or review an open source README, check its claims, and organize its sections."
disable-model-invocation: true
license: MIT
---

# README structure

Apply the structure below when creating or improving a README. It follows Evil Martians' approach to promoting open source projects: put the reason to keep reading at the top, and the details below.

This skill owns section order and what each section must contain. It does not own how a sentence reads. Once the sections below are in place, apply oss-writing to the prose inside them.

The README rules belong here: R-DOC-01 opening sentence, R-DOC-02 install and example, R-DOC-03 required links, R-DOC-04 claim accuracy, R-DOC-06 scope statement, R-DOC-07 code block destinations, R-DOC-08 question channel, R-DOC-09 maintenance status, and R-DOC-10 differentiator evidence. R-DOC-05, how each sentence reads, belongs to `oss-writing`.

Use this skill's quoted checks from `oss-audit-report.md` when supplied. Otherwise resolve `../oss-audit/STANDARD.md` from this installed skill's directory before editing. If neither source exists, follow the request and report standard verification as unavailable. Use the same resolved checks at completion; supplied checks do not establish unlisted rules.

## Three ways in

The request decides which one runs. Read it before reading the structure below.

To create a README from nothing, write sections 1 to 9 in the order given.

To improve one that exists, read it against the checklist at the end of this skill first. Then fix what fails, in section order, so each fix lands where the reader meets it.

For a request to review, audit, or check a README, assess it against the checklist and the resolved R-DOC checks. Report each failure at its line, or at the nearest heading for missing content. Mark unavailable evidence unknown, including who selected the facts or whether setup succeeded. Return findings and suggested actions only. Change no file, run no setup commands, and write no replacement prose.

Never invent facts. If the repository does not contain a piece of data you need, such as a benchmark, a file size, a real differentiator from alternatives, or a supported platform list, or you are not sure a number is accurate, ask for it instead of guessing. A README with a fabricated number is worse than one with no number at all.

## Section order

### 1. Title

A `#` heading naming the project. Preserve `DEPRECATED` when the project uses its first heading as the R-DOC-09 maintenance signal.

### 2. Opening sentence

Immediately below the title, one sentence stating what the project is and who it is for. Nothing may come before it: no badge row, no table of contents, no other heading.

Say what the project does in terms a newcomer can understand. Ask the maintainer if the audience or distinguishing feature is unclear. Put the evidenced distinction in the facts list.

Keep it to one sentence. Put supporting facts in the facts list below. The standard-readme spec's 120-character description cap is a useful target, not an additional enforced limit.

The same sentence appears in three places a reader may meet first: the README, the forge repository description, and the `description` field of any package manifest. Read all three and make them agree. A repository description that contradicts the README is a wrong answer served on every search result page, and nobody who reads it ever sees the correction. The forge description belongs to `oss-community`, which R-COM-07 names as its owner, so report a mismatch and hand the edit over rather than making it here.

### 3. Badges

Before writing or reviewing badges, read the [badge policy](references/badges.md) for placement, order, and the three-badge limit.

For install instructions or a version badge, read the reference for the project's distribution ecosystem: [npm](references/ecosystems/npm.md), [PyPI](references/ecosystems/pypi.md), [RubyGems](references/ecosystems/rubygems.md), [crates.io](references/ecosystems/crates.md), [Go modules](references/ecosystems/go-modules.md), [Packagist](references/ecosystems/packagist.md), [NuGet](references/ecosystems/nuget.md), [Maven Central](references/ecosystems/maven-central.md), [Hex](references/ecosystems/hex.md), [pub.dev](references/ecosystems/pubdev.md), [container images](references/ecosystems/containers.md).

Do not move the row above the `#` heading, and do not raise the cap. R-DOC-01 exists so a reader's first five seconds buy them the sentence, and a row above the title spends them on shields.

When improving an existing README, delete every badge beyond those three. If a deleted badge carried a real fact, such as a bundle size or a dependency count, state that fact as a bullet in the facts list instead, where it reads stronger than a badge.

### Table of contents, only where the renderer generates no outline

This is the one place a table of contents can go, which is why it sits here rather than in the numbered order. Add one only when the target renderer generates no outline and the README runs longer than about two screens. GitHub already generates an outline from headings, so do not duplicate it there unless the project publishes the README somewhere else that needs one.

### 4. Facts

Use this order: title, opening sentence, optional badges, optional table of contents, then three to five facts. Keep the facts above the first `##` heading. If a table of contents is needed here, leave it unheaded.

For R-DOC-10, say how one fact distinguishes the project from an alternative. Name a supported boundary, a measurement, or a competing project. Verify the distinction against source, a manifest, CI, or a linked measurement.

Every bullet answers a question the reader is actually asking. The five questions are:

- scope, meaning what the project covers and where it runs: forges, platforms, registries, runtimes, frameworks, languages
- scale, meaning how much the reader gets: counts of the things the project ships
- fit, meaning what the project asks of the reader: runtimes, prerequisites, dependency count, setup cost
- edge, meaning what distinguishes the project from an alternative and what evidence supports that distinction
- proof, meaning a measured benchmark, an exact size, or a short code comparison against the closest alternative

The scope bullet is not optional whenever the project has a boundary. It is the bullet that lets a reader self-select in or out, and it is the one most often missing, because a boundary lives in configuration and reference files rather than in the code an author is proud of.

A screenshot or diagram may replace a bullet where it replaces a paragraph of text, with alt text that carries the same information.

#### The rejection test

A candidate that answers none of the five questions is cut, however easy it was to extract from the source tree and however true it is. Ease of extraction is the trap: an author reading their own repository finds the facts the repository states about itself, not the facts a stranger needs.

Worked example, from this kit's own repository. "Every skill body stays under 500 lines" is true, checkable, and sitting in plain sight. It answers no reader question: nobody installs a project to obtain short files. The same evidence answers `fit` once it is turned around, as in "runs on Node 22 or Bun with nothing installed". The fact was never wrong, only pointed at the maintainer instead of the reader.

#### Gather, then let the maintainer pick

Never choose the final bullets alone. Sweep the repository for every candidate, then present the slate and stop.

1. Read the manifests, the lockfile, the CI configuration, the reference and configuration files, the release configuration, and the source. Collect every candidate fact and record the file each one came from.
2. Sort candidates into the five slots. Anything that fits no slot goes on the rejected list with the reason.
3. Present the slate: candidates grouped by slot, each with its source file, and the rejected list below with reasons. Show more candidates than will be used.
4. Ask the maintainer to pick three to five, and to supply anything the repository cannot prove, such as a benchmark, a real differentiator, or a support claim.
5. Write only what they picked.

A slate reads like this. This one is the slate this kit's own README came from:

```text
Candidate facts  (pick 3 to 5)

  scope  1. GitHub and GitLab, 57 of 61 rules on both
            src: STANDARD.md, Forges: lines
  scope  2. Publishing for npm, RubyGems, PyPI, crates.io
            src: skills/oss-publish/references/
  scale  3. 61 rules, each with the check it is scored by
            src: STANDARD.md, 61 "### R-" headings
  fit    4. Node 22 or Bun, nothing installed
            src: skills/oss-skill/scripts/validate.mjs
  edge   5. Unlike a checklist, the audit scores 61 rules and names the skill that fixes each failure.
            src: skills/oss-audit/SKILL.md

Rejected, answers no reader question:
  - every skill body under 500 lines
  - imports only Node built-in modules  (keep as evidence for fit 4)
```

Stopping here costs one round trip and is the only reliable filter. A writer left alone picks what the source tree makes easy, which is how a facts list ends up describing how a project is built rather than what it does.

#### Bullet shape

Lead with the claim in bold, close it with a period, then give the evidence:

```markdown
- **Both forges.** Scores GitHub and GitLab repositories.
- **No install.** The validator runs on Node 22 or Bun with nothing added.
```

The bold must be the claim, not a label. `- **Performance:** it is faster` is banned by oss-writing, and the carve-out that permits the form above is written there. Test it by deleting everything after the bold: "Performance." says nothing, so it was a label; "Both forges." says something, so it was a claim.

Bold is optional. A plain sentence bullet is fine, and a project whose facts do not compress into one-word claims should not force them.

### 5. Install and example

Use the ecosystem reference in section 3 even when the README has no badges. Show the project's actual setup, then a minimal usage example with its result. Place both before design, motivation, or comparisons. Fence the install command when there is one. For a build-file dependency, name the file and show the declaration, followed by any required fetch command. A second install method does not demonstrate usage.

Aim for 4 to 10 lines of usage, short enough to fit on the first screen with the opening and setup. Show the result in a comment when the language permits it. Otherwise, introduce a separate output block with a sentence naming the tool that produced it. This example adapts the kit's README:

````markdown
# oss-kit

Curated agent skills for open source maintainers.

- **61 rules.** Unlike a checklist, the audit scores each rule and names the skill that fixes each failure.
- **Both forges.** 57 of the 61 rules score GitHub and GitLab alike.

```bash
npx skills add svyatov/oss-kit
```

Then invoke the skill in Codex:

```text
$oss-audit Audit this repository against the oss-kit standard.
```

The audit prints this summary.

```text
Audited 52 applicable rules: 49 pass, 2 fail, 1 unknown, 9 not applicable.
```
````

Do not copy the shape from a README you have heard of. Well-known projects put a logo, a row of translation links, or a pull quote between the title and the opening sentence, and many place the install command well below the first example, so each teaches a departure from R-DOC-01 or R-DOC-02 along with the shape.

For a project with no install step, say so and show usage directly. If the resolved R-DOC-02 check requires an install command the project does not use, report that requirement as unmet.

### 6. Where to start, when there is more than one way in

A project that ships one command needs nothing here. A project that ships several commands, packages, subcommands, or skills has to answer which one a reader runs first, and R-DOC-02's install-then-example pair cannot answer it: the reader now has the thing installed and several doors.

Name exactly one thing to run first, in a sentence, and say what it gives back. When the parts have a natural sequence, give the sequence as a short list. When they do not, say so and stop; a fabricated order is worse than none.

Cover the empty-repository case separately when it differs, because a reader starting from nothing cannot use an entry point that inspects existing work.

```markdown
## Where to start

Run `oss-audit` first. It scores the repository and names which of the
other skills to run, in what order.

Starting from an empty repository, there is nothing to score yet:

1. `oss-community` for the license, code of conduct, and contributing guide
2. `oss-readme` for the README
3. `oss-ci` for tests on push and on every change request
```

This section rests on no external convention, because the published README guidance does not address projects with several entry points at all.

### 7. Getting started

A step-by-step guide for adding the tool to an existing project, with explicit commands the reader can copy without thinking. Cover every step, including documented runtime and tool prerequisites.

For creation or improvement, verify the runtime, prerequisites, package identity, and exact install command against the upstream installation instructions first. If provenance is unclear, stop before execution and report what you could not verify.

Run the guide in a disposable environment with its own home and the lowest supported runtime. Start in an empty directory with only the documented prerequisites. Run the steps in order and record the runtime and result. Fix gaps in the guide and retry there. If isolation or a prerequisite is unavailable, report which steps remain unverified.

### 8. Help and status

Two short items, usually near the links. Both satisfy rules, and both are cheap enough that omitting them is never a considered choice, only an oversight.

Say where to ask a question and where to report a defect, per R-DOC-08. The channel has to be public, searchable, and reachable by URL without proprietary client software, so that the next reader with the same question finds the answer already written. One link covers both when the project routes questions and defects to the same place, which for most projects means the issue tracker. A private mailbox does not count, and neither does an invite-only chat.

State the maintenance or support status. R-DOC-09 also accepts `DEPRECATED` as the first README heading or at the start of the repository description. A no-maintenance-intended badge or the forge's archived flag also satisfies the rule.

### 9. Links

For R-DOC-03, resolve the license under R-COM-01 and the contributing guide under R-COM-02. Find the changelog for each release unit under the project's convention in R-CHG-01. Link to the files at their accepted paths. Report missing targets.

## Formatting for skimmers

- Headings for hierarchy, horizontal rules between layers.
- Lists over dense paragraphs.
- On GitHub or GitLab, put a must-not-miss line in an alert: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, or `> [!CAUTION]`, each on its own line with the content in the blockquote below it.

  ```markdown
  > [!WARNING]
  > Version 3 drops Node 18. Pin to `^2` if you need it.
  ```

  GitHub and GitLab render these as callouts. For any other target renderer, verify the preview or use an ordinary blockquote because unsupported renderers may expose the `[!TYPE]` marker. Use alerts only for crucial information and limit them to one or two per README.
- Every section should reach a reason to keep reading quickly; a reader abandons at the first boring stretch.

## Every code block says what consumes it

R-DOC-07. A fenced block is a box of text, and a box of text carries no clue about where it goes. Two blocks in a row, one a shell command and one the body of a configuration file, render identically and get pasted into the same place.

Give every block a language tag. Where no tag fits, such as a prompt typed to an agent or a block of program output, use `text` rather than leaving the fence bare, so the absence of a tag never has to be interpreted.

Before each non-shell input block, name its destination: a file, tool, prompt, or configuration key. Before an output block, name the tool that produced it.

````markdown
Install it:

```bash
npx skills add svyatov/oss-kit
```

Invoke the audit skill in Codex:

```text
$oss-audit Audit this repository against the oss-kit standard.
```
````

A first-line comment inside the block naming the destination is a reasonable addition, and not a replacement: JSON and plain-text prompts have no comment syntax, which is exactly where the ambiguity is worst.

## Accuracy

Before finishing, read every package manifest, the lockfile, the CI configuration, the release configuration, and the source. Match every version number, install command, import path, CLI flag, prerequisite, and support claim quoted in the README against those files. For an installation command, also confirm that the upstream project or registry owner documents that exact package and command. A manifest proves what this checkout declares, not that an external package name is legitimate.

## Checklist before finishing

1. The first paragraph after the title is one sentence stating what the project is and who it is for.
2. The opening sentence, the forge repository description, and any manifest `description` field say the same thing.
3. Every number and claim is real: sourced from the repository, from the person who asked for the README, or from an actual measurement.
4. The facts list ran through the slate: candidates gathered with their sources, rejects named, and the maintainer picked the three to five that shipped.
5. A scope bullet names the forges, platforms, registries, or runtimes supported, unless the project genuinely has no boundary.
6. No shipped bullet describes how the project is built rather than what a reader gets.
7. A fact before the first `##` heading makes and supports the distinction required by R-DOC-10.
8. Actual setup comes before usage, and both precede design, motivation, or comparisons. Score the install command separately against R-DOC-02.
9. The usage example is self-explanatory and shows its result without invalid or misleading syntax.
10. Every fence has a language tag. A sentence identifies the destination of non-shell input or the producer of output.
11. A project with more than one entry point names exactly one to run first, and covers the empty-repository case when it differs.
12. The getting-started steps succeeded in the disposable environment on the lowest supported runtime. Mark this check unknown without run evidence.
13. A public, searchable channel is linked for questions and for defect reports.
14. The README states maintenance status, or one of the R-DOC-09 signals listed in section 8 applies.
15. The license, changelog, and contributing links resolve to the files identified in section 9.
16. Every version, command, and support claim matches the manifest, the CI configuration, and the source.
17. Skimming only headings and the facts list still tells the story.
18. The draft has been through oss-writing: `node <oss-writing skill directory>/scripts/prose.mjs README.md` (a sibling of this skill's directory) reports no findings. A hand-rolled grep for dashes or banned words does not count. Where oss-writing is not installed, say so rather than reporting this item as passing.
19. Every image has meaningful alt text, and repository images use relative paths.

For review, report failures and unknowns, then stop. For creation or improvement, fix checklist failures within scope and recheck the affected items. Apply the R-DOC checks resolved at entry. Report unmet requirements and unavailable evidence.
