# oss-kit

Curated agent skills for open source maintainers.

[![version](https://img.shields.io/github/v/tag/svyatov/oss-kit?label=version)](https://github.com/svyatov/oss-kit/releases)
[![CI](https://github.com/svyatov/oss-kit/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/svyatov/oss-kit/actions/workflows/validate.yml)

- **46 rules.** Each states the check it is scored by and the one skill that
  fixes it.
- **Seven areas.** Documentation, community files, CI, security posture,
  release publishing, changelog discipline, and the agent skills a repository
  ships.
- **Both forges.** 43 of the 46 rules score GitHub and GitLab alike. Two are
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

It answers with the gaps, each keyed to the rule it failed and routed to the
skill that fixes it:

```text
R-COM-04: SECURITY.md is missing. Fixed by oss-community.
R-SEC-01: 2 unpinned actions in .github/workflows/validate.yml. Fixed by oss-harden.
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
| `oss-audit` | Scores the repository against `STANDARD.md` and returns a gap list keyed by rule ID, each routed to the skill that fixes it. |
| `oss-community` | Writes the community files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY.md, issue forms and change-request templates, CODEOWNERS, FUNDING, and license selection, and sets the forge project's description, topics, and homepage. |
| `oss-readme` | Orders the README so a reader gets the claim, the install command, and a working example before anything else, links the license, changelog, and contributing guide, and checks every version, command, and claim against the manifest, CI config, and source. |
| `oss-ci` | Writes what runs on push and on every change request, on GitHub Actions or GitLab CI/CD: test, lint, and build matrices, caching, and per-ecosystem setup. |
| `oss-harden` | Hardens the security posture: pinned action SHAs, minimal workflow permissions, untrusted input kept out of shell commands, Dependabot or Renovate, locked dependency resolution, static analysis on pull requests, branch protection, and signed tags. |
| `oss-publish` | Sets up registry publishing with trusted publishing, provenance, and an approval gate, for npm, RubyGems, PyPI, and crates.io. |
| `oss-changelog` | Keeps CHANGELOG.md in Keep a Changelog format, decides the semver bump, and writes release notes and deprecation notices. |
| `oss-writing` | Fixes the sentences in commits, pull requests, issues, docs, error messages, log lines, and code comments. |
| `oss-skill` | Fixes the structure, portability, and effectiveness of Agent Skills: canonical layout, `SKILL.md` conformance, trigger descriptions, progressive disclosure, repeatable procedures, portable scripts, evaluation, licensing, and host install paths. Bundles a validator that needs Node 22 or later, or Bun, and nothing installed. |

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

Ask a question or report a problem in
[Issues](https://github.com/svyatov/oss-kit/issues). Questions and defect
reports go to the same place. To report a security vulnerability, follow
[SECURITY.md](SECURITY.md) instead of opening an issue.

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
