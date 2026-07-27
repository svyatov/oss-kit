# oss-kit

Curated agent skills for open source maintainers.

[![version](https://img.shields.io/github/v/tag/svyatov/oss-kit?label=version)](https://github.com/svyatov/oss-kit/releases)
[![CI](https://github.com/svyatov/oss-kit/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/svyatov/oss-kit/actions/workflows/validate.yml)

- 41 rules in one file, each stating the check it is scored by and the single
  skill that fixes it
- `oss-audit` returns every gap keyed by its rule ID, naming the skill that
  fixes it
- nine skills, every body under 500 lines, with the depth in `references/` that
  a skill reads only when it needs it
- one bundled script, `skills/oss-skill/scripts/validate.mjs`, which imports
  Node built-in modules only and runs on Node 22 or later, or on Bun
- oss-kit is scored against its own standard, and
  [AGENTS.md](AGENTS.md) records the reason for every rule that does not reach
  a skills repository

```bash
npx skills add svyatov/oss-kit
```

```
Use oss-audit on this repository and list every gap against STANDARD.md.
```

oss-audit reads `skills/oss-audit/STANDARD.md`, scores the repository rule by
rule, and routes each gap to the skill that fixes it:

```
R-COM-04: SECURITY.md is missing. Fixed by oss-community.
R-SEC-01: 2 unpinned actions in .github/workflows/validate.yml. Fixed by oss-harden.
```

## More install paths

One skill at a time:

```bash
npx skills add svyatov/oss-kit --skill oss-readme
```

Claude Code, GitHub Copilot CLI, and VS Code read
`.claude-plugin/marketplace.json`, so the same two commands work in any of
them:

```
/plugin marketplace add svyatov/oss-kit
/plugin install oss-kit@oss-kit
```

Every other supported harness has a native install path in the
[install guide](https://oss-kit.svyatov.com/guides/install/).

## Start with the job

Ask for a skill by name when you know the responsibility. Use `oss-readme` for
a README, `oss-community` for community files, or `oss-ci` for continuous
integration. Start with `oss-audit` when you want the broadest view.

## Skills

| Skill | What it does |
|---|---|
| `oss-audit` | Scores the repository against `STANDARD.md` and returns a gap list keyed by rule ID, each routed to the skill that fixes it. |
| `oss-community` | Writes the community files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY.md, issue and change-request templates, CODEOWNERS, FUNDING, and license selection. |
| `oss-readme` | Orders the README so a reader gets the claim, the install command, and a working example before anything else, links the license, changelog, and contributing guide, and checks every version, command, and claim against the manifest, CI config, and source. |
| `oss-ci` | Writes what runs on push and on every change request, on GitHub Actions or GitLab CI/CD: test, lint, and build matrices, caching, and per-ecosystem setup. |
| `oss-harden` | Hardens the security posture: pinned action SHAs, minimal workflow permissions, untrusted input kept out of shell commands, Dependabot or Renovate, locked dependency resolution, static analysis on pull requests, branch protection, and signed tags. |
| `oss-publish` | Sets up registry publishing with trusted publishing, provenance, and an approval gate, for npm, RubyGems, PyPI, and crates.io. |
| `oss-changelog` | Keeps CHANGELOG.md in Keep a Changelog format, decides the semver bump, and writes release notes and deprecation notices. |
| `oss-writing` | Fixes the sentences in commits, pull requests, issues, docs, error messages, log lines, and code comments. |
| `oss-skill` | Fixes the structure, portability, and effectiveness of Agent Skills: canonical layout, `SKILL.md` conformance, trigger descriptions, progressive disclosure, repeatable procedures, portable scripts, evaluation, licensing, and host install paths. Bundles a validator that needs Node 22 or later, or Bun, and nothing installed. |

## Read the standard without installing anything

Every current rule is written down in
[STANDARD.md](skills/oss-audit/STANDARD.md), also rendered at
[oss-kit.svyatov.com/standard](https://oss-kit.svyatov.com/standard/). Each
rule states what to do, why, what to check for, and which skill fixes it. Read
it and disagree with it before you install anything.

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
