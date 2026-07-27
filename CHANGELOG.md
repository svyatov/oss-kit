# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) over the public API declared in the [README](README.md#versioning).

## [Unreleased]

### Added

- A tell catalog at `skills/oss-writing/references/tells.md`, 22 lexical patterns with what to write instead of each. It loads when a draft reads padded, generic, or promotional, rather than on every invocation, and it is published at [oss-kit.svyatov.com/skills/oss-writing/tells](https://oss-kit.svyatov.com/skills/oss-writing/tells/).
- Four composition rules in `oss-writing`, each of which costs a non-native reader more than a native one: name the referent, cap noun stacks at three, one instruction per step, keep the articles. Paraphrased from ASD-STE100, which is cited and never reproduced.
- A normative statements section in `oss-writing`. Uppercase MUST, SHOULD, and MAY carry their RFC 2119 and RFC 8174 meanings only where the document claims them; a README that shouts MUST has invented a requirement nobody is checking.
- A test that scans every Markdown file under `skills/` for em dashes and en dashes. The tree had none, and now nothing can add one unnoticed.

### Changed

- `oss-writing` moved its kill list out of the always-loaded body and into the catalog above, taking roughly a third of the skill's rules off every invocation. The lexical tells are the part a model cannot reproduce from judgment, so they were split off rather than cut.
- Every hard constraint in `oss-writing` now says what goes wrong when it is broken. A bare prohibition is weaker than the same prohibition with its reason attached.
- The README leads with what the kit is, then one install command and one worked example, in that order. The install variants and the per-host plugin commands moved below the example, because three install blocks used to run back to back before a reader saw the kit do anything.
- The README states the facts a reader picks a tool on: the rule count, the routing from a gap to the skill that fixes it, the 500-line ceiling on a skill body, and the single bundled script that needs nothing installed.
- The README links the rendered install guide and standard on [oss-kit.svyatov.com](https://oss-kit.svyatov.com) rather than the Markdown sources under `site/`. A reader on GitHub was being sent to a source file when a published page exists.

## [0.2.0] - 2026-07-27

### Added

- `oss-skill` bundles a validator at `scripts/validate.mjs` that checks a repository against R-SKL-01 through R-SKL-05. It needs Node 22 or later, or Bun, and nothing installed: it imports only Node built-in modules, reads files, and makes no network call.
- `STANDARD.md` gains R-SKL-05, a script a skill ships uses `sh` or Node with no dependencies, because it runs on the reader's machine rather than the author's, and R-SKL-06, every host a repository claims support for has a committed manifest or a documented install command.
- Plugin manifests for Codex CLI at `.codex-plugin/plugin.json` and Cursor at `.cursor-plugin/plugin.json`, Codex's own marketplace at `.agents/plugins/marketplace.json`, and an `.opencode/skills` symlink. Each host now finds the skills where it scans.
- A documentation site generated from `STANDARD.md` and the skills, served at [oss-kit.svyatov.com](https://oss-kit.svyatov.com) and redeployed on every push to `main`. Every rule has its own page, so a rule can be linked and read without installing anything.
- Install, getting started, and adoption guides on that site. The install guide covers every claimed harness, one section each.
- `oss-ci` covers static-site deployment, for GitHub Pages and GitLab Pages. It carries no rule, since no rule requires a project to publish a site, so the skill asks before writing a deploy and writes none for a project that only builds a site as a check.
- The README declares the public API that Semantic Versioning covers: skill names and paths, rule IDs and what they require, the bundled validator's command line, and the manifest paths each host reads.

### Changed

- R-SKL-02 now names the validator `oss-skill` bundles. The rule already accepted any specification validator, so what it requires has not changed.
- `oss-harden` reads the upstream project's newest release before pinning an action, component, or image, and reports a lagging major to the user instead of freezing it. R-SEC-01 and R-SEC-06 accept a SHA regardless of the age of the tag behind it, so a stale pin used to pass unquestioned and then read as audited.
- The README install section shows the two fastest commands and links to the install guide.
- Every plugin and marketplace manifest describes oss-kit as `Curated agent skills for open source maintainers`, the same line the site carries. The manifests called it an opinionated quality bar, so the pitch a reader saw depended on whether they arrived through a plugin browser or the site.
- Security reports go through GitHub private vulnerability reporting, now enabled on this repository. Email stays the fallback.
- `CONTRIBUTING.md` names the documentation site build. CI requires that check, and the guide used to say the repository has no build step, so a contributor who touched `site/` passed every documented command and still failed the merge.

### Removed

- The `skills-ref` validator is no longer installed in CI or named in the contributing guide. The bundled `oss-skill` validator replaces it, so the project no longer depends on a tool whose upstream describes it as for demonstration only.

## [0.1.0] - 2026-07-23

### Added

- `STANDARD.md` defines the 38 numbered rules the skills in this kit check a repository against, each with a check a tool can run and the skill that fixes a gap.
- `oss-writing` rewrites commit messages, pull requests, issues, and documentation prose into plain, active, marketing-free sentences.
- `oss-readme` orders a README so the install command and a working example come before motivation, and links the license, changelog, and contributing guide.
- `oss-ci` writes GitHub Actions or GitLab CI/CD configuration for lint, test, and build, matched to the runtime versions a project claims to support, with lockfile-keyed caching and job timeouts.
- `oss-publish` sets up trusted publishing, build provenance, and an approval gate for npm, RubyGems, PyPI, and crates.io releases, on both GitHub Actions and GitLab CI/CD.
- `oss-community` writes the community and governance files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY.md, issue and merge request templates, and CODEOWNERS.
- `oss-harden` pins GitHub Actions to commit SHAs, sets least-privilege workflow permissions, keeps untrusted input out of shell commands, configures Dependabot or Renovate, locks dependency resolution to a committed lockfile, runs static analysis on pull requests, and checks branch protection and signed release tags.
- `oss-changelog` keeps a changelog in Keep a Changelog format, decides the semantic version bump for a change, and drafts release notes from merged work.
- `oss-audit` scores a repository against `STANDARD.md`, reports each gap with the rule it fails, and names the skill that fixes it.
- `oss-skill` fixes the structure of a repository that ships agent skills: the top-level `skills/` layout, `SKILL.md` conformance to the Agent Skills specification, oversized bodies that belong in `references/`, and the license field an extracted skill carries with it.

[Unreleased]: https://github.com/svyatov/oss-kit/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/svyatov/oss-kit/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/svyatov/oss-kit/releases/tag/v0.1.0
