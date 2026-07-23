#!/usr/bin/env bash
set -uo pipefail

SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/scripts/check-drift.sh"
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

# Runs the script in $dir and checks the exit code. If $grep_for is
# non-empty, also requires stderr to mention it, so a case that exits 1
# for the wrong reason still fails.
run_case() {
  local name="$1" expected="$2" dir="$3" grep_for="${4:-}"
  local out
  out="$(cd "$dir" && bash "$SCRIPT" 2>&1 >/dev/null)"
  local actual=$?
  if [ "$actual" != "$expected" ]; then
    echo "FAIL - $name (expected exit $expected, got $actual)"
    fail=$((fail + 1))
    return
  fi
  if [ -n "$grep_for" ] && ! grep -q "$grep_for" <<<"$out"; then
    echo "FAIL - $name (expected stderr to mention '$grep_for', got: $out)"
    fail=$((fail + 1))
    return
  fi
  echo "ok   - $name"
  pass=$((pass + 1))
}

make_fixture() {
  local dir
  dir="$(mktemp -d)"
  mkdir -p "$dir/skills/oss-readme" "$dir/skills/oss-audit"
  cat > "$dir/skills/oss-audit/STANDARD.md" <<'EOF'
### R-DOC-01: README states what the project does in one sentence

Check: first paragraph names the problem.

Fixed by: oss-readme
Forges: both
EOF
  cat > "$dir/skills/oss-readme/SKILL.md" <<'EOF'
---
name: oss-readme
description: "test"
---
Owns R-DOC-01.
EOF
  echo "$dir"
}

# consistent
d="$(make_fixture)"; fixtures+=("$d")
run_case "consistent repo passes" 0 "$d"

# cited but undefined
d="$(make_fixture)"; fixtures+=("$d")
echo "Also owns R-DOC-99." >> "$d/skills/oss-readme/SKILL.md"
run_case "citation of undefined rule fails" 1 "$d" "R-DOC-99"

# defined but no owning skill directory
d="$(make_fixture)"; fixtures+=("$d")
sed -i.bak 's/Fixed by: oss-readme/Fixed by: oss-nonexistent/' "$d/skills/oss-audit/STANDARD.md"
run_case "rule owned by missing skill fails" 1 "$d" "oss-nonexistent"

# defined with no Fixed by line at all
d="$(make_fixture)"; fixtures+=("$d")
sed -i.bak '/Fixed by:/d' "$d/skills/oss-audit/STANDARD.md"
run_case "rule with no owner fails" 1 "$d" "R-DOC-01"

# No skill file adds a citation of its own: the only matches under
# skills/ come from STANDARD.md's own "### R-DOC-01" header, now that the
# standard lives inside skills/oss-audit/. That self-match is always a
# defined id, so it must not trip the "cites X, which STANDARD.md does
# not define" error. This also still exercises the
# "[ -z "$id" ] && continue" guard indirectly: cited is a genuine
# single-line value here, not the empty string a truly citation-free tree
# would have produced before the move, so this case now proves a
# self-match alone passes rather than proving the empty-read guard fires.
d="$(make_fixture)"; fixtures+=("$d")
: > "$d/skills/oss-readme/SKILL.md"
run_case "no external citations under skills/ still passes" 0 "$d"

# Before the move, a rule ID mentioned in a Check: line never surfaced as
# a citation, because STANDARD.md lived outside skills/ and the citation
# grep only read skills/. Now that STANDARD.md sits inside
# skills/oss-audit/, that same grep reads its own prose too, so a planted
# id STANDARD.md does not define is correctly caught as a citation, the
# same way a stray id in a skill file would be. This is the new correct
# behavior, not a regression: it also catches a mistyped cross-reference
# inside the standard's own text.
d="$(make_fixture)"; fixtures+=("$d")
sed -i.bak 's/Check: first paragraph names the problem./Check: first paragraph names the problem, as in R-ZZZ-99./' "$d/skills/oss-audit/STANDARD.md"
run_case "rule ID mentioned in STANDARD.md's own Check: line is caught as a citation" 1 "$d" "R-ZZZ-99"

# STANDARD.md missing entirely must fail loudly, not silently pass with
# zero iterations in both directions. Citations are blanked so the only
# way this case can exit non-zero is the missing-file guard itself, not
# a side effect of the (also empty) citation loop.
d="$(make_fixture)"; fixtures+=("$d")
rm -f "$d/skills/oss-audit/STANDARD.md"
: > "$d/skills/oss-readme/SKILL.md"
run_case "missing STANDARD.md fails loudly" 1 "$d" "STANDARD.md"

# STANDARD.md present but parses zero rules must also fail loudly.
# Citations are blanked for the same isolation reason as above.
d="$(make_fixture)"; fixtures+=("$d")
echo "# Not a rules file" > "$d/skills/oss-audit/STANDARD.md"
: > "$d/skills/oss-readme/SKILL.md"
run_case "STANDARD.md with no rules fails loudly" 1 "$d" "no rules"

# A rule with two Fixed by lines must be an error, not a silent first-match.
d="$(make_fixture)"; fixtures+=("$d")
cat > "$d/skills/oss-audit/STANDARD.md" <<'EOF'
### R-DOC-01: README states what the project does in one sentence

Check: first paragraph names the problem.

Fixed by: oss-readme
Fixed by: oss-readme
Forges: both
EOF
run_case "rule with two Fixed by lines fails" 1 "$d" "R-DOC-01"

# CRLF line endings in both STANDARD.md and the skill file must not
# produce false drift against a repository that is otherwise correct.
d="$(make_fixture)"; fixtures+=("$d")
printf '### R-DOC-01: README states what the project does in one sentence\r\n\r\nCheck: first paragraph names the problem.\r\n\r\nFixed by: oss-readme\r\nForges: both\r\n' > "$d/skills/oss-audit/STANDARD.md"
printf -- '---\r\nname: oss-readme\r\ndescription: "test"\r\n---\r\nOwns R-DOC-01.\r\n' > "$d/skills/oss-readme/SKILL.md"
run_case "CRLF line endings do not cause false drift" 0 "$d"

# The cleanup trap can only remove fixtures that reached this array. An
# earlier version appended from inside make_fixture, where the $(...)
# subshell discarded every write, so the trap ran over an empty list and
# removed nothing. Each case above creates exactly one fixture and runs
# exactly one run_case, so the counts must agree.
registered=${#fixtures[@]}
total=$((pass + fail))
if [ "$registered" -eq "$total" ]; then
  echo "ok   - every fixture registered for cleanup"
  pass=$((pass + 1))
else
  echo "FAIL - every fixture registered for cleanup (expected $total, got $registered)"
  fail=$((fail + 1))
fi

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
