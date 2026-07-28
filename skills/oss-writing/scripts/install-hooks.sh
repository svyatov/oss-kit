#!/bin/sh
# Points core.hooksPath at the hooks this skill ships, so the prose check runs
# on every commit in this repository. Nothing is copied: one source stays under
# skills/oss-writing/scripts/hooks/, which is what stops a second tracked copy
# drifting from it.
#
# Usage: sh skills/oss-writing/scripts/install-hooks.sh [--force]

# pwd -P resolves symlinks. Agents load this skill through a linked path such as
# .claude/skills, and recording that path in core.hooksPath leaves the caller
# comparing it against the real directory, deciding the hooks are not installed,
# and offering again on every run.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
hooks="$dir/hooks"
checker="$dir/check-tells.mjs"
# The -- stops a Markdown file whose name begins with a hyphen being read as an
# option and skipped without a word.
command="git ls-files -z '*.md' | xargs -0 node $checker --"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "install-hooks.sh: run this inside a git repository" >&2
  exit 1
fi
if [ ! -d "$hooks" ]; then
  echo "install-hooks.sh: no hooks directory at $hooks" >&2
  exit 1
fi

force=no
if [ "${1:-}" = "--force" ]; then
  force=yes
elif [ -n "${1:-}" ]; then
  echo "install-hooks.sh: unknown argument $1" >&2
  exit 1
fi

current=$(git config --get core.hooksPath 2>/dev/null)
if [ -n "$current" ] && [ "$current" != "$hooks" ] && [ "$force" = "no" ]; then
  echo "install-hooks.sh: core.hooksPath already points at $current." >&2
  echo "Re-run with --force to repoint it, or merge the two hook sets by hand." >&2
  exit 1
fi

if [ "$current" = "$hooks" ]; then
  echo "core.hooksPath already points at the shipped hooks."
else
  git config core.hooksPath "$hooks" || exit 1
  echo "core.hooksPath now points at $hooks."
fi

# A whole-file check in a repository with a backlog blocks every commit on
# prose nobody in that commit wrote, which is how a hook gets uninstalled. So
# pre-commit waits until the tracked Markdown is clean.
clean=yes
if [ ! -f "$checker" ] || ! command -v node >/dev/null 2>&1; then
  clean=no
elif [ -n "$(git ls-files '*.md')" ]; then
  git ls-files -z '*.md' | xargs -0 node "$checker" -- >/dev/null 2>&1 || clean=no
fi

if [ "$clean" = "yes" ]; then
  git config --bool osskit.precommit true
  echo "commit-msg and pre-commit are both enabled."
else
  git config --bool osskit.precommit false
  echo
  echo "This repository already has prose offences, so only commit-msg is enabled."
  echo "See them with:"
  echo "  $command"
  echo "Once they are gone, enable the staged-file check with:"
  echo "  git config --bool osskit.precommit true"
fi

cat <<EOF

core.hooksPath is local configuration, and git commit --no-verify bypasses a
hook, so CI is the enforcement that does not depend on anyone's machine. Two
steps remain, and neither is done for you.

Document the command in CONTRIBUTING.md:
  $command

Run that same command in CI. R-CI-02 checks that every command the contributing
guide gives a human has a job behind it.
EOF
