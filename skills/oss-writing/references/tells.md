# Tell catalog

The lexicon that marks prose as machine-written. Each row names a pattern and what to write instead. The composition rules and the check list in `SKILL.md` handle the common case. This file is the lookup for a specific suspicion, so read the row that matches rather than running the whole table over every draft.

| Tell | Write instead |
|------|---------------|
| Significance inflation: `pivotal`, `testament to`, `underscores`, `marks a shift`, and `key` or `critical` used as importance adjectives (`a key improvement`). The nouns are fine: `cache key`, `API key`, `critical section` | State the fact and stop |
| Tacked-on `-ing` clauses: `ensuring reliability`, `enabling faster builds`, `allowing users to` | Split into a sentence, or cut |
| Nominalized gerund chains: `improving the handling of the processing of` | Name the action once, with a finite verb: `the loader now retries` |
| Promotional adjectives: `robust`, `powerful`, `seamless`, `elegant`, `comprehensive`, `rich` | Name the property: `retries 3x`, `no config file` |
| Vague attribution: `best practices suggest`, `it is widely believed`, `studies show` | Name the source, or drop the claim. Never invent one |
| Copula avoidance: vague `serves as`, `acts as`, `boasts`, or `features` | `is`, `has`, or a precise verb |
| AI vocabulary, and any rare word where a common one is exact: `leverage`, `utilize`, `delve`, `streamline`, `facilitate`, `holistic`, `obviate`, `predicated on`, `additionally`, `furthermore`, `make use of`, `functionality` | `use`, `and`, or nothing. Name the feature rather than calling it `functionality`. Reserve a rare word for where it is more precise, never for where it is more impressive |
| Intensifiers and minimizers: `very`, `simply`, `just`, `easily`, `of course` | Delete. `simply` and `just` tell a stuck reader the thing they cannot do is easy, and `very` is a number the writer did not look up |
| Empty contrast: `not just X, but Y`; `X rather than Y` where Y was invented for the sentence (`instead of returning a deck nobody asked for`). Tailing negation: `no guessing`, `no wasted motion` | State the positive claim and stop. Keep a contrast only when the alternative is real: a prior behavior, a live endpoint, a default the reader would hit |
| Manufactured list length | List what actually exists |
| Elegant variation: calling one thing `the handler`, then `the callback`, then `the routine` | One name per concept, every time, across the whole document. Match the identifier in the code and the string in the UI |
| False ranges: `from linting to deployment` | Name the two things |
| Passive or subjectless: `was refactored`, `no config needed` | Name the actor: `the loader now caches`, `you do not need a config file` |
| Filler: `in order to`, `due to the fact that`, `has the ability to`, `it is important to note that`, `in the event that`, `at this point in time`, `it's worth noting that`, `please note`, `a number of` | `to`, `because`, `can`, `if`, `now`, a count, delete |
| Generic closer, upbeat (`this improves maintainability going forward`) or defensive (`and that is the finding rather than a gap to paper over`) | Delete it |
| Signposting: `let's dive in`, `here's what you need to know`, `this PR aims to`, `in this change, we` | Start with the content |
| Fragmented header: a heading followed by a line restating the heading | Delete the restatement |
| Aphorism formulas: `X is the Y of Z`, `X becomes a trap` | The concrete claim underneath |
| Authority tropes: `the real question is`, `at its core`, `fundamentally` | Just make the point |
| Manufactured drama: a run of short declarative fragments | One sentence, ordinary length |
| Mechanical hyphenation | Follow the repository's dictionary and style guide; hyphenate compound modifiers only where grammar or clarity requires it |
| Diff-anchored docs: `this function was added to replace the old loop` | Docs describe what is, not what changed. Commits, changelogs, and migration guides are the exception: there, describing the change is the job |
