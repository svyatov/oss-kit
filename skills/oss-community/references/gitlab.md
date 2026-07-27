# GitLab reference

Concrete syntax and file locations for the decisions `SKILL.md` makes. Verified against the current GitLab documentation at `docs.gitlab.com`.

## Issue and merge request templates (R-COM-05)

GitLab has no equivalent of GitHub's issue-forms YAML schema. Every GitLab description template, for both issues and merge requests, is a plain Markdown file with no typed fields, no required-field validation, and no form rendering; do not attempt to translate a GitHub issue form into GitLab syntax, because nothing on GitLab consumes it. Say this plainly to anyone expecting form-like fields on GitLab rather than implying an equivalent exists.

Project-level locations, files on the default branch, extension `.md`:

- `.gitlab/issue_templates/` for issue templates
- `.gitlab/merge_request_templates/` for merge request templates

A file named `Default.md` (case insensitive) in either directory is preselected automatically every time a contributor opens a new issue or merge request; every other filename in the directory appears as a named choice the contributor selects manually. At minimum, ship one file in each directory; name it `Default.md` if the project wants it to load without the contributor choosing anything.

On Premium or Ultimate, a group can also designate one direct child project as the source of templates shared across the group's projects, configured in the group's settings rather than by a file path. Mention that option when the maintainer wants shared templates, but the per-project directories above satisfy R-COM-05 on their own.

## CODEOWNERS (R-COM-06)

Accepted locations, checked in this order, first file found wins: `CODEOWNERS` at the repository root, `docs/CODEOWNERS`, `.gitlab/CODEOWNERS`. These locations only matter where the project's GitLab plan is Premium or Ultimate; see Enforcement and tier below before writing this file on a Free-tier project.

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

GitLab also accepts direct project roles as owners. Prefix the role with `@@`; only Developer, Maintainer, and Owner work, and a role does not include higher roles:

```text
/config/ @@maintainer
```

Prefix a path with `!` to exclude it from code owner approval in that section. GitLab evaluates exclusions in order, and a later rule in the same section cannot include an excluded path again:

```text
[Generated files] @release-team
generated/
!generated/fixtures/
```

### Enforcement and tier

GitLab gates the whole Code Owners feature behind Premium or Ultimate, on GitLab.com, self-managed, or GitLab Dedicated, not just the enforcement setting. GitLab's own documentation carries a Premium/Ultimate tier badge on the Code Owners page and describes no Free-tier behavior anywhere on it, so on a Free-tier project GitLab does not read the CODEOWNERS file at all; it assigns no default reviewers and does nothing else with the file's contents. Confirm the project's tier before writing this file. On Free tier, say so plainly and skip it: there is no partial benefit to writing a CODEOWNERS file GitLab never reads. A Free-tier project that still wants routed review has to do it without this file, for example by naming owners per area in CONTRIBUTING.md and asking reviewers directly, or by upgrading the plan.

Enforcing Code Owner approval, the setting on a protected branch that blocks merge until the file's owners approve, requires the same Premium or Ultimate tiers as the base feature; it adds no separate gate beyond what reading the file already needs. Enforcement, like the branch protection setting on GitHub, is a project setting outside this file; note that it is needed and leave enabling it to whoever owns branch and merge request protection rather than attempting it from this skill.

## FUNDING.yml

GitLab has no equivalent of `.github/FUNDING.yml` or a built-in sponsor button. A project that wants to surface funding links on GitLab has to put them in the README or a dedicated file such as `FUNDING.md`; that content decision belongs to whoever owns the README, not to a forge-recognized schema this skill can write against.
