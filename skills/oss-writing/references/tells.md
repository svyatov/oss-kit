# Tell catalog

The lexicon that marks prose as machine-written. Each row names a pattern and what to write instead. The composition rules in `SKILL.md` handle the common case; this file is the lookup for a specific suspicion, so read the row that matches rather than running the whole table over every draft.

| Tell | Write instead |
|------|---------------|
| Significance inflation: `pivotal`, `testament to`, `underscores`, `marks a shift`, and `key` or `critical` used as importance adjectives (`a key improvement`). The nouns are fine: `cache key`, `API key`, `critical section` | State the fact and stop |
| Tacked-on `-ing` clauses: `ensuring reliability`, `enabling faster builds`, `allowing users to` | Split into a sentence, or cut |
| Promotional adjectives: `robust`, `powerful`, `seamless`, `elegant`, `comprehensive`, `rich` | Name the property: `retries 3x`, `no config file` |
| Vague attribution: `best practices suggest`, `it is widely believed`, `studies show` | Name the source, or drop the claim. Never invent one |
| Copula avoidance: vague `serves as`, `acts as`, `boasts`, or `features` | `is`, `has`, or a precise verb |
| AI vocabulary: `leverage`, `utilize`, `delve`, `streamline`, `facilitate`, `holistic`, `additionally`, `furthermore` | `use`, `and`, or nothing |
| Empty contrast: `not just X, but Y`. Tailing negation: `no guessing`, `no wasted motion` | State the positive claim unless the contrast changes the meaning |
| Manufactured list length | List what actually exists |
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
| Mechanical hyphenation | Follow the repository's dictionary and style guide; hyphenate compound modifiers only where grammar or clarity requires it |
| Diff-anchored docs: `this function was added to replace the old loop` | Docs describe what is, not what changed. Commits, changelogs, and migration guides are the exception: there, describing the change is the job |
