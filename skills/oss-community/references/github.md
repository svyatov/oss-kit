# GitHub reference

Concrete syntax and file locations for the decisions `SKILL.md` makes. Verified against the current GitHub documentation source at `github/docs` on the `main` branch. Where a field is gated behind a preview flag, that is noted; do not rely on a gated field being available on every plan.

## Issue templates (R-COM-05)

GitHub recognizes two kinds of issue template, both stored in the hidden `.github/ISSUE_TEMPLATE/` directory on the default branch. Filenames are not case sensitive.

### Markdown templates

A plain Markdown file with YAML front matter, extension `.md`:

```markdown
---
name: Bug report
about: File a bug you found
title: "[BUG] "
labels: bug
assignees: octocat
type: Bug
---

## Current behavior

## Expected behavior

## Steps to reproduce
```

Front matter keys: `name` and `about` are the ones the template chooser shows; `title`, `labels`, `assignees`, and `type` prefill the new issue. `name` must be more than three characters or the template will not appear in the chooser.

### Issue forms

A YAML file, extension `.yml`, using GitHub's form schema. The whole form schema is in public preview and subject to change, so verify a generated form in GitHub's template chooser before treating it as finished. Top-level keys:

| Key | Required | Type |
|---|---|---|
| `name` | yes | string, must be unique across all templates and more than three characters |
| `description` | yes | string |
| `body` | yes | array of form elements |
| `title` | no | string |
| `labels` | no | array or comma-delimited string |
| `assignees` | no | array or comma-delimited string |
| `type` | no | string, an organization-level issue type |
| `projects` | no | array or comma-delimited string, each entry `OWNER/PROJECT-NUMBER` |

Each entry in `body` is one form element:

```yaml
- type: textarea
  id: what-happened
  attributes:
    label: What happened?
    description: Also tell us what you expected to happen.
    placeholder: Tell us what you see
  validations:
    required: true
```

Every element needs `type` and `attributes`. `id` is optional on every element type; it sets the field's identifier for URL query-parameter prefills and does not apply to `markdown`, which is never submitted. `validations` is optional. Most elements accept `required`; `upload` also accepts `accept`. Required-field validation works only in public repositories.

Element types and their required attributes:

- `markdown`: no `id`. `attributes.value` required, nothing else.
- `input`: single-line text. `attributes.label` required; `description`, `placeholder`, `value` optional.
- `textarea`: multi-line text, supports file drag-and-drop into the box. `attributes.label` required; `description`, `placeholder`, `value` optional; `render` formats the answer as a code block in the given language.
- `dropdown`: `attributes.label` and `attributes.options` required (`options` cannot be empty and every entry must be distinct); `description`, `default` (index into `options`), `multiple` optional.
- `checkboxes`: `attributes.label` and `attributes.options` required; each entry in `options` is `{ label: ..., required: true|false }`, where that per-option `required` means the box must be checked, distinct from the element's own `validations.required`, which means at least one option must be selected.
- `upload`: a file upload field. `attributes.label` required; `description` and, under `validations`, `accept` (a comma-separated extension list) optional. Confirm it renders before relying on it, and default to `textarea` with a note about drag-and-drop attachments if it does not.

Issue forms are not available for pull requests.

### Template chooser config

`.github/ISSUE_TEMPLATE/config.yml` controls the chooser shown when someone clicks New issue:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Ask a question
    url: https://github.com/orgs/ORG/discussions
    about: Please ask and answer questions here.
```

`blank_issues_enabled: false` hides the blank-issue option from contributors with read or triage access; it stays visible, labeled "Maintainers only," for anyone with write access or above. `contact_links` adds external destinations, such as a discussion forum or a security bounty page, to the chooser.

Prefix filenames with a zero-padded number, such as `01-bug.yml`, to control chooser order; templates are otherwise listed alphanumerically with YAML files before Markdown files.

## Pull request template

Accepted locations, all on the default branch, filenames not case sensitive, extension `.md` or `.txt`:

- `.github/pull_request_template.md` (hidden directory)
- `pull_request_template.md` (repository root)
- `docs/pull_request_template.md`

For more than one template, use a `PULL_REQUEST_TEMPLATE/` subdirectory inside any of the three locations above, for example `.github/PULL_REQUEST_TEMPLATE/bugfix.md`, and the contributor selects one with a `template` query parameter when opening the pull request; there is no chooser UI for pull request templates the way there is for issues.

## CODEOWNERS (R-COM-06)

Accepted locations, checked in this order, first file found wins: `.github/CODEOWNERS`, `CODEOWNERS` at the repository root, `docs/CODEOWNERS`. Case sensitive paths. Maximum file size 3 MB; an oversized file is not loaded at all.

Syntax follows gitignore pattern matching with three exceptions that do not work here: escaping a leading `#` with `\`, negating a pattern with `!`, and character ranges with `[ ]`. The last matching pattern in the file wins, not the most specific one, so order general rules before the exceptions that override them.

```text
# Default owner for everything
*       @global-owner1 @global-owner2

# Later, more specific rules override the default above for matching paths
*.js    @js-owner
/build/logs/ @doctocat
docs/*  docs@example.com
apps/   @octo-org/octocats
```

Owners are `@username`, `@org/team-name`, or an email address already associated with a GitHub account; all must have write access to the repository, and a team must be visible with write access even if every member already has it individually. Multiple owners belong on the same line to all be requested; owners on separate lines each match only as the last-mentioned pattern for their own line. An invalid line is skipped rather than failing the whole file, and GitHub surfaces the specific errors both in the file view and through the REST API.

GitHub has no section syntax and no way to require more than one approval from the owners of a given path; an approval from any one listed owner satisfies the requirement. Enforcing CODEOWNERS review at all is a branch protection setting, "Require review from Code Owners," configured outside this file; note that it is needed and leave enabling it to whoever owns branch protection, since it is a repository setting rather than part of this file.

## FUNDING.yml

Location: `.github/FUNDING.yml` on the default branch. One entry per platform, one platform per line:

```yaml
github: [octocat, surftocat]
open_collective: my-project
patreon: octocat
tidelift: npm/my-package
custom: ["https://www.paypal.me/octocat"]
```

Accepted keys: `github` (one username, or up to four in a list), `community_bridge` (LFX Mentorship project name), `issuehunt`, `ko_fi`, `liberapay`, `open_collective`, `patreon`, `polar`, `buy_me_a_coffee`, `thanks_dev` (format `u/gh/USERNAME`), `tidelift` (format `PLATFORM-NAME/PACKAGE-NAME`, where the platform name is `npm`, `pypi`, `rubygems`, `maven`, `packagist`, or `nuget`), and `custom` (up to four URLs). Quote a custom URL if it contains a `:` beyond the scheme separator. List only a platform the project is actually registered on; a `patreon` key pointing at an account that does not accept the project's donations is a dead link like any other.
