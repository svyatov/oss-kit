#!/usr/bin/env bash
# Exercises the installer and both hooks in throwaway repositories under the
# system temp directory. Nothing here touches the repository it runs from.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS="$ROOT/skills/oss-writing/scripts"
INSTALLER="$SCRIPTS/install-hooks.sh"
pass=0
fail=0

fixtures=()
cleanup() {
  local d
  for d in "${fixtures[@]:-}"; do
    [ -n "$d" ] && rm -rf "$d"
  done
}
trap cleanup EXIT

make_repo() {
  local dir
  dir="$(mktemp -d)"
  fixtures+=("$dir")
  git -C "$dir" init -q
  git -C "$dir" config user.email tester@example.com
  git -C "$dir" config user.name Tester
  git -C "$dir" config commit.gpgsign false
  printf '%s\n' "$dir"
}

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "ok   - $name"
    pass=$((pass + 1))
  else
    echo "FAIL - $name (expected $expected, got $actual)"
    fail=$((fail + 1))
  fi
}

contains() {
  local name="$1" needle="$2" haystack="$3"
  if grep -qF -- "$needle" <<<"$haystack"; then
    echo "ok   - $name"
    pass=$((pass + 1))
  else
    echo "FAIL - $name (expected output to mention '$needle', got: $haystack)"
    fail=$((fail + 1))
  fi
}

lacks() {
  local name="$1" needle="$2" haystack="$3"
  if grep -qF -- "$needle" <<<"$haystack"; then
    echo "FAIL - $name (expected output not to mention '$needle', got: $haystack)"
    fail=$((fail + 1))
  else
    echo "ok   - $name"
    pass=$((pass + 1))
  fi
}

# commit-msg, driven directly with a message file.
repo="$(make_repo)"
msg="$repo/msg.txt"

printf 'feat: utilize the new parser\n' >"$msg"
out="$(sh "$SCRIPTS/hooks/commit-msg" "$msg" 2>&1)"
check "commit-msg rejects an offence" 1 "$?"
contains "commit-msg names the replacement" "->  use" "$out"

printf 'feat: add a comprehensive test suite\n' >"$msg"
out="$(sh "$SCRIPTS/hooks/commit-msg" "$msg" 2>&1)"
check "commit-msg lets a suspicion through" 0 "$?"
contains "commit-msg still prints the suspicion" "suspicion" "$out"

printf 'feat(parser): handle empty input\n' >"$msg"
out="$(sh "$SCRIPTS/hooks/commit-msg" "$msg" 2>&1)"
check "commit-msg accepts a clean message" 0 "$?"
check "commit-msg says nothing about a clean message" "" "$out"

printf 'feat: handle empty input\n\n# Please enter the commit message.\n# On Branch Main\n' >"$msg"
sh "$SCRIPTS/hooks/commit-msg" "$msg" >/dev/null 2>&1
check "commit-msg ignores git's own comment lines" 0 "$?"

printf 'feat: handle empty input\n\n# ------------------------ >8 ------------------------\ndiff --git a/A b/A\n+We utilize it\n' >"$msg"
sh "$SCRIPTS/hooks/commit-msg" "$msg" >/dev/null 2>&1
check "commit-msg ignores the verbose diff below the scissors" 0 "$?"

# A hooks directory with no checker beside it.
orphan="$(mktemp -d)"
fixtures+=("$orphan")
cp -R "$SCRIPTS/hooks" "$orphan/hooks"
printf 'feat: utilize the new parser\n' >"$msg"
out="$(sh "$orphan/hooks/commit-msg" "$msg" 2>&1)"
check "a hook with no checker beside it exits 0" 0 "$?"
contains "a hook with no checker says why it skipped" "no checker" "$out"

# pre-commit, over the index.
repo="$(make_repo)"
printf 'a clean note.\n' >"$repo/a.md"
printf 'png\n' >"$repo/b.png"
git -C "$repo" add a.md b.png
out="$(cd "$repo" && sh "$SCRIPTS/hooks/pre-commit" 2>&1)"
check "pre-commit passes clean staged Markdown" 0 "$?"

printf 'We utilize it.\n' >"$repo/a.md"
git -C "$repo" add a.md
out="$(cd "$repo" && sh "$SCRIPTS/hooks/pre-commit" 2>&1)"
check "pre-commit rejects a staged offence" 1 "$?"
contains "pre-commit names the file" "a.md" "$out"

git -C "$repo" checkout -q -- . 2>/dev/null
printf 'We utilize it.\n' >"$repo/a.md"
git -C "$repo" reset -q
git -C "$repo" add b.png
out="$(cd "$repo" && sh "$SCRIPTS/hooks/pre-commit" 2>&1)"
check "pre-commit ignores a commit with no staged Markdown" 0 "$?"
check "pre-commit says nothing when there is nothing to check" "" "$out"

git -C "$repo" config --bool osskit.precommit false
git -C "$repo" add a.md
out="$(cd "$repo" && sh "$SCRIPTS/hooks/pre-commit" 2>&1)"
check "pre-commit stands down while osskit.precommit is false" 0 "$?"

# The installer in a clean repository.
repo="$(make_repo)"
printf '# a clean note\n\nordinary prose.\n' >"$repo/a.md"
git -C "$repo" add a.md
out="$(cd "$repo" && sh "$INSTALLER" 2>&1)"
check "the installer succeeds in a clean repository" 0 "$?"
check "core.hooksPath points at the shipped hooks" "$SCRIPTS/hooks" "$(git -C "$repo" config --get core.hooksPath)"
check "pre-commit is enabled" "true" "$(git -C "$repo" config --get osskit.precommit)"
contains "the installer says both hooks are on" "both enabled" "$out"
contains "the installer prints the contributing line" "CONTRIBUTING.md" "$out"
contains "the installer prints the CI step" "R-CI-02" "$out"

again="$(cd "$repo" && sh "$INSTALLER" 2>&1)"
check "the installer is idempotent" 0 "$?"
contains "the second run reports it was already installed" "already points" "$again"
check "core.hooksPath is unchanged" "$SCRIPTS/hooks" "$(git -C "$repo" config --get core.hooksPath)"

# A real commit, which is the claim the hook actually makes.
printf 'a note.\n' >"$repo/b.md"
git -C "$repo" add b.md
out="$(cd "$repo" && git commit -m "feat: utilize the new parser" 2>&1)"
check "git commit fails on an offence in the message" 1 "$?"
contains "the failure names the word" "utilize" "$out"
check "no commit object was written" "0" "$(git -C "$repo" rev-list --count --all)"

(cd "$repo" && git commit -q --no-verify -m "feat: utilize the new parser" >/dev/null 2>&1)
check "--no-verify bypasses the hook" "1" "$(git -C "$repo" rev-list --count --all)"

# The installer in a repository that already has offences.
repo="$(make_repo)"
printf 'We utilize it.\n' >"$repo/a.md"
git -C "$repo" add a.md
out="$(cd "$repo" && sh "$INSTALLER" 2>&1)"
check "the installer succeeds despite a backlog" 0 "$?"
check "pre-commit is held back" "false" "$(git -C "$repo" config --get osskit.precommit)"
contains "the installer says why" "only commit-msg is enabled" "$out"
contains "the installer prints the cleanup command" "git ls-files" "$out"
lacks "the installer does not claim both are on" "both enabled" "$out"
contains "the installer still prints the CI step" "R-CI-02" "$out"

# The installer against a hooksPath somebody else set.
repo="$(make_repo)"
git -C "$repo" config core.hooksPath .githooks
out="$(cd "$repo" && sh "$INSTALLER" 2>&1)"
check "the installer refuses to repoint an unrelated hooksPath" 1 "$?"
contains "the installer says what is there" ".githooks" "$out"
check "the unrelated hooksPath is untouched" ".githooks" "$(git -C "$repo" config --get core.hooksPath)"

out="$(cd "$repo" && sh "$INSTALLER" --force 2>&1)"
check "--force repoints it" 0 "$?"
check "core.hooksPath moved" "$SCRIPTS/hooks" "$(git -C "$repo" config --get core.hooksPath)"

# Outside a repository.
outside="$(mktemp -d)"
fixtures+=("$outside")
out="$(cd "$outside" && sh "$INSTALLER" 2>&1)"
check "the installer refuses to run outside a repository" 1 "$?"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
