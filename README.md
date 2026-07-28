# oss-kit

Curated agent skills for open source maintainers.

[![version](https://img.shields.io/github/v/tag/svyatov/oss-kit?label=version)](https://github.com/svyatov/oss-kit/releases)
[![CI](https://github.com/svyatov/oss-kit/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/svyatov/oss-kit/actions/workflows/validate.yml)

- **53 rules.** Each states the check it is scored by and the one skill that
  fixes it.
- **Seven areas.** Documentation, community files, CI, security posture,
  release publishing, changelog discipline, and the agent skills a repository
  ships.
- **Both forges.** 49 of the 53 rules score GitHub and GitLab alike. Three are
  GitHub-only, one is GitLab-only, and every rule says which.
- **Four registries.** Release publishing for npm, RubyGems, PyPI, and
  crates.io.

Install the kit:

```bash
npx skills add svyatov/oss-kit --skill '*'
```

Then ask your agent:

```text
Audit this repository against the oss-kit standard.
```

It answers with the gaps and nothing else, each keyed to the rule it missed and
routed to the skill that fixes it. Rules that already pass do not appear:

```text
Audited 46 applicable rules: 43 pass, 2 fail, 1 unknown, 7 not applicable
(6 PUB, the project publishes no package; 1 GitLab-only).

1. R-COM-04 fail, no SECURITY.md, run oss-community
2. R-SEC-01 fail, two uses: lines in .github/workflows/validate.yml pin a tag rather than a SHA, run oss-harden
3. R-SEC-05 unknown, the maintainer's signing key was not reachable, run oss-harden
```

## Where to start

Run `oss-audit` first. It scores the whole repository and names which of the
other skills to run, so you do not have to guess which gap matters.

Starting from an empty repository there is nothing to score yet, so work in
this order instead:

1. `oss-community` for the license, code of conduct, contributing guide, and
   security policy
2. `oss-readme` for the README
3. `oss-ci` for tests, linting, and builds on push and on every change request
4. `oss-harden` for pinned action SHAs, workflow permissions, and branch
   protection
5. `oss-changelog` for CHANGELOG.md and the first tagged release
6. `oss-publish` for registry publishing, if you ship a package

`oss-writing` and `oss-skill` are not steps in that sequence. Reach for
`oss-writing` whenever you are about to write a commit, a pull request, or a
paragraph of docs, and for `oss-skill` only if your repository ships agent
skills of its own.

You can also ask for a skill by name when you already know the job: use
`oss-readme` for a README, `oss-community` for community files, `oss-ci` for
continuous integration.

## Skills

| Skill | What it does |
|---|---|
| `oss-audit` | Scores the repository and routes each gap to a skill. |
| `oss-community` | Writes every community file, from the license to issue forms. |
| `oss-readme` | Orders the README and checks its claims against the source. |
| `oss-ci` | Writes the test, lint, and build jobs for either forge. |
| `oss-harden` | Pins action SHAs, trims permissions, and guards the branch. |
| `oss-publish` | Sets up publishing to npm, RubyGems, PyPI, and crates.io. |
| `oss-changelog` | Keeps CHANGELOG.md, picks the bump, writes release notes. |
| `oss-writing` | Fixes the sentences in commits, pull requests, and docs. |
| `oss-skill` | Fixes the structure and portability of the skills you ship. |

Each skill page on the [documentation site](https://oss-kit.svyatov.com/skills/)
carries the full description, including the validator `oss-skill` bundles, which
runs on Node 22 or later, or Bun, with nothing installed.

## More install paths

One skill at a time:

```bash
npx skills add svyatov/oss-kit --skill oss-readme
```

Claude Code, GitHub Copilot CLI, and VS Code read
`.claude-plugin/marketplace.json`. In Claude Code or Copilot CLI, type these
two commands at the prompt:

```text
/plugin marketplace add svyatov/oss-kit
/plugin install oss-kit@oss-kit
```

Every other supported harness has a native install path in the
[install guide](https://oss-kit.svyatov.com/guides/install/).

## Read the standard without installing anything

Every current rule is written down in
[STANDARD.md](skills/oss-audit/STANDARD.md), also rendered at
[oss-kit.svyatov.com/standard](https://oss-kit.svyatov.com/standard/). Each
rule states what to do, why, what to check for, and which skill fixes it. Read
it and disagree with it before you install anything.

oss-kit is scored against its own standard, and [AGENTS.md](AGENTS.md) records
the reason for every rule that does not reach a skills repository.

## Help and project status

Start in [Discussions](https://github.com/svyatov/oss-kit/discussions).
Questions, disagreement with a rule, and anything you are not sure is a defect
belong there.

Open an [issue](https://github.com/svyatov/oss-kit/issues) when something is
broken, when you want to propose a rule, or when you want to propose a skill
change. Each of the three has a form.

To report a security vulnerability, follow [SECURITY.md](SECURITY.md) instead
of either.

oss-kit is maintained. It is below 1.0.0, so incompatible changes still ship
in minor releases; the Versioning section below says exactly what is covered.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the setup, test, and pull request steps.

## Changelog

Every notable change is recorded in [CHANGELOG.md](CHANGELOG.md).

## Versioning

oss-kit follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) over
four things:

- the name of every skill and its `skills/<name>/` path
- the rule IDs in `STANDARD.md` and what each rule requires
- the path, argument, and exit codes of the validator at
  `skills/oss-skill/scripts/validate.mjs`
- the manifest paths each supported host reads

The wording of a skill body, the layout of a skill's `references/` directory,
the documentation site, and the maintenance code under `scripts/` and `tests/`
are outside it. They change in any release.

Renaming or removing a skill, renaming a rule ID, or tightening what a rule
requires is an incompatible change: a repository that passed yesterday can fail
today. Adding a skill or a rule is not. While the version stays below 1.0.0, an
incompatible change ships in a MINOR release.

## License

MIT. See [LICENSE](LICENSE). A skill that derives from third-party work carries
a `sources.json` naming what it came from and who holds copyright alongside the
maintainer.
