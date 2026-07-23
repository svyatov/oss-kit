# Getting started

oss-kit is nine skills. You do not run them; you ask your agent for the thing
you want, and the agent loads the skill that covers it.

Start with an audit, because it tells you what the other eight are for:

```
Use oss-audit on this repository and list every gap against STANDARD.md.
```

The audit returns one row per rule, with the evidence it found and the skill
that fixes each gap. Work down the prioritized list it gives you, handing each
item to the skill it names:

```
Fix the R-SEC findings from that audit with oss-harden.
```

Ask for a skill by name when you already know what you want. Writing a README
is `oss-readme`, community files are `oss-community`, CI is `oss-ci`, hardening
is `oss-harden`, releases are `oss-publish`, changelogs and versioning are
`oss-changelog`, prose anywhere in a repository is `oss-writing`, and the
structure of a repository that ships skills is `oss-skill`.

Every opinion behind all of this is written down. Read [the standard](/standard/)
and disagree with it before you take any of it.
