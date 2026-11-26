# Working in this repository

Edit skills under `skills/`. Keep the skill directories under `.agents/`, `.claude/`, and `.opencode/` as symlinks.

Use [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, branch names, and pull requests. Follow [oss-writing](skills/oss-writing/SKILL.md) for repository prose. Keep local agent documentation under `docs/` untracked.

## Editing skills

- Match each skill's directory name to its `oss-` prefixed frontmatter name. Quote the description.
- Keep each `SKILL.md` body under 500 lines. Put detailed material under the skill's `references/` directory.
- Describe the work without naming harness-specific tools, requiring subagents, or branching on tool availability.
- Follow R-SKL-05 for shipped scripts. Use portable sh or dependency-free JavaScript compatible with Node 22. Repository maintenance scripts may use Bun.
- Before installing or documenting a tool, follow its upstream project's installation instructions. If the package, executable, or version contradicts upstream, stop and ask the maintainer.
- After changing a skill, run the checks in [CONTRIBUTING.md](CONTRIBUTING.md#test). Update its README table entry if the description changed.

For derived skills, `sources.json` records how the shipped skill differs from upstream. Amend the newest unreleased modification. Start an entry after a tag freezes the previous one. Remove claims that no longer describe the skill, including changes that were reversed.

## Changing the standard

[The standard](skills/oss-audit/STANDARD.md) defines each requirement. Cite its rule ID from skills. Follow a neighboring rule's heading and field format. Keep numbering consecutive within each area. Mark retired IDs in place.

Give each rule one observable `Check:`, one fixing skill under `Fixed by:`, and one `Forges:` value. Use `github`, `gitlab`, or `both`. The fixing skill must claim the rule. The audit skill routes findings and owns no rules.

Update [rule-sources.json](skills/oss-audit/rule-sources.json) for each rule. Set `verified` to the date you read the source. For a project opinion without a source, record the observation and what would retire the rule.

For ecosystem changes, update [the roster](skills/oss-audit/ecosystems.json) and each participating skill's ecosystem reference. [CONTRIBUTING.md](CONTRIBUTING.md#test) lists the routing and release guidance the checker cannot verify.

## Packaging and site assets

Keep development manifests and lockfiles in `tools/` or `site/`. A root manifest and lockfile trigger dependency installation on plugin users' machines. Limit binary assets to PNG, JPEG, GIF, WebP, and fonts.

For releases, use `chore/release-X.Y.Z`. Update the versions in the Claude, Codex, and Cursor plugin manifests together.

Edit generated site pages at their sources. Handwritten pages under `site/src/content/docs/` are tracked. Keep `.claude-plugin/icon.svg` in sync with `site/public/icon.svg`. Use a self-contained, static listing icon on white, without stylesheets.

To regenerate `site/public/og.png`, serve `site/` over local HTTP so the font loads. Capture `site/scripts/og.html` at 1200 by 630 pixels. Resize a high-density capture to those dimensions.

## Auditing this repository

| Rule | Reason or condition to recheck |
| --- | --- |
| R-CI-04 | The workflows define no dependency cache. |
| R-SEC-06 | This rule applies to GitLab. The repository uses GitHub. |
| PUB area, R-CHG-07 | Installs use repository paths. Releases ship source, with no registry package identity. Reassess PUB if a release attaches a built artifact. |
| R-CHG-05 | No release has removed a public API item. Use the [README's versioning contract](README.md#versioning) to identify those items. |
| R-CHG-06 | Source-only releases have shipped no fix for a publicly known runtime vulnerability. Reassess build dependencies if releases begin shipping built artifacts. |
| R-SEC-12, R-COM-06 | Only the owner can merge. Reassess required approvals and code owner review when another principal gains merge access. |

For R-CI-05, the OSV jobs call reusable workflows without timeouts. Their callers cannot set timeouts.

For R-SEC-11, OSV scans dependencies, but the main ruleset does not require its result. Confirm `pull-request / osv-scan` passes on a fork pull request before making it a required check.

The maintainer recorded enabling Dependabot malware alerts and grouped security updates manually. Check the repository settings when either control needs fresh evidence.
