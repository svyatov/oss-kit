---
name: oss-writing
description: "Write clear technical prose for anything that lives in a repository or on a forge: commit messages, PR titles and descriptions, PR and code review comments, issue text, READMEs, documentation, changelogs, ADRs, code comments, error and log messages. Use this whenever you are about to write or edit any of them, including short ones. A one-line commit message or a two-sentence review comment looks too small to need a skill, and that is exactly where the tells show up. Not for prose that needs a personal voice, such as blog posts, essays, or launch announcements."
license: MIT
---

# Repo prose

Technical register: neutral, specific, short. No personality injection, no marketing.

## Establish the local contract

Before drafting, read the repository's instructions, contribution guide, templates, nearby documents, and recent accepted examples of the same artifact. Local requirements decide commit structure, required pull request sections, terminology, line length, and audience. Preserve required template sections and legal or security wording. Verify every factual claim against the diff, source, command output, issue, or cited upstream source.

For commit messages, inspect `git log --no-merges` for the files in scope. If the repository requires Conventional Commits, use `<type>[optional scope]: <description>`, `!` or a `BREAKING CHANGE:` footer for incompatible changes, and any required trailers. Do not infer a convention from this skill's examples.

Sources: [Git, Submitting patches](https://git-scm.com/docs/SubmittingPatches), [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/), [GitHub, Helping others review your changes](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/helping-others-review-your-changes), and [Google developer documentation style guide](https://developers.google.com/style).

## Match the content to the artifact

| Artifact | Content |
|------|---------|
| Commit | The subject summarizes the change. The body explains the problem, intent, constraints, discarded alternatives, compatibility impact, and why this solution is appropriate. Skip implementation details the patch makes obvious. |
| Pull request | State the purpose, user-visible or architectural result, important implementation boundary, risks, related context, and verification actually performed. For a large change, tell reviewers where to start. |
| Issue or bug report | Give expected and observed behavior, minimal reproduction, relevant environment and versions, frequency or scope, and sanitized evidence. Separate facts from hypotheses. |
| Review comment | Point to the concrete defect or question, explain its consequence, and state the required outcome. Use a suggestion block when the exact edit is known. Distinguish blocking findings from optional ideas. |
| ADR | Record status, context, decision, rejected alternatives, consequences, and the conditions that would justify revisiting it. |
| Documentation | Describe the current product for a defined audience and task. State prerequisites before steps, keep procedures ordered, and tell the reader how to verify the result. |

Prose earns its place when it carries context the code or interface cannot:

- the reason the behavior exists
- the constraint that forced an unobvious choice
- the alternative rejected and why
- the compatibility, security, or operational consequence

A commit body that paraphrases the diff is noise. A pull request still needs an overview of the behavioral change so a reviewer can orient before reading the diff.

## Say nothing when nothing needs saying

Length is not effort. Padding a trivial change into a structured document wastes the reader twice: once reading it, once distrusting the next one.

- Subject line says everything? Write no body.
- Headings earn their place when the reader needs to navigate, roughly past a screenful. A short PR body is two or three paragraphs, not `## Summary` and `## Test plan`.
- Nothing was verified? Never imply that it was. If a template or the risk of the change calls for verification status, write `Not run: <reason>`.
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

A sentence past roughly 20 words in an instruction, or 25 in an explanation, is a signal to split it, not a limit to count against.

Machine-written prose also carries a lexicon these rules do not cover: inflated significance, promotional adjectives, tacked-on `-ing` clauses, empty contrast, signposting, hedging stacks. When a draft reads as padded, generic, or promotional, and before returning anything longer than a sentence, check it against [references/tells.md](references/tells.md), which names each pattern and what to write instead.

## Normative statements

Uppercase MUST, SHOULD, and MAY carry their RFC 2119 and RFC 8174 meanings, and only where the document says so in its own text. Use them in a specification, a rule statement, or a conformance section. Everywhere else write the plain verb: a README that shouts MUST at a reader has invented a requirement nobody is checking.

## Hard constraints

Check these before returning any text:

- No em dashes, en dashes, or ` -- `. Replace with a period, comma, colon, or parentheses.
- No emoji anywhere, including headings and bullets.
- No inline-header bullet lists (`- **Performance:** it is faster`). Write prose or a plain list.
- Headings in sentence case, not Title Case.
- No recap section restating what the text just said.
- No `Generated with`, `Co-Authored-By: Claude`, or tool attribution footers.
- No boilerplate caveats. State a precondition, limitation, or risk when it changes what the reader should do.
- Straight ASCII quotes.

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
- The body narrating your working process: what you tried, what failed, what you then did.
- Restating the subject line as the first line of the body.

## Error messages and comments

Both are read by someone who is already stuck, so they answer a different question than descriptive prose does.

- Use one distinct error message per actionable condition. Name what failed, the safe part of the input or location, and a likely corrective action: `config.yaml line 7: timeout must be a positive integer, got -1`. Do not echo passwords, tokens, personal data, full request bodies, or attacker-controlled text without safe encoding.
- A log event carries a stable event name, appropriate severity, and structured identifiers needed to find the operation again: request ID, safe path, count, duration. Do not log secrets or personal data. Do not use adjectives where a measured field works.
- A comment explains why the code is surprising, not what it does. If it restates the line below it, delete it. The case that earns a comment is a constraint the code cannot show: a spec section, a vendor bug, a benchmark that ruled out the obvious approach.

## Global and accessible prose

Use literal terms in their primary sense. Avoid idioms, slang, humor, violent metaphors, culture-specific references, and unexplained abbreviations. Keep one name per concept and match product and UI terminology exactly. Use descriptive link text that still makes sense out of context. Put conditions before instructions, and repeat a noun when the repetition removes ambiguity.

## Examples

Commit body:

```
Bad:  refactor(auth): improve token handling

      This commit refactors the token handling logic to be more robust and
      maintainable, updating the refresh function and error handling.

Good: fix(auth): refresh tokens 30s before expiry

      Clock skew against the IdP reached 12s, so tokens refreshed exactly
      at expiry were rejected about 1 in 400 times. 30s covers it.
```

Pull request description:

```
Bad:  ## Summary
      - Added a new caching layer
      - Updated the service to use it

      This significantly improves performance and enhances the user
      experience by reducing load times.

Good: Search results were recomputed on every keystroke, which pinned a CPU
      core during peak hours. Results are now cached per normalized query
      for 5 minutes. The cache is in-process, so a deploy clears it: fine
      at one replica, needs Redis if we scale out.

      Verified with bench/load.sh: p99 drops from 1.4s to 210ms.
```

Review comment:

```
Bad:  Great catch on the null check! One small thing to consider: it might
      potentially be worth thinking about concurrent access here.
Good: Two goroutines can reach this branch at once, so the map write races.
      A sync.Map or a mutex around lines 40-48 fixes it.
```

## Rules this skill owns

R-DOC-05: Documentation prose is plain, active, and free of marketing language
