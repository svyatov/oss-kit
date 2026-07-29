# Commits and change requests

## Default to silence

The durable body defaults to none. The subject carries the change, and most changes end there.

Prose earns its place when it carries one of four things. The reason the behavior exists, the constraint that forced an unobvious choice, the alternative rejected and why, or the compatibility, security, or operational consequence. A body that paraphrases the diff is noise.

A body is earned when a change's safety rests on a fact the diff cannot show, and diff size does not decide that.

A body that exists says what is wrong now, then why this is better, then what was discarded, in that order. Write the status quo in the present tense: the loader retries forever, not the loader used to retry forever. The commit is what turns that sentence into history.

## Commit messages

Structure: Conventional Commits. Content: git SubmittingPatches.

- Format the subject as `type(scope): description`.
- Use these types: feat, fix, build, chore, ci, docs, style, refactor, perf, test, revert.
- feat is a MINOR change. fix is a PATCH. A `!` before the colon or a `BREAKING CHANGE:` footer marks a MAJOR change.
- Set scope to the code area. Scope is optional.
- Write the description in the imperative mood. Do not end it with a period.
- Keep the subject to 72 characters or fewer, counting any number the forge appends on squash.
- Explain motivation in the body, not the subject.
- The body explains WHY the change is needed and HOW it differs from the prior behavior. Do not restate the diff.
- State discarded alternatives when they help a future reader.
- Keep it self-contained.

<example name="commit, nothing earned a body">

```
fix(parser): handle empty input
```

</example>

<example name="commit, earned by a measurement">

```
perf(search): cache results per normalized query

Results are recomputed on every keystroke, which pins a CPU core during peak hours. Caching for 5 minutes drops p99 from 1.4s to 210ms and costs 40 MB of resident memory.

Redis was rejected. A deploy clears the in-process cache, which is acceptable at one replica. The operational dependency is not worth it until we scale out.
```

</example>

## Change request descriptions

A change request is a GitHub pull request or a GitLab merge request.

- Follow the convention the repository declares.
- Use the repository's template when it ships one, such as `pull_request_template.md` or `.gitlab/merge_request_templates/`.
- A description is rendered on the forge and read before the diff. Use the markup the forge renders.
- Give a change with separable parts one bullet each. A reviewer reads that list to decide where to start.
- The default-to-silence rule above governs a commit body. A description earns its length from what review needs.
