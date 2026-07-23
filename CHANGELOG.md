# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `STANDARD.md` defines the 31 numbered rules the skills in this kit check a repository against, each with a check a tool can run and the skill that fixes a gap.
- `oss-writing` rewrites commit messages, pull requests, issues, and documentation prose into plain, active, marketing-free sentences.
- `oss-readme` orders a README so the install command and a working example come before motivation, and links the license, changelog, and contributing guide.
- `oss-ci` writes GitHub Actions or GitLab CI/CD configuration for lint, test, and build, matched to the runtime versions a project claims to support, with lockfile-keyed caching and job timeouts.
- `oss-publish` sets up trusted publishing, build provenance, and an approval gate for npm, RubyGems, PyPI, and crates.io releases, on both GitHub Actions and GitLab CI/CD.
- `oss-community` writes the community and governance files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY.md, issue and merge request templates, and CODEOWNERS.
- `oss-harden` pins GitHub Actions to commit SHAs, sets least-privilege workflow permissions, configures Dependabot or Renovate, and checks branch protection and signed release tags.
- `oss-changelog` keeps a changelog in Keep a Changelog format, decides the semantic version bump for a change, and drafts release notes from merged work.
- `oss-audit` scores a repository against `STANDARD.md`, reports each gap with the rule it fails, and names the skill that fixes it.
