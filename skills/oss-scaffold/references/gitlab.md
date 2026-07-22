# GitLab reference

Concrete syntax and file locations for the decisions `SKILL.md` makes. Verified against the current GitLab documentation at `docs.gitlab.com`.

## Issue and merge request templates (R-COM-05)

GitLab has no equivalent of GitHub's issue-forms YAML schema. Every GitLab description template, for both issues and merge requests, is a plain Markdown file with no typed fields, no required-field validation, and no form rendering; do not attempt to translate a GitHub issue form into GitLab syntax, because nothing on GitLab consumes it. Say this plainly to anyone expecting form-like fields on GitLab rather than implying an equivalent exists.

Project-level locations, files on the default branch, extension `.md`:

- `.gitlab/issue_templates/` for issue templates
- `.gitlab/merge_request_templates/` for merge request templates

A file named `Default.md` (case insensitive) in either directory is preselected automatically every time a contributor opens a new issue or merge request; every other filename in the directory appears as a named choice the contributor selects manually. At minimum, ship one file in each directory; name it `Default.md` if the project wants it to load without the contributor choosing anything.

A group can also designate one project as the source of templates shared across every project in the group, configured in the group's settings rather than by a file path; mention that this exists when the maintainer wants templates shared across multiple projects, but the per-project directories above are what satisfies R-COM-05 on its own.

## CODEOWNERS (R-COM-06)

Accepted locations, checked in this order, first file found wins: `CODEOWNERS` at the repository root, `docs/CODEOWNERS`, `.gitlab/CODEOWNERS`.

Base syntax matches GitHub's: a gitignore-style path pattern followed by one or more owners as `@username`, `@group/subgroup`, or an email address. GitLab adds two things GitHub's CODEOWNERS has no equivalent for.

### Sections

A line in brackets starts a named section; every pattern line below it belongs to that section until the next section header:

```text
[Documentation]
docs/
README.md

[Backend]
*.rb @backend-team
```

A default owner placed directly after the section header applies to every path in that section unless a specific line overrides it:

```text
[Documentation] @docs-team
docs/
README.md @tech-writer
```

Prefix a section name with `^` to make it optional, meaning approval from that section is not required even when CODEOWNERS approval is enforced on the branch:

```text
^[Optional Extras]
*.snap @qa-team
```

### Required approval count

A number in a second bracket after the section name sets how many distinct approvals that section needs, rather than the single any-one-owner approval GitHub always uses:

```text
[Backend][2] @backend-team @staff-engineer
```

### Enforcement and tier

The CODEOWNERS file itself is read on every GitLab tier. Enforcing it, the "Code Owner approval" setting on a protected branch that blocks merge until the file's owners approve, requires GitLab Premium or Ultimate, on GitLab.com, self-managed, or GitLab Dedicated. Note that requirement to the maintainer before promising enforcement; on a Free-tier project, CODEOWNERS still assigns default reviewers but nothing blocks a merge without their approval.

Enforcement, like the branch protection setting on GitHub, is a project setting outside this file; note that it is needed and leave enabling it to whoever owns branch and merge request protection rather than attempting it from this skill.

## FUNDING.yml

GitLab has no equivalent of `.github/FUNDING.yml` or a built-in sponsor button. A project that wants to surface funding links on GitLab has to put them in the README or a dedicated file such as `FUNDING.md`; that content decision belongs to whoever owns the README, not to a forge-recognized schema this skill can write against.
