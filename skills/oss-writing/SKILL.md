---
name: oss-writing
description: "Write clear technical prose for anything that lives in a repository or on a forge: commit messages, PR titles and descriptions, PR and code review comments, issue text, READMEs, documentation, changelogs, ADRs, code comments, error and log messages. Use this whenever you are about to write or edit any of them, including short ones. A one-line commit message or a two-sentence review comment looks too small to need a skill, and that is exactly where the tells show up. Not for prose that needs a personal voice, such as blog posts, essays, or launch announcements."
license: MIT
---

# Repo prose

Technical register: neutral, specific, short. No personality injection, no marketing.

## Say why, not what

The subject line names what changed: imperative, specific enough to scan in a `git log`. Everything after it answers why, because the diff already covers what. Prose earns its place only by carrying what the diff cannot:

- the reason the change exists
- the alternative you rejected, and why
- the constraint that forced an unobvious choice
- the blast radius: what else this touches, what could break

A commit body that paraphrases the diff is noise. A commit body naming the bug report that prompted it, or the benchmark that ruled out the obvious approach, is the only record that survives.

```
Bad:  Updated the parser to use a hash map instead of a list, changed the
      lookup function, and added a test for the new behavior.
Good: List scan was O(n^2) on the 40k-symbol files in vendor/. Hash map
      drops import time from 8s to 90ms. Ordering is no longer stable, so
      callers that relied on insertion order now sort explicitly.
```

## Say nothing when nothing needs saying

Length is not effort. Padding a trivial change into a structured document wastes the reader twice: once reading it, once distrusting the next one.

- Subject line says everything? Write no body.
- Headings earn their place when the reader needs to navigate, roughly past a screenful. A short PR body is two or three paragraphs, not `## Summary` and `## Test plan`.
- Nothing was verified? Write no test plan. Never invent one.
- A README section that repeats the code below it should be deleted, not rewritten.

## Composition rules

| Rule | Do this |
|------|---------|
| Active voice | `parser drops trailing commas`, not `trailing commas are dropped` |
| Positive form | `the cache expires after 60s`, not `the cache does not persist beyond 60s` |
| Specific and concrete | `fails on files over 2 MB`, not `fails on large inputs` |
| Omit needless words | Cut every word whose removal changes nothing |
| Related words together | `only the retry path calls this`, not `this is only called by the retry path` |
| Emphatic word last | End the sentence on the thing that matters |
| One topic per paragraph | Each paragraph makes exactly one point |
| Parallel form | Bullets in a list share one grammatical shape |

## Kill list

| Tell | Write instead |
|------|---------------|
| Significance inflation: `pivotal`, `testament to`, `underscores`, `marks a shift`, and `key` or `critical` used as importance adjectives (`a key improvement`). The nouns are fine: `cache key`, `API key`, `critical section` | State the fact and stop |
| Tacked-on `-ing` clauses: `ensuring reliability`, `enabling faster builds`, `allowing users to` | Split into a sentence, or cut |
| Promotional adjectives: `robust`, `powerful`, `seamless`, `elegant`, `comprehensive`, `rich` | Name the property: `retries 3x`, `no config file` |
| Vague attribution: `best practices suggest`, `it is widely believed`, `studies show` | Name the source, or drop the claim. Never invent one |
| Copula avoidance: `serves as`, `acts as`, `provides`, `boasts`, `features` | `is`, `has` |
| AI vocabulary: `leverage`, `utilize`, `delve`, `streamline`, `facilitate`, `holistic`, `additionally`, `furthermore` | `use`, `and`, or nothing |
| Negative parallelism: `not just X, but Y`. Tailing negation: `no guessing`, `no wasted motion` | Write the positive claim as a real clause |
| Rule of three: three items where two exist | List what actually exists |
| Elegant variation: calling one thing `the handler`, then `the callback`, then `the routine` | One name per concept, every time. Match the identifier in the code |
| False ranges: `from linting to deployment` | Name the two things |
| Passive or subjectless: `was refactored`, `no config needed` | Name the actor: `the loader now caches`, `you do not need a config file` |
| Filler: `in order to`, `due to the fact that`, `has the ability to`, `it is important to note that` | `to`, `because`, `can`, delete |
| Hedging stacks: `may potentially`, `could possibly` | Pick one modal or drop it |
| Generic upbeat closer: `this improves maintainability going forward` | Delete the sentence |
| Signposting: `let's dive in`, `here's what you need to know`, `this PR aims to`, `in this change, we` | Start with the content |
| Fragmented header: a heading followed by a line restating the heading | Delete the restatement |
| Aphorism formulas: `X is the Y of Z`, `X becomes a trap` | The concrete claim underneath |
| Authority tropes: `the real question is`, `at its core`, `fundamentally` | Just make the point |
| Manufactured drama: a run of short declarative fragments | One sentence, ordinary length |
| Predicate-position hyphens: `the report is high-quality` | `the report is high quality`. Keep attributive hyphens: `a high-quality report` |
| Diff-anchored docs: `this function was added to replace the old loop` | Docs describe what is, not what changed. Commits, changelogs, and migration guides are the exception: there, describing the change is the job |

## Hard constraints

Check these before returning any text:

- No em dashes, en dashes, or ` -- `. Replace with a period, comma, colon, or parentheses.
- No emoji anywhere, including headings and bullets.
- No inline-header bullet lists (`- **Performance:** it is faster`). Write prose or a plain list.
- Headings in sentence case, not Title Case.
- No recap section restating what the text just said.
- No `Generated with`, `Co-Authored-By: Claude`, or tool attribution footers.
- No unsolicited caveats or safety notes the subject matter did not ask for.
- Straight ASCII quotes.

## Do not touch

- Quoted code, error strings, log output, stack traces, and config samples: reproduce verbatim, including their dashes.
- Another person's words in a quote or a review thread reply.
- Identifier names, CLI flags, and file paths.
- Legal, license, and security-advisory wording.
- When editing prose a human wrote, fix only what is broken. Their voice is not a defect.

## Agent slop in git prose

These come from writing the message as a session log rather than a description of the change:

- One bullet per changed file, or a list of every path touched. The diff has that.
- A test plan describing verification that never ran.
- The body narrating your working process: what you tried, what failed, what you then did.
- Restating the subject line as the first line of the body.

## Error messages and comments

Both are read by someone who is already stuck, so they answer a different question than descriptive prose does.

- An error message names what failed, the input that caused it, and what the reader can do next: `config.yaml line 7: timeout must be a positive integer, got -1`. Not `an error occurred while processing your request`.
- A log line carries the identifiers needed to find the thing again: request id, path, count, duration. Adjectives help nobody grepping at 3am.
- A comment explains why the code is surprising, not what it does. If it restates the line below it, delete it. The case that earns a comment is a constraint the code cannot show: a spec section, a vendor bug, a benchmark that ruled out the obvious approach.

## Examples

Commit body:

```
Bad:  refactor(auth): improve token handling

      This commit refactors the token handling logic to be more robust and
      maintainable. Changes include updating the refresh function, adding
      validation, and improving error handling.

Good: fix(auth): refresh tokens 30s before expiry

      Clock skew between our nodes and the IdP was up to 12s, so tokens
      refreshed exactly at expiry were rejected about 1 in 400 times.
      30s covers observed skew with margin. Refresh cost is negligible.
```

PR description:

```
Bad:  ## Summary
      - Added a new caching layer
      - Updated the service to use it
      - Added tests

      This significantly improves performance and enhances the user
      experience by reducing load times.

Good: Search results were recomputed on every keystroke, which pinned a CPU
      core on the API box during peak hours. Results are now cached per
      normalized query for 5 minutes.

      Cache is in-process, so a deploy clears it. That is fine at one
      replica; if we scale out, this needs Redis.

      Verified with the load script in bench/: p99 drops from 1.4s to 210ms.
```

Review comment:

```
Bad:  Great catch on the null check! One small thing to consider: it might
      potentially be worth thinking about whether this could possibly cause
      issues with concurrent access.
Good: Two goroutines can reach this branch at once, so the map write races.
      A sync.Map or a mutex around lines 40-48 fixes it.
```

## Rules this skill owns

R-DOC-05: Documentation prose is plain, active, and free of marketing language
