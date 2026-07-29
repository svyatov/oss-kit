# Docs and README

Base: the Google developer documentation style guide and The Elements of Style. The core rules apply unchanged, including the sentence caps.

## Write timeless prose

Documentation describes what is true, with no reference to when it was written. Cut `currently`, `now`, `new`, `latest`, `soon`, `eventually`, `presently`, `at present`, `as of this writing`, `does not yet`, and `existing` or `old` used to contrast with something newer. Each one dates the sentence, and none survives the release that makes it wrong.

This rule covers documentation. A commit message, a change-request description, a changelog entry, and a migration guide are the exception, because describing a change is their job. There `now` marks the state this change produces, and cutting it costs the reader the contrast.

## Voice and structure

- Lead each section with its topic sentence.
- Use numbered lists for sequences. Use bulleted lists for sets.
- Use descriptive link text. Do not write "click here".
- Define an acronym on first use.
- Do not pre-announce features that do not exist yet.
- Write for translation: no idioms, no culture-specific references.
