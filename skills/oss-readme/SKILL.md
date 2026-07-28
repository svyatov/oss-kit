---
name: oss-readme
description: "Write or improve a README.md for an open source project. Use this for any request to create, rewrite, review, or polish a README, project description, or getting-started docs for a library, framework, or tool, or to make an open source project more attractive to users. Covers structure and section order. For the sentences themselves, oss-writing owns style. Do NOT use for internal or private repo docs, API reference generation, or CHANGELOG and CONTRIBUTING files."
license: MIT
---

# README structure

Apply the structure below when creating or improving a README. It follows Evil Martians' approach to promoting open source projects: put the reason to keep reading at the top, and the details below.

This skill owns section order and what each section must contain. It does not own how a sentence reads. Once the sections below are in place, apply oss-writing to the prose inside them.

Never invent facts. If the repository does not contain a piece of data you need, such as a benchmark, a file size, a real differentiator from alternatives, or a supported platform list, or you are not sure a number is accurate, ask for it instead of guessing. A README with a fabricated number is worse than one with no number at all.

## Section order

### 1. Title

A `#` heading naming the project. Nothing else goes in the heading text.

### 2. Opening sentence

Immediately below the title, one sentence stating what the project is and who it is for. Nothing may come before it: no badge row, no table of contents, no other heading.

Say what the project does in plain terms, without jargon a newcomer would have to look up. If you do not know who the project is for or what makes it different from the alternative a reader already knows, ask rather than guessing at a differentiator. The differentiator does not belong in this sentence. It goes in the `edge` bullet of the facts list below, which is where R-DOC-10 looks for it and where a number can sit beside it.

Keep it short. The standard-readme spec caps a description at 120 characters, which is a useful ceiling rather than a limit this skill enforces. A two-sentence opener earns its second sentence only when the second sentence carries a fact the first cannot.

The same sentence appears in three places a reader may meet first: the README, the forge repository description, and the `description` field of any package manifest. Read all three and make them agree. A repository description that contradicts the README is a wrong answer served on every search result page, and nobody who reads it ever sees the correction.

### 3. Badges

Optional, and at most three: version, CI, coverage, in that order. Own paragraph directly below the opening sentence, one badge per source line, so Markdown joins them into a single rendered row. Omit any of the three that does not apply and keep the rest in order; a repository where none apply gets no badge row. Exact URL templates per ecosystem are in [references/badges.md](references/badges.md); read that file before writing or editing a badge row.

Many well-known projects put their badge row above the `#` heading, and the skill this one was forked from deletes badges altogether as a drag on readability. This skill diverges from both on purpose. R-DOC-01 exists so a reader's first five seconds buy them the sentence, and a row above the title spends them on shields; the three kept here survive because each shows a live fact that changes without anyone editing the README, which is the test [references/badges.md](references/badges.md) applies and the reason it cuts everything else. The divergence is safe only because of the cap of three; do not move the row up, and do not raise the cap.

When improving an existing README, delete every badge beyond those three. If a deleted badge carried a real fact, such as a bundle size or a dependency count, state that fact as a bullet in the facts list instead, where it reads stronger than a badge.

### 4. Facts

Three to five bullets directly under the tagline, or under the badge row when there is one. No heading introduces them. A `## Features` heading turns a pitch into a spec sheet and pushes the list below the fold, which is the one place it cannot do its job.

This list is where R-DOC-10 is satisfied: at least one bullet has to name a boundary, a measured number, or a competing project, and that name has to be checkable against the repository. A list of five adjectives passes no rule here.

Every bullet answers a question the reader is actually asking. The five questions are:

- scope, meaning what the project covers and where it runs: forges, platforms, registries, runtimes, frameworks, languages
- scale, meaning how much the reader gets: counts of the things the project ships
- fit, meaning what the project asks of the reader: runtimes, prerequisites, dependency count, setup cost
- edge, meaning what it beats, named, with a number
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

  scope  1. GitHub and GitLab, 49 of 53 rules on both
            src: STANDARD.md, Forges: lines
  scope  2. Publishing for npm, RubyGems, PyPI, crates.io
            src: skills/oss-publish/references/
  scale  3. 53 rules, each with the check it is scored by
            src: STANDARD.md, 53 "### R-" headings
  fit    4. Node 22 or Bun, nothing installed
            src: skills/oss-skill/scripts/validate.mjs
  edge   5. Scores a repository, where a checklist only lists it
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

Two fenced code blocks back to back: an install command, then a minimal usage example, in that order. The second block must show the project being used, not a second way to install it; two install blocks with no usage block fails this section even when the two commands differ. Both must appear before any section about design, motivation, or comparisons.

Keep the usage example small, 4 to 10 lines, and show its result when a short language comment can do so without making the example invalid or misleading. Otherwise show the output in a separate fenced block. The title, the opening sentence, the facts, and this pair fit on one screen together. Here is that shape, carrying the slate above through to what it produced. This is `README.md` from the repository this skill ships in, abridged to two facts and with its badge row cut:

````markdown
# oss-kit

Curated agent skills for open source maintainers.

- **53 rules.** Each states the check it is scored by and the one skill that
  fixes it.
- **Both forges.** 49 of the 53 rules score GitHub and GitLab alike.

```bash
npx skills add svyatov/oss-kit --skill '*'
```

Then ask your agent:

```text
Audit this repository against the oss-kit standard.
```

```text
Audited 46 applicable rules: 43 pass, 2 fail, 1 unknown, 7 not applicable.
```
````

The example is this repository on purpose, and not a project you have heard of. Well-known projects put a logo, a row of translation links, or a pull quote between the title and the opening sentence, and many place the install command well below the first example. Each is a defensible choice for a project with that problem, and each fails R-DOC-01 or R-DOC-02, so quoting one would teach the departure along with the shape. An invented project would carry no such baggage but would name a package somebody can register later, pointing an install command at code nobody vetted.

If the project has no install step, for example a script meant to be copied, say so instead of showing an empty or invented command.

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

Unlike the rest of this file, this section rests on no external convention. The published README guidance does not address projects with several entry points at all. It is here because the question gets asked and nothing else in the structure answers it, so weigh it accordingly when it conflicts with something better grounded.

### 7. Getting started

A step-by-step guide for adding the tool to an existing project, with explicit commands the reader can copy without thinking. Cover every step, including documented runtime and tool prerequisites. Validate the guide in an isolated temporary directory with the lowest supported runtime and only the prerequisites the guide names. Do not change global configuration or install packages globally to make the guide pass. Fix every gap you hit.

### 8. Help and status

Two short items, usually near the links. Both satisfy rules, and both are cheap enough that omitting them is never a considered choice, only an oversight.

Say where to ask a question and where to report a defect, per R-DOC-08. The channel has to be public, searchable, and reachable by URL without proprietary client software, so that the next reader with the same question finds the answer already written. One link covers both when the project routes questions and defects to the same place, which for most projects means the issue tracker. A private mailbox does not count, and neither does an invite-only chat.

Say whether the project is maintained, per R-DOC-09. One sentence about the support the maintainer intends to give. A project that has stopped says so in the first heading of the README, or in the repository description, or with a no-maintenance-intended badge, or by being archived; any of those satisfies the rule without a sentence.

### 9. Links

Link the license file, `CHANGELOG.md`, and `CONTRIBUTING.md`. Confirm each target exists in the repository before adding the link.

### Table of contents

If the target renderer does not generate an outline and the README runs longer than about two screens, add a table of contents after the badges and before the facts list. GitHub already generates an outline from headings, so do not duplicate it there unless the project also publishes the README somewhere that needs one.

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

Then, for every block whose destination is not "paste this in a terminal", put one short sentence above it naming the destination: a file path, a tool, a prompt, a configuration key.

````markdown
Install it:

```bash
npx skills add svyatov/oss-kit
```

Then ask your agent:

```text
Audit this repository against the oss-kit standard.
```

Add to `.eslintrc.json`:

```json
{ "extends": ["oss-kit"] }
```
````

A first-line comment inside the block naming the destination is a reasonable addition, and not a replacement: JSON and plain-text prompts have no comment syntax, which is exactly where the ambiguity is worst.

## Accuracy

Before finishing, read every package manifest, the lockfile, the CI configuration, the release configuration, and the source. Match every version number, install command, import path, CLI flag, prerequisite, and support claim quoted in the README against those files. For an installation command, also confirm that the upstream project or registry owner documents that exact package and command. A manifest proves what this checkout declares, not that an external package name is legitimate.

## Checklist before finishing

1. The opening sentence alone states what the project is and who it is for, and nothing precedes it.
2. The opening sentence, the forge repository description, and any manifest `description` field say the same thing.
3. Every number and claim is real: sourced from the repository, from the person who asked for the README, or from an actual measurement.
4. The facts list ran through the slate: candidates gathered with their sources, rejects named, and the maintainer picked the three to five that shipped.
5. A scope bullet names the forges, platforms, registries, or runtimes supported, unless the project genuinely has no boundary.
6. No shipped bullet describes how the project is built rather than what a reader gets.
7. At least one bullet above the first `##` heading names a boundary, a measured number, or a competing project, and the repository backs it.
8. The install and usage blocks appear in that order, before any design, motivation, or comparison content.
9. The usage example is self-explanatory and shows its result without invalid or misleading syntax.
10. Every fenced block carries a language tag, and every block not destined for a shell has a sentence above it naming where it goes.
11. A project with more than one entry point names exactly one to run first, and covers the empty-repository case when it differs.
12. The getting-started guide works in an isolated directory with the lowest supported runtime and only its stated prerequisites.
13. A public, searchable channel is linked for questions and for defect reports.
14. The maintenance status is stated, or an equivalent repository signal carries it.
15. The license, changelog, and contributing links resolve to files that exist.
16. Every version, command, and support claim matches the manifest, the CI configuration, and the source.
17. Skimming only headings and the facts list still tells the story.
18. The draft has been through oss-writing.
19. Every image has meaningful alt text, and repository images use relative paths.

## Rules this skill owns

R-DOC-01: The README opens with one sentence saying what the project does

R-DOC-02: The README shows how to install the project and one runnable example, in that order, near the top

R-DOC-03: The README links to the license, the changelog, and the contributing guide

R-DOC-04: Every version, command, and support claim in the README matches the repository

R-DOC-06: The README names what the project covers and where it runs

R-DOC-07: Every fenced code block in the README says what consumes it

R-DOC-08: The README links a public place to ask a question and report a problem

R-DOC-09: The README says whether the project is maintained

R-DOC-10: The README names one thing that sets the project apart, with evidence
