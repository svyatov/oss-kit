# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A `pages` workflow builds the site and deploys it to GitHub Pages on every push to `main`. The site is served at `oss-kit.svyatov.com`, which is set in the repository's Pages settings: GitHub ignores a `CNAME` file when publishing from a custom Actions workflow, so `site/public/CNAME` is gone.
- `oss-ci` covers static-site deployment, for GitHub Pages and GitLab Pages. It carries no rule, since no rule requires a project to publish a site, so the skill asks before writing a deploy and writes none for a project that only builds a site as a check.
- Code scanning through CodeQL default setup, covering `javascript-typescript` and `actions`. It is a repository setting rather than a workflow, so there is no file to maintain for it.
- CI builds the documentation site. The site is generated from `STANDARD.md` and the skills, so a rule or a reference link that stops resolving now fails a check rather than reaching `main`.
- A social card at `site/public/og.png`, and the `og:image` and `twitter:image` tags that point at it. The site already declared `twitter:card=summary_large_image`, so every share rendered an empty card.
- `site/public/robots.txt`, naming the sitemap the site already generates.
- A link to the repository in the site header, and an edit link on every page. Generated pages point at the file they were generated from, not at the generated copy.

### Changed

- Every plugin and marketplace manifest describes oss-kit as `Curated agent skills for open source maintainers`, the same line the site and the social card carry. The manifests called it an opinionated quality bar, so the pitch a reader saw depended on whether they arrived through a plugin browser, a share preview, or the site. The capability list those descriptions carried lives in the `keywords` and `tags` arrays of the same files.
- A rule page is titled by the rule, not by its ID. The ID moves to a badge in the sidebar. The title drove the browser tab, the sidebar label, the pagination card, and the search result, so all four used to read `R-SEC-01` and say nothing.
- The site sidebar groups rules by area in the order `STANDARD.md` argues them. It is built from `STANDARD.md` rather than from filenames, which sorted the areas alphabetically and split each one.
- Guide and reference pages get a description drawn from their own first sentence. Guides used to repeat their title, and every reference page shared one generic line.
- A reference page title names the skill that owns it, so the two `GitHub reference` pages and the two `GitLab reference` pages are distinguishable in search results.
- Code blocks wrap, so an install command is readable on a phone without scrolling sideways.
- `/standard/` is no longer in the search index. Every rule on it has its own page, so a query used to return the same rule twice.

### Removed

- The explicit `sharp` dependency in `site/package.json`. Astro already declares it as an optional dependency, and the site has no images.

## [0.2.0] - 2026-07-23

### Added

- `oss-skill` bundles a validator at `scripts/validate.mjs` that checks a repository against R-SKL-01 through R-SKL-05. It needs Node 22 or later, or Bun, and nothing installed: it imports only Node built-in modules, reads files, and makes no network call.
- `STANDARD.md` gains R-SKL-05: a script a skill ships uses `sh` or Node with no dependencies, because it runs on the reader's machine rather than the author's.
- Plugin manifests for Codex CLI and Cursor, and Codex's own `marketplace.json` at `.agents/plugins/`.
- An `.opencode/skills` symlink, so OpenCode finds the skills where it scans.
- `docs/install.md`, one page covering every harness.
- The documentation site, generated from `STANDARD.md`, the skills, and the tracked prose under `docs/`.
- `docs/getting-started.md` and `docs/adoption-guide.md`.
- R-SKL-06: every host a repository claims support for has a committed manifest or a documented install command.

### Changed

- R-SKL-02 now names the validator `oss-skill` bundles. The rule already accepted any specification validator, so what it requires has not changed.
- `oss-harden` reads the upstream project's newest release before pinning an action, component, or image, and reports a lagging major to the user instead of freezing it. R-SEC-01 and R-SEC-06 accept a SHA regardless of the age of the tag behind it, so a stale pin used to pass unquestioned and then read as audited.
- The README install section shows the two fastest commands and links to the install page.
- `docs/` is tracked. Planning documents move to the gitignored `docs/superpowers/`.

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
