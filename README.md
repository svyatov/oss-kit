# oss-kit

Curated agent skills for the recurring work of maintaining an open source
repository.

The current kit has nine skills. One audits the repository against a written
quality bar. The other eight own focused documentation, community, CI,
security, release, changelog, prose, and agent-skill responsibilities.

## Install

```bash
npx skills add svyatov/oss-kit
```

One skill at a time:

```bash
npx skills add svyatov/oss-kit --skill oss-readme
```

Claude Code, GitHub Copilot CLI, and VS Code read `.claude-plugin/marketplace.json`, so the same two commands work in any of them:

```
/plugin marketplace add svyatov/oss-kit
/plugin install oss-kit@oss-kit
```

Every other supported harness has a native install path in the
[install guide](site/src/content/docs/guides/install.md).

## Start with the job

Ask for a skill by name when you know the responsibility. Use `oss-readme` for
a README, `oss-community` for community files, or `oss-ci` for continuous
integration.

Start with `oss-audit` when you want the broadest view:

```
Use oss-audit on this repository and list every gap against STANDARD.md.
```

```
oss-audit reads skills/oss-audit/STANDARD.md, scores the repository rule
by rule, and returns a gap list routed to the skill that fixes each one:

R-COM-04: SECURITY.md is missing. Fixed by oss-community.
R-SEC-01: 2 unpinned actions in .github/workflows/validate.yml. Fixed by oss-harden.
```

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
[STANDARD.md](skills/oss-audit/STANDARD.md). Each rule states what to do, why,
what to check for, and which skill fixes it. Read it and disagree with it
before you install anything.

oss-kit meets every applicable rule of its own [STANDARD.md](skills/oss-audit/STANDARD.md) except four that await the public repository or the first release: branch protection waits on the public repository, and signed releases and the two release-tied changelog rules wait on the first tagged release. Rules that do not apply to a skills repository, such as the package-registry publishing rules, are recorded in AGENTS.md alongside these four.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the setup, test, and pull request steps.

## Changelog

Every notable change is recorded in [CHANGELOG.md](CHANGELOG.md).

## Credits

Four upstream projects this kit borrows from:

- [Evil Martians](https://github.com/evilmartians/agent-skills), source of `oss-readme` and part of `oss-publish`
- [vfarcic](https://github.com/vfarcic/dot-ai), source of `oss-ci`
- [blader](https://github.com/blader/humanizer), source of part of `oss-writing`
- [softaworks](https://github.com/softaworks/agent-toolkit), source of part of `oss-writing`

## License

MIT. See [LICENSE](LICENSE).
