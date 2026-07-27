# Forge rendering

Forges disagree about what a single newline means, and one of them rewrites a change-request description into permanent history. Both behaviors are invisible from a clone, so a draft that looks right in the editor can render ragged on the page or arrive broken in `git log`. Read this before writing a description on a forge whose behavior you have not confirmed.

## A single newline

GitHub renders the same Markdown two ways. In an issue, a pull request, or a discussion it turns a single newline into a line break. In a Markdown file in the repository it treats that newline as a space and reflows the paragraph. Its own documentation is explicit that text which gets a break automatically in a pull request "would render on one line without a line break" in an `.md` file.

So prose hard-wrapped at a column, which is how repository files are usually written, keeps every one of those wraps when it is pasted into a pull request description. It renders ragged at whatever width the author's editor happened to use.

GitLab does not share the behavior. There a single newline keeps the following text in the same paragraph everywhere, so the same hard-wrapped prose renders identically in a merge request description and in a file. Wrapping that is merely ugly on GitLab is invisible until someone opens the same text on GitHub, which is why this is worth checking rather than remembering.

Unwrapped prose, one paragraph per line, is correct on both.

## Squash reuse

A repository can set the squash commit message to the change-request body, and no clone reveals that it did. On GitHub the setting is `squash_merge_commit_message`; on GitLab it is `squash_commit_template`. Read it before writing the description.

Where it is set, that text is the permanent commit body. A heading becomes a heading in `git log`. An unticked checkbox stays unticked forever. GitHub does not strip HTML comments, so template guidance left in the body survives in history while rendering as nothing on the pull request page.

## Double wrapping

Do not hard-wrap a description even when it is destined for a commit body. GitHub rewraps the body itself when it builds the squash message, to roughly 76 columns and without splitting a word. A description hard-wrapped by its author arrives wrapped twice, which is where a commit body broken mid-sentence comes from.

## The number the forge appends

A squash merge appends the change-request number to the subject, as ` (#123)` on GitHub and ` (!123)` on GitLab. The subject that lands in history is therefore five or six characters longer than the one typed into the title field. Budget for it: a 71-character title becomes a 76-character commit subject.
