---
name: oss-writing
description: "Write clear technical prose for anything that lives in a repository or on a forge: commit messages, PR titles and descriptions, PR and code review comments, issue text, READMEs, documentation, changelogs, ADRs, code comments, error and log messages. Use this whenever you are about to write or edit any of them, including short ones. A one-line commit message or a two-sentence review comment looks too small to need a skill, and that is exactly where the tells show up. Not for prose that needs a personal voice, such as blog posts, essays, or launch announcements."
license: MIT
---

# Repo prose

Technical register: neutral, specific, short. No personality injection, no marketing.

This skill owns how the sentence reads. The skill that owns the artifact owns what goes in it, and where a caller states an exception, the caller wins.

## Read the local contract first

Before drafting, read the repository's instructions, contribution guide, templates, and the most recent accepted examples of the same artifact. They decide the commit convention, the required sections, the terminology, and the audience. Follow the convention the repository declares rather than inventing one, and keep required template sections and legally mandated wording.

Verify every claim against the diff, the source, or command output. Prose that reads well and says something untrue is the one failure no rule below catches.

Sources: [Git, Submitting patches](https://git-scm.com/docs/SubmittingPatches), [GitHub, Helping others review your changes](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/helping-others-review-your-changes), [Google developer documentation style guide](https://developers.google.com/style), used under CC BY 4.0, and [ASD-STE100](https://www.asd-ste100.org/) for the sentence, paragraph, and noun-stack limits.

## Default to silence

The durable body defaults to none. The subject carries the change, and most changes end there. Keep the subject under 72 characters, counting any number the forge appends on squash.

Prose earns its place when it carries one of four things: the reason the behavior exists, the constraint that forced an unobvious choice, the alternative rejected and why, or the compatibility, security, or operational consequence. A body that paraphrases the diff is noise.

A body that exists says what is wrong now, then why this is better, then what was discarded, in that order. Write the status quo in the present tense: `the loader retries forever`, not `the loader used to retry forever`. The commit is what turns that sentence into history.

Keep it self-contained. Summarize the discussion that led here instead of linking to it, and cite a prior commit with `git show -s --pretty=reference`, which prints `f86a374 (subject, 2026-07-28)`.

A description running long is a signal to split the change into finer pieces, not to write more. Length and content are separate constraints, so never drop a breaking-change note to be shorter.

A change-request description differs from a commit body in one way: its reader arrives before the diff, not after. So it opens with a one-line statement of what changed even when nothing else earns a body, it names where to start reading when the diff is large enough that a reviewer would otherwise open the wrong file first, and it reports verification only when verification actually ran.

A required template section is not optional. Answer each at the shortest length that answers it. Where a section's honest answer is nothing, write that word rather than a paragraph. Where it asks for a status you do not have, write `Not run: <reason>`. Invent no scaffolding the repository does not ship.

A review comment names the concrete defect, states its consequence, and gives the required outcome, in about two sentences. Say whether it blocks or is optional, and use a suggestion block when the exact edit is known.

## Agent slop

These come from writing the message as a session log rather than a description of the change.

- One bullet per changed file, or a list of every path touched. The diff has that.
- A test plan describing verification that never ran.
- Your route to the fix: what you tried, what you ruled out, what you did next. The failure the change targets is evidence and belongs in the body; the session that found it does not. Name the runtime only when it is part of the reproduction, as for a prompt or a skill.
- Restating the subject line as the first line of the body.

## Composition

| Rule | Do this |
|------|---------|
| Prefer active voice | `parser drops trailing commas`, not `trailing commas are dropped`. Keep passive voice when the actor is unknown, irrelevant, or would blame the reader |
| Prefer positive form | `the cache expires after 60s`, not `the cache does not persist beyond 60s`. Keep a negative when prohibition is the point |
| Specific and concrete | `fails on files over 2 MB`, not `fails on large inputs` |
| Omit needless words | Cut every word, clause, or sentence whose removal changes nothing |
| Related words together | `only the retry path calls this`, not `this is only called by the retry path` |
| Emphatic word last | End the sentence on the thing that matters |
| One topic per paragraph | Each paragraph makes exactly one point |
| Parallel form | Bullets in a list share one grammatical shape |
| Name the referent | `the loader caches the manifest`, not `it caches it`. Replace `it`, `this`, and `that` with the noun when more than one antecedent is in scope |
| Cap noun stacks at three | `the timeout for the retry queue`, not `retry queue connection timeout value` |
| One instruction per step | A numbered step tells the reader to do one thing. Split a step hiding a second action behind `and` |
| Keep the articles | `the parser reads the file`, not `parser reads file`. Dropping articles and sentence parts is false brevity: it saves two words and costs a reread |
| Simple verb forms | `the loader retries`, not `the loader may potentially be retrying`. One tense, one modal, no auxiliary stack |
| Condition before instruction | `to skip the cache, pass --no-cache`, not `pass --no-cache to skip the cache` |
| Literal terms only | No idioms, slang, humor, violent metaphors, or unexplained abbreviations. One name per concept, matching the identifier in the code and the string in the UI |

Keep an instruction under 20 words and an explanation under 25. Cap a paragraph at six sentences and a noun stack at three words. Split what runs longer.

## Write timeless prose

Documentation describes what is true, with no reference to when it was written. Cut `currently`, `now`, `new`, `latest`, `soon`, `eventually`, `presently`, `at present`, `as of this writing`, `does not yet`, and `existing` or `old` used to contrast with something newer. Each one dates the sentence, and none survives the release that makes it wrong.

This rule covers documentation. A commit message, a change-request description, a changelog entry, and a migration guide are the exception, because describing a change is their job: there `now` marks the state this change produces, and cutting it costs the reader the contrast.

## Error messages and comments

Both are read by someone already stuck, so they answer a different question than descriptive prose does.

- An error or log line names what failed, the safe part of the input or location, and a likely corrective action: `config.yaml line 7: timeout must be a positive integer, got -1`. One distinct message per actionable condition. A log event also carries a stable event name, a severity, and the identifiers needed to find the operation again: request ID, safe path, count, duration. Measured fields, not adjectives. Never emit passwords, tokens, personal data, full request bodies, or unencoded attacker-controlled text.
- A comment explains why the code is surprising, not what it does. If it restates the line below it, delete it. What earns a comment is a constraint the code cannot show: a spec section, a vendor bug, a benchmark that ruled out the obvious approach.

## Check before returning

Read the draft against this list and fix what it catches.

- Find the longest sentence and count its words. Over 25, or over 20 in a numbered step, and it splits. Two clauses joined by `and` or `so` are usually two sentences; a relative clause opening with `which` is usually the second half of one. This is the limit a draft breaks most often, and the only one that needs counting rather than reading.
- No em dashes, en dashes, or ` -- `: in short technical prose they are a reliable machine-written tell, and a period, comma, colon, or pair of parentheses carries the same break.
- No emoji anywhere, including headings and bullets: their width and glyph vary by terminal and font, so they break alignment in the fixed-width contexts a repository lives in.
- No inline-header bullet lists (`- **Performance:** it is faster`): the bolded stub replaces the sentence that would have said what changed, so the reader gets a label instead of a claim. A bolded claim closed with a period is a different shape and is allowed (`- **Both forges.** Scores GitHub and GitLab repositories.`), because there the bold is the claim and what follows is its evidence. Tell them apart by deleting everything after the bold: "Performance." says nothing, so it was a label; "Both forges." says something, so it was a claim.
- Headings in sentence case, not Title Case: it is what the Google style guide prescribes, and mixing the two inside one document reads as text assembled from two sources.
- Straight ASCII quotes: curly quotes break a copy-paste into a shell or a config file, and the reader cannot tell by eye which they got.
- No exclamation marks, and nothing calling a task easy or simple: the reader for whom it is not now has a second problem.
- Never inflect a code element or use one as a verb: `send a POST request`, not `POST the data`; `the --force flag`, not `force it`.
- No promotional adjective describing the project: `robust`, `powerful`, `seamless`, `comprehensive`, `blazing`, `effortless`. Name the property instead: `retries 3 times`, `no config file`.
- No recap section restating what the text just said: the reader just read it, and a recap marks text written to a length rather than to a point.
- No `Generated with`, `Co-Authored-By: Claude`, or tool attribution footers: a trailer records who is accountable for the change, and a tool cannot be.
- No boilerplate caveats. State a precondition, limitation, or risk when it changes what the reader should do: a caveat that changes nothing trains the reader to skip the one that matters.
- No clause telling the reader how to weigh a fact just stated: delete the clause and see what is lost, and if no fact goes with it, it was defending the sentence rather than extending it. A rejected alternative, a constraint, or a consequence is a fact and stays.
- A body needs one of the four things above, or a required template section asking for it. If neither holds, delete the body and ship the subject.

If the draft still reads padded, generic, or promotional after that pass, the remaining fault is lexical. Check it against [references/tells.md](references/tells.md), which names each pattern and what to write instead.

## Do not touch

- Existing quoted code, error strings, log output, stack traces, and config samples: reproduce verbatim, including their dashes. This exception does not protect newly authored strings from review.
- Another person's words in a quote or a review thread reply.
- Identifier names, CLI flags, and file paths.
- Required legal, license, and externally mandated security-advisory wording.
- When editing prose a human wrote, fix only what is broken. Their voice is not a defect.

## Examples

Each example is a finished artifact. The name says which of the four things earned the body, or that none did.

<example name="commit, nothing earned a body">

```
fix(parser): handle empty input
```

</example>

<example name="commit, earned by a measurement">

```
perf(search): cache results per normalized query

Results are recomputed on every keystroke, which pins a CPU core during
peak hours. Caching for 5 minutes drops p99 from 1.4s to 210ms and costs
40 MB of resident memory.

Redis was rejected: a deploy clears the in-process cache, which is
acceptable at one replica and is not worth an operational dependency
until we scale out.
```

</example>

<example name="review comment">

```
Two goroutines can reach this branch at once, so the map write races and
the process dies under load. A sync.Map or a mutex around lines 40-48
fixes it. Blocking.
```

</example>

## Rules this skill owns

R-DOC-05: Documentation prose is plain, active, and free of marketing language
