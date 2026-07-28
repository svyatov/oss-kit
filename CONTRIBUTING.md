# Contributing

This file covers how to set up, test, and submit a change to oss-kit.

## Setup

Clone the repository. The repository's own tests and typecheck need Bun, at the version pinned in `.bun-version`. Install Bun with the command Bun's own site publishes, then install the dev dependencies:

```bash
curl -fsSL https://bun.com/install | bash
bun install --frozen-lockfile
```

The documentation site under `site/` has its own dependency tree. Install it
too if you are changing anything the site renders, which includes every skill
and `STANDARD.md`:

```bash
cd site && bun install --frozen-lockfile
```

The specification validator that ships in `skills/oss-skill/scripts/validate.mjs` needs nothing installed. It runs on Node 22 or later, which is the claim it makes to the users who bundle it. One check needs a tool:

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git@a54947c307fe19a24a43db55f6148e181a987a67
```

It installs from its upstream repository, pinned to a full commit SHA, because it has no official package on a registry.

## Test

Run the same checks CI runs:

```bash
bun run typecheck
bun test
bun run lint:prose
bun run validate
bash tests/test-check-drift.sh
bash tests/test-install-hooks.sh
bash scripts/check-drift.sh
skillspector scan ./skills/ --no-llm --format json
cd site && bun run build
```

`bun run typecheck` checks the repository's own TypeScript. `bun test` runs the validator's own test suite. `bun run lint:prose` runs `skills/oss-writing/scripts/check-tells.mjs` over every tracked Markdown file, which fails on a mechanical prose tell the house style forbids and prints, without failing, on a word only a reader can judge. `bun run validate` runs `skills/oss-skill/scripts/validate.mjs`, which checks every skill against R-SKL-01 through R-SKL-05: layout, frontmatter conformance, body size, the license field, and what a skill may ship as a script. `tests/test-check-drift.sh` is the test suite for `scripts/check-drift.sh`, which fails when a skill cites a rule ID that `skills/oss-audit/STANDARD.md` does not define, or when a rule names a skill that does not claim it. `tests/test-install-hooks.sh` exercises the shipped git hooks and their installer in throwaway repositories under the system temp directory. `skillspector scan` checks the skills for prompt injection and other agent-facing risks.

The prose checker also runs on every commit, once you point git at the hooks this repository ships:

```bash
sh skills/oss-writing/scripts/install-hooks.sh
```

That sets `core.hooksPath`, which is local configuration, so it is yours to opt into and `git commit --no-verify` bypasses it.

`bun run build` in `site/` is a required check, so run it before you open a pull request. The site is generated from `STANDARD.md` and the skills, which means a rule you renamed or a reference link you moved fails this build and nothing else.

## Editing a skill

Edit files under `skills/`, never through the `.agents/skills` or `.claude/skills` symlinks. Read `AGENTS.md` before changing a skill: it states the frontmatter, length, and prose rules the tests above enforce.

## Submitting a change

Fork the repository, create a branch, and open a pull request against `main`. Use Conventional Commits for commit messages: `type(scope): description`.

Before you open the pull request:

- Add an entry to `CHANGELOG.md` under Unreleased, unless the change is not notable.
- If a skill's description changed, update the skills table in `README.md`.
- If this adds or changes a rule, check that `AGENTS.md` still describes how this repository scores against it.

This repository merges by squash with the pull request description as the commit message, so write the description as the commit body it becomes: paragraphs, no headings, and no hard wrapping.
