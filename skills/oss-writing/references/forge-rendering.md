# Forge rendering

Forges disagree about what a single newline means, and one of them rewrites a change-request description into permanent history. Both behaviors are invisible from a clone. A draft that looks right in the editor can render ragged on the page, or arrive broken in `git log`. Read this before writing a description on a forge whose behavior you have not confirmed.

## A single newline

GitHub renders the same Markdown two ways. In an issue, a pull request, or a discussion it turns a single newline into a line break. In a Markdown file in the repository it treats that newline as a space and reflows the paragraph. GitHub's own documentation is explicit about the difference. Text that gets an automatic break in a pull request "would render on one line without a line break" in an `.md` file.

Repository files are usually hard-wrapped at a column. Pasted into a pull request description, that prose keeps every one of those wraps. It renders ragged at whatever width the author's editor happened to use.

GitLab does not share the behavior. There a single newline keeps the following text in the same paragraph everywhere. The same hard-wrapped prose renders identically in a merge request description and in a file. Wrapping that is merely ugly on GitLab is invisible until someone opens the same text on GitHub. Check the forge rather than remember it.

Unwrapped prose, one paragraph per line, is correct on both.

## Squash reuse

A repository can set the squash commit message to the change-request body, and no clone reveals that it did. On GitHub the setting is `squash_merge_commit_message`; on GitLab it is `squash_commit_template`. Read it before writing the description.

Where it is set, that text is the permanent commit body. A heading becomes a heading in `git log`. An unticked checkbox stays unticked forever. GitHub does not strip HTML comments. Template guidance left in the body survives in history, while rendering as nothing on the pull request page.

## Double wrapping

Do not hard-wrap a description even when it is destined for a commit body. GitHub rewraps the body itself when it builds the squash message, to roughly 76 columns and without splitting a word. A description hard-wrapped by its author arrives wrapped twice, which is where a commit body broken mid-sentence comes from.

## The number the forge appends

GitHub appends the pull request number to the squash subject, as ` (#123)`. GitLab does not: its default `squash_commit_template` is `%{title}`, and only the merge commit template carries `%{reference}`. Either forge lets a project change the template, so read the setting rather than assume.

Where a number is appended, the subject in history is longer than the title you typed. The suffix runs five to eight characters: ` (#1)` is five, ` (#1234)` is eight. Budget for it. A title under 65 characters stays under 72 once a three-digit number is appended.
