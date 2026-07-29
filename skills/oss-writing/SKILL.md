---
name: oss-writing
description: "Write clear technical prose for anything that lives in a repository or on a forge: commit messages, PR titles and descriptions, PR and code review comments, issue text, READMEs, documentation, changelogs, ADRs. Use this whenever you are about to write or edit any of them, including short ones. A one-line commit message or a two-sentence review comment looks too small to need a skill, and that is exactly where the tells show up. Not for prose that needs a personal voice, such as blog posts, essays, or launch announcements."
license: MIT
---

# Repo prose

Write with clarity and force for a non-English-native reader. Maximize signal per line. Be terse.

This skill owns how the sentence reads. The skill that owns the artifact owns what goes in it, and where a caller states an exception, the caller wins.

## Limited Context Strategy

When context is tight:

1. Write your draft using judgment
2. Dispatch a subagent with your draft and the relevant section file
3. Have the subagent copyedit and return the revision

Loading a single reference instead of everything saves significant context!

## Read the local contract first

Before drafting, read the repository's instructions, contribution guide, templates, and the most recent accepted examples of the same artifact. They decide the commit convention, the required sections, the terminology, and the audience. Follow the convention the repository declares rather than inventing one, and keep required template sections and legally mandated wording.

Verify every claim against the diff, the source, or command output. Prose that reads well and says something untrue is the one failure no rule below catches.

## Core rules (all artifacts)

- Form possessive singular by adding 's
- Enclose parenthetic expressions between commas
- Comma before conjunction introducing co-ordinate clause
- Don't join independent clauses by comma
- Don't break sentences in two
- Participial phrase at beginning refers to grammatical subject
- Use active voice. Name who acts.
- Use the imperative or present tense. Avoid complex tenses.
- State things in positive form. Say what is, not what is not.
- Use specific, concrete, definite words. Cut abstraction.
- Keep related words together.
- Omit needless words. Never drop a word that carries a fact, condition, or scope.
- Avoid succession of loose sentences.
- Express co-ordinate ideas in similar form.
- Keep related words together.
- Keep to one tense in summaries.
- Write one instruction per sentence.
- Keep procedural sentences to 20 words. Keep descriptive sentences to 25 words.
- Write one topic per paragraph. Use at most six sentences per paragraph.
- Do not stack more than three nouns in a row. (See noun-cluster example below.)
- Use parallel form for parallel ideas.
- Put the most important word at the end of the sentence.
- Use second person ("you") for the reader. Do not use "we" for the reader.
- Use sentence case for headings and titles.
- Use serial commas.
- Put conditions before instructions.
- Use vertical lists for complex or sequential content.
- Do not use em-dash or en-dash. Use a period, comma, colon, or parentheses.
- Do not use the banned phrases in [references/linting.md](references/linting.md). Use the preferred word.

### One-instruction-per-sentence (ambiguous without example)

- Bad: Install the package and then set the token before you run the build.
- Good: Install the package. Set the token. Run the build.

### Noun cluster (ambiguous without example)

- Bad: network access cost optimization proposal
- Good: a proposal to optimize the cost of network access

## Triggers (read the reference before writing)

- Before writing a commit message or PR description, read [references/commits-and-prs.md](references/commits-and-prs.md).
- Before writing or replying to a review comment, read [references/code-review.md](references/code-review.md).
- Before writing a README or documentation, read [references/docs-and-readme.md](references/docs-and-readme.md).
- Before writing agent-facing text (AGENTS.md, skills, prompts), apply the Core rules at full strictness: one meaning per word, no dropped words, 20-word sentences.

## Check before returning

Read the draft against this list and fix what it catches.

- No em dashes, en dashes, or ` -- `: in short technical prose they are a reliable machine-written tell, and a period, comma, colon, or pair of parentheses carries the same break.
- No emoji anywhere, including headings and bullets: their width and glyph vary by terminal and font, so they break alignment in the fixed-width contexts a repository lives in.
- Headings in sentence case, not Title Case: it is what the Google style guide prescribes, and mixing the two inside one document reads as text assembled from two sources.
- Straight ASCII quotes: curly quotes break a copy-paste into a shell or a config file, and the reader cannot tell by eye which they got.
- Never inflect a code element or use one as a verb: `send a POST request`, not `POST the data`; `the --force flag`, not `force it`.
- No promotional adjective describing the project: `robust`, `powerful`, `seamless`, `comprehensive`, `blazing`, `effortless`. Name the property instead: `retries 3 times`, `no config file`.
- No recap section restating what the text just said: the reader just read it, and a recap marks text written to a length rather than to a point.
- No `Generated with`, `Co-Authored-By: Claude`, or tool attribution footers: a trailer records who is accountable for the change, and a tool cannot be.
- No boilerplate caveats. State a precondition, limitation, or risk when it changes what the reader should do: a caveat that changes nothing trains the reader to skip the one that matters.
- No clause telling the reader how to weigh a fact just stated: delete the clause and see what is lost, and if no fact goes with it, it was defending the sentence rather than extending it. A rejected alternative, a constraint, or a consequence is a fact and stays.

If the draft still reads padded, generic, or promotional after that pass, the remaining fault is lexical. Check it against [references/tells.md](references/tells.md), which names each pattern and what to write instead.

To enforce the mechanical half of this list in a repository's CI rather than in review, see [references/linting.md](references/linting.md), which maps each checkable rule onto a checker and says which rules no checker can decide.

## Do not touch

- Existing quoted code, error strings, log output, stack traces, and config samples: reproduce verbatim, including their dashes. This exception does not protect newly authored strings from review.
- Another person's words in a quote or a review thread reply.
- Identifier names, CLI flags, and file paths.
- Required legal, license, and externally mandated security-advisory wording.
- When editing prose a human wrote, fix only what is broken. Their voice is not a defect.

## Rules this skill owns

R-DOC-05: Documentation prose is plain, active, and free of fluff.
