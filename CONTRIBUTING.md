# Contributing

This file covers how to set up, test, and submit a change to oss-kit.

## Setup

Clone the repository. There is no build step. The repository's own tests and typecheck need Bun, at the version pinned in `.bun-version`. Install Bun with the command Bun's own site publishes, then install the dev dependencies:

```bash
curl -fsSL https://bun.com/install | bash
bun install --frozen-lockfile
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
bun run validate
bash tests/test-check-drift.sh
bash scripts/check-drift.sh
skillspector scan ./skills/ --no-llm --format json
```

`bun run typecheck` checks the repository's own TypeScript. `bun test` runs the validator's own test suite. `bun run validate` runs `skills/oss-skill/scripts/validate.mjs`, which checks every skill against R-SKL-01 through R-SKL-05: layout, frontmatter conformance, body size, the license field, and what a skill may ship as a script. `tests/test-check-drift.sh` is the test suite for `scripts/check-drift.sh`, which fails when a skill cites a rule ID that `skills/oss-audit/STANDARD.md` does not define, or when a rule names a skill that does not claim it. `skillspector scan` checks the skills for prompt injection and other agent-facing risks.

## Editing a skill

Edit files under `skills/`, never through the `.agents/skills` or `.claude/skills` symlinks. Read `AGENTS.md` before changing a skill: it states the frontmatter, length, and prose rules the tests above enforce.

## Submitting a change

Fork the repository, create a branch, and open a pull request against `main`. Use Conventional Commits for commit messages: `type(scope): description`.
