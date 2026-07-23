# Contributing

This file covers how to set up, test, and submit a change to oss-kit.

## Setup

Clone the repository. There is no build step. The checks below need two tools:

```bash
pip install skills-ref
uv tool install git+https://github.com/NVIDIA/skillspector.git
```

`skills-ref` puts `agentskills` on your PATH.

## Test

Run the same checks CI runs:

```bash
for d in skills/*/; do agentskills validate "$d" || echo "FAILED: $d"; done
bash tests/test-check-drift.sh
bash scripts/check-drift.sh
skillspector scan ./skills/ --no-llm --format json
```

`agentskills validate` checks each skill's frontmatter and directory structure. `tests/test-check-drift.sh` is the test suite for `scripts/check-drift.sh`, which fails when a skill cites a rule ID that `skills/oss-audit/STANDARD.md` does not define, or when a rule names a skill that does not claim it. `skillspector scan` checks the skills for prompt injection and other agent-facing risks.

## Editing a skill

Edit files under `skills/`, never through the `.agents/skills` or `.claude/skills` symlinks. Read `AGENTS.md` before changing a skill: it states the frontmatter, length, and prose rules the tests above enforce.

## Submitting a change

Fork the repository, create a branch, and open a pull request against `main`. Use Conventional Commits for commit messages: `type(scope): description`.
