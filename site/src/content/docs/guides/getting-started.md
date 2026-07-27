---
title: Getting started
description: Choose the oss-kit skill that owns the maintainer job in front of you.
---

<p class="doc-kind-label">Guide · public documentation</p>

oss-kit is a curated set of agent skills for open source maintainers. You ask
your agent for the job you need done, and the agent loads the skill that owns
it.

Ask for a skill by name when you know the responsibility. Writing a README is
`oss-readme`, community files are `oss-community`, CI is `oss-ci`, hardening is
`oss-harden`, releases are `oss-publish`, changelogs and versioning are
`oss-changelog`, repository prose is `oss-writing`, and the structure of a
repository that ships agent skills is `oss-skill`.

Start with an audit when you want the broadest view:

```
Use oss-audit on this repository and list every gap against STANDARD.md.
```

The audit returns a count line and then one line per gap, most important
first, each with the evidence it found and the skill that fixes it. Rules that
already pass do not appear. Work down the list, handing each item to the skill
it names:

```
Fix the R-SEC findings from that audit with oss-harden.
```

Every current opinion is written down. Read [the standard](/standard/) and
disagree with it before you adopt it.
