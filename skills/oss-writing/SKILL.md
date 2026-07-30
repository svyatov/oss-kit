---
name: oss-writing
description: "Write clear technical prose for anything that lives in a repository or on a forge: commit messages, PR titles and descriptions, PR and code review comments, issue text, READMEs, documentation, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, changelogs, ADRs. Use it when someone says commit this, open a PR, reply to a review comment, or file an issue. Use this whenever you are about to write or edit any of them, including short ones. A one-line commit message or a two-sentence review comment looks too small to need a skill, and that is exactly where the tells show up. Not for prose that needs a personal voice, such as blog posts, essays, or launch announcements."
license: MIT
---

# Repo prose

Write with clarity and force for a reader whose first language is not English. Be terse.

This skill owns how the sentence reads, which is one rule: R-DOC-05 documentation prose. The skill that owns the artifact owns what goes in it, and where a caller states an exception, the caller wins.

## Read the local contract first

Before drafting, read the repository's instructions, contribution guide, templates, and the most recent accepted examples of the same artifact. They decide the commit convention, the required sections, the terminology, and the audience. Follow the convention the repository declares rather than inventing one, and keep required template sections and legally mandated wording.

Verify every claim against the diff, the source, or command output. Prose that reads well and says something untrue is the one failure no rule below catches.

## Core rules (all artifacts)

- State things in positive form. Keep a negative where prohibition is the point.
- Use specific, concrete, definite words: `fails on files over 2 MB`, not `fails on large inputs`.
- Omit needless words. Never drop a word that carries a fact, condition, or scope.
- Avoid succession of loose sentences.
- Keep related words together.
- Keep to one tense in summaries.
- Write one instruction per sentence.
- Keep an instruction to 20 words. Keep any other sentence to 25.
- Write one topic per paragraph. Use at most six sentences per paragraph.
- Do not stack more than three nouns in a row.
- Use parallel form for parallel ideas.
- Put the most important word at the end of the sentence.
- Use serial commas.
- Put conditions before instructions: "to reset the cache, run `make clean`".
- Use vertical lists for complex or sequential content.

### One instruction per sentence

- Bad: Install the package and then set the token before you run the build.
- Good: Install the package. Set the token. Run the build.

### Noun cluster

- Bad: network access cost optimization proposal
- Good: a proposal to optimize the cost of network access

## Triggers (read the reference before writing)

- Before writing a commit message or change request description, read [references/commits-and-change-requests.md](references/commits-and-change-requests.md).
- Before writing or replying to a review comment, read [references/code-review.md](references/code-review.md).
- Before writing a README or documentation, read [references/docs-and-readme.md](references/docs-and-readme.md).
- Before writing agent-facing text (AGENTS.md, skills, prompts), hold every sentence to 20 words and keep one meaning per word.

Ship the revision, not the draft.

## Check before returning

Read the draft against this list and fix what it catches.

- Find the longest sentence and count its words. Over 25, or over 20 for an instruction, and it splits. Two clauses joined by `and` or `so` are usually two sentences; a relative clause opening with `which` is usually the second half of one. This is the limit a draft breaks most often, and the only one that needs counting rather than reading.
- No em dashes, en dashes, or ` -- `. In short technical prose they are a reliable machine-written tell. A period, comma, colon, or pair of parentheses carries the same break.
- No emoji anywhere, including headings and bullets. Their width and glyph vary by terminal and font, so they break alignment in fixed-width contexts.
- Headings in sentence case, not Title Case. The Google style guide prescribes it. Mixing the two inside one document reads as text assembled from two sources.
- Straight ASCII quotes. Curly quotes break a copy-paste into a shell or a config file, and the reader cannot tell by eye which they got.
- Never inflect a code element or use one as a verb: `send a POST request`, not `POST the data`; `the --force flag`, not `force it`.
- No promotional adjective describing the project: `robust`, `powerful`, `seamless`, `comprehensive`, `blazing`, `effortless`. Name the property instead: `retries 3 times`, `no config file`.
- No recap section restating what the text just said. The reader just read it. A recap marks text written to a length rather than to a point.
- No `Generated with`, `Co-Authored-By: Claude`, or tool attribution footers. A trailer records who is accountable for the change, and a tool cannot be.
- No boilerplate caveats. State a precondition, limitation, or risk when it changes what the reader should do. A caveat that changes nothing trains the reader to skip the one that matters.
- No clause telling the reader how to weigh a fact just stated. Delete the clause and see what is lost. If no fact goes with it, it was defending the sentence rather than extending it. A rejected alternative, a constraint, or a consequence is a fact and stays.

Fix what the list catches, then read the revision against the list again, because a rewritten sentence can break a rule the original passed. Return the draft only when a full pass catches nothing.

If the draft still reads padded, generic, or promotional after that pass, the remaining fault is lexical. Check it against [references/tells.md](references/tells.md), which names each pattern and what to write instead.

To enforce the mechanical half of this list in CI rather than in review, see [references/linting.md](references/linting.md). It maps each checkable rule onto a checker, and names the rules no checker can decide.

## Do not touch

- Existing quoted code, error strings, log output, stack traces, and config samples: reproduce verbatim, including their dashes. This exception does not protect newly authored strings from review.
- Another person's words in a quote or a review thread reply.
- Identifier names, CLI flags, and file paths.
- Required legal, license, and externally mandated security-advisory wording.
- When editing prose a human wrote, fix only what is broken. Their voice is not a defect.
