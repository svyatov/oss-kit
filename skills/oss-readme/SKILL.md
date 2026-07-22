---
name: oss-readme
description: "Write or improve a README.md for an open source project. Use this for any request to create, rewrite, review, or polish a README, project description, or getting-started docs for a library, framework, or tool, or to make an open source project more attractive to users. Covers structure and section order. For the sentences themselves, oss-writing owns style. Do NOT use for internal or private repo docs, API reference generation, or CHANGELOG and CONTRIBUTING files."
license: MIT
---

# README structure

Apply the structure below when creating or improving a README. It follows Evil Martians' approach to promoting open source projects such as PostCSS, Nano ID, imgproxy, and AnyCable: put the reason to keep reading at the top, and the details below.

This skill owns section order and what each section must contain. It does not own how a sentence reads. Once the sections below are in place, apply oss-writing to the prose inside them.

Never invent facts. If the repository does not contain a piece of data you need, such as a benchmark, a file size, a real differentiator from alternatives, or a supported platform list, or you are not sure a number is accurate, ask for it instead of guessing. A README with a fabricated number is worse than one with no number at all.

## Section order

### 1. Title

A `#` heading naming the project. Nothing else goes in the heading text.

### 2. Opening sentence

Immediately below the title, one sentence stating what the project is and who it is for. Nothing may come before it: no badge row, no table of contents, no other heading.

Say what the project does in plain terms, without jargon a newcomer would have to look up. If you do not know who the project is for or what makes it different from the alternative a reader already knows, ask rather than guessing at a differentiator.

### 3. Badges

Optional, and at most three: version, CI, coverage, in that order. Own paragraph directly below the opening sentence, one badge per source line, so Markdown joins them into a single rendered row. Omit any of the three that does not apply and keep the rest in order; a repository where none apply gets no badge row. Exact URL templates per ecosystem are in [references/badges.md](references/badges.md); read that file before writing or editing a badge row.

When improving an existing README, delete every badge beyond those three. If a deleted badge carried a real fact, such as a bundle size or a dependency count, state that fact as a bullet in the facts list instead, where it reads stronger than a badge.

### 4. Facts

A bullet list of the project's most important facts, features, and differentiators from alternatives. Concrete evidence outranks a promise:

- a real benchmark number, asked for or measured, never estimated
- an exact size, measured or asked for, never guessed
- a short code comparison against the closest alternative
- a screenshot or diagram where it replaces a paragraph of text

### 5. Install and example

Two fenced code blocks back to back: an install command, then a minimal usage example, in that order. The second block must show the project being used, not a second way to install it; two install blocks with no usage block fails this section even when the two commands differ. Both must appear before any section about design, motivation, or comparisons.

Keep the usage example small, 4 to 10 lines, and show its output in a comment so the reader sees the result without running anything. Nano ID's opener packs the title, the opening sentence, the facts, and this pair on one screen:

````markdown
# Nano ID

A tiny, secure, URL-friendly, unique string ID generator for JavaScript.

- 118 bytes minified and brotlied, no dependencies
- 50% faster than uuid
- uses a hardware random generator, safe in clusters

```bash
npm install nanoid
```

```js
import { nanoid } from 'nanoid'
nanoid() //=> "V1StGXR8_Z5jdHi6B-myT"
```
````

If the project has no install step, for example a script meant to be copied, say so instead of showing an empty or invented command.

### 6. Getting started

A step-by-step guide for adding the tool to an existing project, with explicit commands the reader can copy without thinking. Cover every step; do not assume a step the reader already did. Validate the guide by following it from scratch as if you had never seen the project, and fix every gap you hit.

### 7. Links

Link the license file, `CHANGELOG.md`, and `CONTRIBUTING.md`. Confirm each target exists in the repository before adding the link.

### Table of contents

If the README runs longer than about two screens, add a table of contents after the badges and before the facts list. A short README does not need one.

## Formatting for skimmers

- Headings for hierarchy, horizontal rules between layers.
- Lists over dense paragraphs.
- Put a must-not-miss line in a GitHub alert: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, or `> [!CAUTION]`, each on its own line with the content in the blockquote below it.

  ```markdown
  > [!WARNING]
  > Version 3 drops Node 18. Pin to `^2` if you need it.
  ```

  GitHub renders these as colored callouts; every other renderer degrades them to a plain blockquote, so nothing breaks off-GitHub. Two or three per README at most: a page of callouts is a page with no emphasis.
- Every section should reach a reason to keep reading quickly; a reader abandons at the first boring stretch.

## Accuracy

Before finishing, read the package manifest, the CI configuration, and the source. Match every version number, install command, and CLI flag quoted in the README against what those files actually say.

## Checklist before finishing

1. The opening sentence alone states what the project is and who it is for, and nothing precedes it.
2. Every number and claim is real: sourced from the repository, from the person who asked for the README, or from an actual measurement.
3. The install and usage blocks appear in that order, before any design, motivation, or comparison content.
4. The usage example is self-explanatory and shows its output.
5. The getting-started guide works from a clean machine.
6. The license, changelog, and contributing links resolve to files that exist.
7. Every version, command, and support claim matches the manifest, the CI configuration, and the source.
8. Skimming only headings and the facts list still tells the story.
9. The draft has been through oss-writing.

## Rules this skill owns

R-DOC-01: The README opens with one sentence saying what the project does

R-DOC-02: The README shows how to install the project and one runnable example, in that order, near the top

R-DOC-03: The README links to the license, the changelog, and the contributing guide

R-DOC-04: Every version, command, and support claim in the README matches the repository
