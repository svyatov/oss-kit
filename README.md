# oss-kit

Eight agent skills that hold your open source repository to one written quality bar, and tell you where it falls short.

The bar covers GitHub and GitLab. Rules that apply to only one forge say so.

## Install

```bash
npx skills add svyatov/oss-kit
```

One skill at a time:

```bash
npx skills add svyatov/oss-kit --skill oss-readme
```

Claude Code and GitHub Copilot CLI both read `.claude-plugin/marketplace.json`, so the same two commands work in either:

```
/plugin marketplace add svyatov/oss-kit
/plugin install oss-kit@oss-kit
```

## Skills

| Skill | What it does |
|---|---|
| `oss-audit` | Scores the repository against `STANDARD.md` and returns a gap list keyed by rule ID, each routed to the skill that fixes it. |
| `oss-scaffold` | Writes the community files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY.md, issue and change-request templates, CODEOWNERS, FUNDING, and license selection. |
| `oss-readme` | Orders the README so a reader gets the claim, the install command, and a working example before anything else. |
| `oss-ci` | Writes what runs on push and on every change request: test, lint, and build matrices, caching, and per-ecosystem setup. |
| `oss-harden` | Hardens the security posture: pinned action SHAs, minimal workflow permissions, Dependabot or Renovate, branch protection, and signed tags. |
| `oss-release` | Sets up registry publishing with trusted publishing, provenance, and an approval gate, for npm, RubyGems, PyPI, and crates.io. |
| `oss-changelog` | Keeps CHANGELOG.md in Keep a Changelog format, decides the semver bump, and writes release notes and deprecation notices. |
| `oss-writing` | Fixes the sentences in commits, pull requests, issues, docs, error messages, log lines, and code comments. |

## Read the standard without installing anything

Every opinion these skills hold is written down in [STANDARD.md](STANDARD.md), one numbered rule at a time. Each rule states what to do, why, what to check for, and which skill fixes it. Read it and disagree with it before you install anything.

## Credits

Four upstream projects this kit borrows from:

- [Evil Martians](https://github.com/evilmartians/agent-skills), source of `oss-readme` and part of `oss-release`
- [vfarcic](https://github.com/vfarcic/dot-ai), source of `oss-ci`
- [blader](https://github.com/blader/humanizer), source of part of `oss-writing`
- [softaworks](https://github.com/softaworks/agent-toolkit), source of part of `oss-writing`

## License

MIT. See [LICENSE](LICENSE).
