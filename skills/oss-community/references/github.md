# GitHub reference

Concrete syntax and file locations for the decisions `SKILL.md` makes. Verified against the current GitHub documentation source at `github/docs` on the `main` branch. Confirm a field's availability on the repository's own plan before relying on it.

## Contents

- [Issue templates (R-COM-05)](#issue-templates-r-com-05)
  - [Markdown templates](#markdown-templates)
  - [Issue forms](#issue-forms)
  - [Template chooser config (R-COM-09)](#template-chooser-config-r-com-09)
- [Discussion category forms](#discussion-category-forms)
- [Pull request template](#pull-request-template)
- [CODEOWNERS (R-COM-06)](#codeowners-r-com-06)
- [FUNDING.yml](#fundingyml)
- [Repository settings (R-COM-07)](#repository-settings-r-com-07)
  - [The About sidebar](#the-about-sidebar)
  - [Social preview](#social-preview)
  - [Feature tabs](#feature-tabs)
  - [Community profile](#community-profile)

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

A YAML file, extension `.yml`, using GitHub's form schema. Verify a generated form in GitHub's template chooser before treating it as finished. Top-level keys:

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

Anything the template can decide for the reporter belongs in those top-level keys rather than in a field. `labels`, `type`, `title`, `assignees`, and `projects` all prefill from the template, so a form asking the reporter to type a label is asking them for work it could have done itself.

Issue forms are not available for pull requests.

#### Which element carries which fact

Every element needs `type` and `attributes`. `id` is optional on every element type; it sets the field's identifier for URL query-parameter prefills and does not apply to `markdown`, which is never submitted. `validations` is optional. Most elements accept `required`; `upload` also accepts `accept`. Required-field validation works only in public repositories.

- `markdown`: standing text the reporter reads and never answers. No `id`. `attributes.value` required, nothing else.
- `input`: single-line text. `attributes.label` required; `description`, `placeholder`, `value` optional. It carries a set that changes faster than the repository releases, such as the model names in circulation, with examples in the placeholder. A dropdown there is stale between releases, and a stale dropdown pushes reporters into an "other" option that collects nothing. It also carries a version, with the `description` naming the command that prints it, so the reporter pastes output instead of recalling a number.
- `textarea`: multi-line text, supports file drag-and-drop into the box. `attributes.label` required; `description`, `placeholder`, `value` optional; `render` formats the answer as a code block in the given language. It carries logs, stack traces, transcripts, queries, and configuration. Setting `render` also turns off Markdown editing for the field, so nothing arrives mangled by accidental formatting.
- `dropdown`: `attributes.label` and `attributes.options` required (`options` cannot be empty and every entry must be distinct); `description`, `default` (index into `options`), `multiple` optional. It carries a closed set the repository controls, such as the components it ships or the platforms it documents. That option list is a public claim about supported scope, so it has to match the documentation and change alongside it.
- `checkboxes`: `attributes.label` and `attributes.options` required; each entry in `options` is `{ label: ..., required: true|false }`, where that per-option `required` means the box must be checked, distinct from the element's own `validations.required`, which means at least one option must be selected. It carries preconditions the reporter has to confirm, such as having searched existing issues. Keep the list to the one or two that change triage, because a wall of attestations reads as a toll on filing a report.
- `upload`: a file upload field. `attributes.label` required; `description` and, under `validations`, `accept` (a comma-separated extension list) optional. It carries a screenshot or a minimal reproduction repository. Confirm it renders before relying on it, and default to `textarea` with a note about drag-and-drop attachments if it does not.

#### What this looks like for a project that runs inside a host

An issue form for a repository of agent skills, showing the boundary axis, the dropdown and input decision, and prefill in the top-level keys. It illustrates the derivation rather than offering a form to copy: a project that is not a repository of agent skills runs inside no host, so its boundary axis names something else entirely and its fields follow from that, not from this file.

```yaml
name: Bug report
description: A skill did something other than what its SKILL.md says
labels: [bug]
body:
  - type: markdown
    attributes:
      value: |
        A skill's behavior depends on the harness that loaded it and the model that read it, as much as on the skill's own text. Those two answers decide whether this is a defect in the skill or a difference between hosts.
  - type: dropdown
    id: harness
    attributes:
      label: Harness
      description: Where the skill was loaded. The install guide lists the hosts this project supports.
      options:
        - Claude Code
        - Codex CLI
        - Cursor
        - opencode
        - Other
    validations:
      required: true
  - type: input
    id: harness-version
    attributes:
      label: Harness version
      description: Name the host here as well if you chose Other above.
      placeholder: claude 2.1.217
    validations:
      required: true
  - type: input
    id: model
    attributes:
      label: Model
      description: The exact name, with the revision if you have it. Free text rather than a list, because the set of models in circulation changes faster than this repository releases.
      placeholder: claude-opus-4-6
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: Project version
      description: The version field in the plugin manifest, or the commit SHA if you installed from git.
    validations:
      required: true
  - type: textarea
    id: prompt
    attributes:
      label: What you asked for
      description: The prompt that invoked the skill, verbatim.
      render: text
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: What should have happened
      description: Quote the sentence in the skill that says so.
    validations:
      required: true
  - type: textarea
    id: happened
    attributes:
      label: What happened instead
      render: text
    validations:
      required: true
```

### Template chooser config (R-COM-09)

`.github/ISSUE_TEMPLATE/config.yml` controls the chooser shown when someone clicks New issue:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Ask a question
    url: https://github.com/OWNER/REPO/discussions
    about: Please ask and answer questions here.
```

`blank_issues_enabled: false` hides the blank-issue option from contributors with read or triage access; it stays visible, labeled "Maintainers only," for anyone with write access or above. `contact_links` adds external destinations, such as a discussion forum or a security bounty page, to the chooser. Each entry needs all three of `name`, `url`, and `about`.

Repository Discussions live at `https://github.com/OWNER/REPO/discussions`, organization Discussions at `https://github.com/orgs/ORG/discussions`, and a single category at `.../discussions/categories/CATEGORY-SLUG`. Link the category when the project wants a specific kind of traffic there, such as Q&A, and the top level when it wants anything that is not a defect.

Prefix filenames with a zero-padded number, such as `01-bug.yml`, to control chooser order; templates are otherwise listed alphanumerically with YAML files before Markdown files.

## Discussion category forms

A discussion category can carry a form in the same schema as an issue form. The file goes in `.github/DISCUSSION_TEMPLATE/` on the default branch, and the filename is the category's slug: `.github/DISCUSSION_TEMPLATE/q-a.yml` for a category named Q&A, `announcements.yml` for Announcements. There is no chooser config here; the mapping is the filename and nothing else, so a typo in the slug produces a form that never appears rather than an error.

Only three top-level keys apply, all fewer than an issue form has:

| Key | Required | Type |
|---|---|---|
| `body` | yes | array of form elements |
| `title` | no | string |
| `labels` | no | array or comma-delimited string |

`name` and `description` do not apply, because the category already supplies both. Neither do `assignees`, `type`, and `projects`, since a discussion is not assigned or tracked the way an issue is. The `body` elements are the same set the issue form schema defines, and `body` must hold at least one element that is not `markdown`. Writing this file needs write access to the repository.

Categories themselves are a repository setting rather than a file. GitHub creates six by default, each in one of three formats: open-ended discussion, question and answer, or announcement. A category can be renamed, have its format changed, or be deleted, and deleting one moves its discussions into a category chosen at delete time rather than removing them. The limit is 25 per repository or organization.

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

Accepted keys: `github` (one username, or up to four in a list), `community_bridge` (LFX Mentorship project name), `issuehunt`, `ko_fi`, `liberapay`, `open_collective`, `patreon`, `polar`, `buy_me_a_coffee`, `thanks_dev` (format `u/gh/USERNAME`), `tidelift` (format `PLATFORM-NAME/PACKAGE-NAME`), and `custom` (up to four URLs).

Quote a custom URL if it contains a `:` beyond the scheme separator. List only a platform the project is actually registered on; a `patreon` key pointing at an account that does not accept the project's donations is a dead link like any other.

The `tidelift` platform name is per ecosystem and is not enumerated here. Six of the eleven ecosystems have one and five have none, and each ecosystem file carries its own answer under Funding platform name, starting with [ecosystems/npm.md](ecosystems/npm.md). The canonical copy is the `tidelift` key in `skills/oss-audit/ecosystems.json`, so on any disagreement that file is right.

## Repository settings (R-COM-07)

None of these live in a file, so they survive no clone and appear in no diff. Read the current values before proposing changes.

Both commands below need the `gh` CLI installed and authenticated; `gh auth status` prints the active account and the authentication state for each host. Reading the fields needs read access. On an organization repository, editing the description or the topics needs the Maintain or Admin role, so `gh repo edit` fails for a Write collaborator rather than reporting an unset field.

```bash
gh repo view --json name,description,homepageUrl,repositoryTopics,hasIssuesEnabled,hasDiscussionsEnabled,hasWikiEnabled,hasProjectsEnabled,isArchived
```

### The About sidebar

Description, website, and topics are the three fields in the About panel, editable in Settings or with `gh repo edit`:

```bash
gh repo edit --description "One sentence saying what this is." \
  --homepage "https://example.com" \
  --add-topic ecosystem --add-topic domain
```

`--remove-topic` takes a topic away, and `gh repo edit --enable-wiki=false` is how a boolean setting is turned off.

Keep the description to one sentence and keep it saying the same thing as the README's opening line, since the two are the same claim shown in different places and a reader who sees both notices when they disagree.

Topics: add no more than 20, use lowercase letters, numbers, and hyphens, and keep each to 50 characters or less. Topic names are always public, even on a private repository. Choose what someone searching would actually type: the ecosystem, the language, the problem domain, and the names of what the project integrates with.

### Social preview

Settings, General, Social preview. GitHub asks for "a PNG, JPG, or GIF file under 1 MB in size" and "a size of at least 640 by 320 pixels (1280 by 640 pixels for best display)". Until one is set, "repository links expand to show basic information about the repository and the owner's avatar". The REST API does not expose this image, so it cannot be read or set the way the About fields can; check it in Settings and hand the upload to the maintainer.

### Feature tabs

Issues, Discussions, Wiki, and Projects each toggle in Settings, General, Features. Issues has to be on for R-COM-05's templates to be reachable at all. Turn off what nothing uses, because an empty tab is a dead end for a visitor who clicks it, and turn Discussions on when the chooser's `contact_links` routes questions there, so the destination exists before the link points at it.

### Community profile

`https://github.com/OWNER/REPO/community` is GitHub's own checklist for a public repository. It reports on recommended community health files in a supported location, and on issue templates, which it requires to be "located in the `.github/ISSUE_TEMPLATE` folder and contain valid `name:` and `about:` keys" for Markdown or "`name:` and `description:` keys" for a form. It is narrower than the COM rules and it says nothing about the About fields, so use it as a second opinion on file placement rather than as the score.
