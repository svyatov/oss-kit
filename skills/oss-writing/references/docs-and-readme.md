# Docs and README

Base: the Google developer documentation style guide and The Elements of Style. The core rules apply unchanged, including the sentence caps.

## Write timeless prose

Documentation describes what is true, with no reference to when it was written. Cut `currently`, `now`, `new`, `latest`, `soon`, `eventually`, `presently`, `at present`, `as of this writing`, `does not yet`, and `existing` or `old` used to contrast with something newer. Each one dates the sentence, and none survives the release that makes it wrong.

- Dated: The CLI currently supports two output formats, and a third is coming soon.
- Timeless: The CLI supports two output formats, `json` and `csv`.

This rule covers documentation. A commit message, a change-request description, a changelog entry, and a migration guide are the exception, because describing a change is their job. There `now` marks the state this change produces, and cutting it costs the reader the contrast.

Both of these are right, in different files:

- In the documentation: `parse()` returns a result object.
- In the changelog: **Breaking:** `parse()` now returns a result object rather than throwing.

Cutting `now` from the changelog entry leaves a sentence that no longer says anything changed. Carrying it into the documentation dates a sentence with no reason to expire, and the reader who arrives three releases later cannot tell what it was new against.

## Voice and structure

- Lead each section with its topic sentence.
- Use numbered lists for sequences. Use bulleted lists for sets.
- Use descriptive link text. Do not write "click here".
- Define an acronym on first use.
- Do not pre-announce features that do not exist yet.
- Write for translation: no idioms, no culture-specific references.
