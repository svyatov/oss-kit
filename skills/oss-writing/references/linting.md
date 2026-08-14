# Mechanizing these rules

Most of this skill is judgement and cannot be checked by a tool. Some of it is mechanical, and a repository that checks the mechanical half in CI stops spending review on it. This file maps the checkable rules onto a checker. It ships no configuration: the config belongs in the repository that adopts it, not in a skill directory an installer copies.

Read this when setting up prose linting for a repository, not while drafting.

Two tools carry everything below. [Vale](https://vale.sh) ([errata-ai/vale](https://github.com/errata-ai/vale)) checks the prose, and [commitlint](https://commitlint.js.org) ([conventional-changelog/commitlint](https://github.com/conventional-changelog/commitlint)) checks the commit message. Install each from the command its own documentation publishes.

This skill also ships `scripts/prose.mjs`, which needs nothing installed and covers the regex rows of the table below plus the sentence-case and sentence-length rows. Reach for it while drafting, or in a repository that will not take a new tool. Prefer Vale where the repository already runs it: Vale carries a proper-noun vocabulary, per-scope rules, and an editor integration that a single script does not.

## What a checker can decide

| Rule | Checker |
|------|---------|
| Sentence over 25 words, or over 20 in a numbered step | Vale `metric` with a custom formula, or an `occurrence` rule |
| Banned word or phrase present | Vale `substitution` rule, from the table below |
| Em dash, en dash, or ` -- ` | regex for U+2014, U+2013, and ` -- ` |
| Curly quote | regex for U+2018, U+2019, U+201C, U+201D |
| Emoji | regex for `\p{Extended_Pictographic}` |
| Inline-header bullet | regex `^\s*[-*] \*\*[^*]+:\*\*\s` |
| Tool attribution trailer | regex `Co-Authored-By:` or `Generated with` |
| Heading not in sentence case | Vale `capitalization` with a proper-noun exception list |
| Subject over 72 characters | commitlint `header-max-length` |
| Subject ends in a period | commitlint `subject-full-stop` |
| Missing blank line after the subject | commitlint `body-leading-blank` |
| Body line over 72 characters | commitlint `body-max-line-length`, for a message typed in an editor rather than a forge field |
| Conventional Commits shape, where the repository has adopted it | commitlint `type-enum` and `subject-empty` |

Two figures need an explicit override rather than a default. `@commitlint/config-conventional` ships `header-max-length` at 100, so the 72-character ceiling this skill wants is a setting, not the default. A repository that prefers Git's 50 sets it deliberately, and accepts that `type(scope): ` spends 15 to 20 of those characters. A body wrapped at 72 is correct for a message composed in an editor. It is wrong for text typed into a forge field, which reflows on its own.

## What a checker cannot decide

Do not try to lint these. A rule that fires on correct prose gets the whole linter turned off.

- Whether a claim is true. This is the failure that matters most and no tool sees it.
- Whether a body was earned. A checker can count the body's lines; it cannot tell whether a reason, a constraint, a rejected alternative, or a consequence is in them.
- Whether a noun stack is three words or a compound term that happens to be three words.
- Whether a bolded bullet is a label or a claim.
- Whether a caveat changes what the reader should do.
- Whether the alternative in a `rather than` clause exists or was invented for the sentence.

## Banned words and phrases

This table flattens three lists: the tell catalog in `tells.md`, the promotional adjectives in `SKILL.md`, and the timeless-language words in `docs-and-readme.md`. It holds only terms a substitution rule can decide on sight. A tell like `features` used as a verb stays out, because no rule can tell it from the noun. `tells.md` carries the reasoning for each.

| Banned | Use |
|---|---|
| utilize, leverage, make use of | use |
| in order to | to |
| due to the fact that | because |
| in the event that | if |
| at this point in time | now |
| a number of | a count, or `some` |
| facilitate | help, or name the step |
| functionality | the feature's name |
| delve | (cut) |
| obviate | remove the need for |
| predicated on | based on |
| holistic, comprehensive | (cut, or name the scope) |
| robust, powerful, elegant, rich | (cut, or state the property) |
| seamless, seamlessly, effortless | (cut) |
| blazing, blazingly fast | (cut, or give the number) |
| streamline | (cut, or name the step removed) |
| additionally, furthermore | and, or nothing |
| ensuring, enabling, allowing | (split into a sentence, or cut) |
| it is important to note, it's worth noting that, please note | (cut) |
| best practices suggest, studies show | name the source, or drop the claim |
| very, simply, just, easily, of course | (cut) |
| serves as, acts as, boasts | is, has, or a precise verb |
| currently, presently, at present, as of this writing | (cut, outside a commit, changelog, or migration guide) |
