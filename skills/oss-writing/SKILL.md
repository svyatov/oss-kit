---
name: oss-writing
description: "Write clear technical prose for anything that lives in a repository or on a forge: commit messages, PR titles and descriptions, PR and code review comments, issue text, READMEs, documentation, changelogs, ADRs, code comments, error and log messages. Use this whenever you are about to write or edit any of them, including short ones. A one-line commit message or a two-sentence review comment looks too small to need a skill, and that is exactly where the tells show up. Not for prose that needs a personal voice, such as blog posts, essays, or launch announcements."
license: MIT
---

# Repo prose

Technical register: neutral, specific, short. No personality injection, no marketing.

## Establish the local contract

Before drafting, read the repository's instructions, contribution guide, templates, nearby documents, and recent accepted examples of the same artifact. Local requirements decide commit structure, required change-request sections, terminology, line length, and audience. Preserve required template sections and legal or security wording. Verify every factual claim against the diff, source, command output, issue, or cited upstream source.

For commit messages, inspect `git log --no-merges` for the files in scope. If the repository requires Conventional Commits, use `<type>[optional scope]: <description>`, `!` or a `BREAKING CHANGE:` footer for incompatible changes, and any required trailers. Do not infer a convention from this skill's examples.

Sources: [Git, Submitting patches](https://git-scm.com/docs/SubmittingPatches), [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/), [GitHub, Helping others review your changes](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/helping-others-review-your-changes), [Google developer documentation style guide](https://developers.google.com/style), and [ASD-STE100](https://www.asd-ste100.org/) for the sentence, paragraph, and noun-stack limits.

## How much to write

The durable body defaults to none. The subject carries the change, and most changes end there.

Write the subject in the imperative, on one line, with no trailing period, under 72 characters counting the `(#NN)` a squash merge appends. Git's 50 predates the `type(scope): ` prefix, which spends 15 to 20 of those characters.

A body exists only when one of these holds:

- the why is not derivable from the subject and the diff together
- the change is breaking
- the commit reverts something
- it is a security fix or a data migration
- a future reader would otherwise retry an alternative this one rejected
- the change rests on a number or an outside source the diff does not contain: a benchmark you ran, a spec section, a vendor bug, an upstream deprecation. Give the number or the citation, not the adjective.

The body answers three things, in order: what is wrong now, why this fix, what was discarded.

Two additions belong only in a change-request description, because both assume the reader has the diff in front of them:

- where to start reading, when the diff is large enough that a reviewer would otherwise open the wrong file first
- verification, when it actually ran. Never imply verification that did not. Where a template asks for a status you do not have, write `Not run: <reason>`.

Where the forge reuses the description as the squash commit message, that description is the durable body. Write it as the commit body it is about to become.

Length and content are separate constraints. Say everything the triggers earn, in fewer words; never drop a breaking-change note to be shorter.

A required template section is not optional. Answer each one at the shortest length that answers it, and give a section whose honest answer is nothing that word rather than a paragraph. Invent no scaffolding the repository does not ship.

Prose earns its place when it carries the reason the behavior exists, the constraint that forced an unobvious choice, the alternative rejected and why, or the compatibility, security, or operational consequence. A commit body that paraphrases the diff is noise.

The remaining artifacts carry their own content:

| Artifact | Content |
|------|---------|
| Issue or bug report | Give expected and observed behavior, minimal reproduction, relevant environment and versions, frequency or scope, and sanitized evidence. Separate facts from hypotheses. |
| Review comment | Point to the concrete defect or question, explain its consequence, and state the required outcome, in about two sentences. Use a suggestion block when the exact edit is known. Distinguish blocking findings from optional ideas. |
| ADR | Record status, context, decision, rejected alternatives, consequences, and the conditions that would justify revisiting it. |
| Documentation | Describe the current product for a defined audience and task. State prerequisites before steps, keep procedures ordered, and tell the reader how to verify the result. |

## Wrapping, and where the text ends up

Write one paragraph per line, with no hard wrapping, for anything typed into a forge field: a change-request description, an issue, a review comment, a release note. Hard-wrap a file only if the repository already wraps its files. Forges disagree about what a single newline means, and unwrapped prose is the one form that renders correctly on all of them.

Before writing a change-request description, check whether the forge reuses it as the squash commit message. Where it does, that text becomes permanent history, and a heading, an unticked checkbox, or a leftover template comment survives there. [references/forge-rendering.md](references/forge-rendering.md) carries the per-forge behavior, the setting to read on each, and the double-wrap hazard.

## Say nothing when nothing needs saying

Length is not effort. Padding a trivial change into a structured document wastes the reader twice: once reading it, once distrusting the next one.

- Headings earn their place when the reader needs to navigate, roughly past a screenful. Do not open a short document with `## Summary`.
- A README section that repeats the code below it should be deleted, not rewritten.

## Composition rules

| Rule | Do this |
|------|---------|
| Prefer active voice | `parser drops trailing commas`, not `trailing commas are dropped`. Keep passive voice when the actor is unknown, irrelevant, or would blame the reader. |
| Prefer positive form | `the cache expires after 60s`, not `the cache does not persist beyond 60s`. Keep a negative requirement when prohibition is the point. |
| Specific and concrete | `fails on files over 2 MB`, not `fails on large inputs` |
| Omit needless words | Cut every word whose removal changes nothing |
| Related words together | `only the retry path calls this`, not `this is only called by the retry path` |
| Emphatic word last | End the sentence on the thing that matters |
| One topic per paragraph | Each paragraph makes exactly one point |
| Parallel form | Bullets in a list share one grammatical shape |
| Name the referent | `the loader caches the manifest`, not `it caches it`. Replace `it`, `this`, and `that` with the noun when more than one antecedent is in scope |
| Cap noun stacks at three | `the timeout for the retry queue`, not `retry queue connection timeout value` |
| One instruction per step | A numbered step tells the reader to do one thing. Split a step that hides a second action behind `and` |
| Keep the articles | `the parser reads the file`, not `parser reads file`. Dropping articles and sentence parts is false brevity: it saves two words and costs a reread |

Keep a sentence under 20 words in an instruction and under 25 in an explanation, and a paragraph under six sentences. Split what runs longer.

Machine-written prose also carries a lexicon these rules do not cover: inflated significance, promotional adjectives, tacked-on `-ing` clauses, empty contrast, signposting, hedging stacks. When a draft reads as padded, generic, or promotional, check it against [references/tells.md](references/tells.md), which names each pattern and what to write instead.

## Normative statements

Uppercase MUST, SHOULD, and MAY carry their RFC 2119 and RFC 8174 meanings, and only where the document says so in its own text. Use them in a specification, a rule statement, or a conformance section. Everywhere else write the plain verb: a README that shouts MUST at a reader has invented a requirement nobody is checking.

## Hard constraints

Check these before returning any text:

- No em dashes, en dashes, or ` -- `: in short technical prose they are a reliable machine-written tell, and a period, comma, colon, or pair of parentheses carries the same break.
- No emoji anywhere, including headings and bullets: their width and glyph vary by terminal and font, so they break alignment in the fixed-width contexts a repository lives in.
- No inline-header bullet lists (`- **Performance:** it is faster`): the bolded stub replaces the sentence that would have said what changed, so the reader gets a label instead of a claim. A bolded claim closed with a period is a different shape and is allowed (`- **Fast.** 50% faster than native crypto.randomUUID().`), because there the bold is the claim and what follows is its evidence. Tell them apart by deleting everything after the bold: "Performance." says nothing, so it was a label; "Fast." says something, so it was a claim.
- Headings in sentence case, not Title Case: it is what the Google developer style guide prescribes, and mixing the two inside one document reads as text assembled from two sources.
- No recap section restating what the text just said: the reader just read it, and a recap marks text written to a length rather than to a point.
- No `Generated with`, `Co-Authored-By: Claude`, or tool attribution footers: a trailer records who is accountable for the change, and a tool cannot be.
- No boilerplate caveats. State a precondition, limitation, or risk when it changes what the reader should do: a caveat that changes nothing trains the reader to skip the one that matters.
- Straight ASCII quotes: curly quotes break a copy-paste into a shell or a config file, and the reader cannot tell by eye which they got.
- A body exists only if you can name the trigger that earned it: if you cannot, delete the body and ship the subject.

## Do not touch

- Existing quoted code, error strings, log output, stack traces, and config samples: reproduce verbatim, including their dashes. This exception does not protect newly authored strings from review.
- Another person's words in a quote or a review thread reply.
- Identifier names, CLI flags, and file paths.
- Required legal, license, and externally mandated security-advisory wording.
- When editing prose a human wrote, fix only what is broken. Their voice is not a defect.

## Agent slop in git prose

These come from writing the message as a session log rather than a description of the change:

- One bullet per changed file, or a list of every path touched. The diff has that.
- A test plan describing verification that never ran.
- Your route to the fix: what you tried, what you ruled out, what you did next. The failure the change targets is evidence and belongs in the body; the session that found it does not. Name the runtime only when the runtime is part of the repro, as it is for a prompt or a skill.
- Restating the subject line as the first line of the body.

## Error messages and comments

Both are read by someone who is already stuck, so they answer a different question than descriptive prose does.

- An error or log line names what failed, the safe part of the input or location, and a likely corrective action: `config.yaml line 7: timeout must be a positive integer, got -1`. One distinct message per actionable condition. A log event also carries a stable event name, a severity, and the structured identifiers needed to find the operation again: request ID, safe path, count, duration. Measured fields, not adjectives. Never emit passwords, tokens, personal data, full request bodies, or unencoded attacker-controlled text.
- A comment explains why the code is surprising, not what it does. If it restates the line below it, delete it. The case that earns a comment is a constraint the code cannot show: a spec section, a vendor bug, a benchmark that ruled out the obvious approach.

## Global and accessible prose

Use literal terms in their primary sense. Avoid idioms, slang, humor, violent metaphors, culture-specific references, and unexplained abbreviations. Keep one name per concept and match product and UI terminology exactly. Use descriptive link text that still makes sense out of context. Put conditions before instructions, and repeat a noun when the repetition removes ambiguity.

## Examples

Each example is a finished artifact at one rung. The name says which trigger earned the body, or that none did.

<example name="commit, no trigger">

```
fix(parser): handle empty input
```

</example>

<example name="commit, trigger: why not derivable">

```
fix(auth): refresh tokens 30s before expiry

Clock skew against the IdP reached 12s, so tokens refreshed exactly at
expiry were rejected about 1 in 400 times. 30s covers the observed skew
with margin, and the extra refresh cost is negligible.
```

</example>

<example name="commit, trigger: measurement">

```
perf(search): cache results per normalized query

Results were recomputed on every keystroke, pinning a CPU core during
peak hours. Caching for 5 minutes drops p99 from 1.4s to 210ms and costs
40 MB of resident memory, which is what pays for the cache.

The cache is in-process, so a deploy clears it. That is fine at one
replica and needs Redis if we scale out.
```

</example>

<example name="change-request description">

```
Search results were recomputed on every keystroke, which pinned a CPU core during peak hours. Results are now cached per normalized query for 5 minutes.

Verified with bench/load.sh: p99 drops from 1.4s to 210ms.
```

</example>

<example name="review comment">

```
Two goroutines can reach this branch at once, so the map write races.
A sync.Map or a mutex around lines 40-48 fixes it.
```

</example>

## Rules this skill owns

R-DOC-05: Documentation prose is plain, active, and free of marketing language
