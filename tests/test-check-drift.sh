#!/usr/bin/env bash
set -uo pipefail

SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/scripts/check-drift.sh"
pass=0
fail=0

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
  mkdir -p "$dir/skills/oss-readme"
  cat > "$dir/STANDARD.md" <<'EOF'
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
d="$(make_fixture)"
run_case "consistent repo passes" 0 "$d"

# cited but undefined
d="$(make_fixture)"
echo "Also owns R-DOC-99." >> "$d/skills/oss-readme/SKILL.md"
run_case "citation of undefined rule fails" 1 "$d" "R-DOC-99"

# defined but no owning skill directory
d="$(make_fixture)"
sed -i.bak 's/Fixed by: oss-readme/Fixed by: oss-nonexistent/' "$d/STANDARD.md"
run_case "rule owned by missing skill fails" 1 "$d" "oss-nonexistent"

# defined with no Fixed by line at all
d="$(make_fixture)"
sed -i.bak '/Fixed by:/d' "$d/STANDARD.md"
run_case "rule with no owner fails" 1 "$d" "R-DOC-01"

# skills/ has no citations at all: nothing to check in that direction,
# and the sole defined rule still has a valid owner, so this must pass.
d="$(make_fixture)"
: > "$d/skills/oss-readme/SKILL.md"
run_case "no citations under skills/ still passes" 0 "$d"

# a Check: line happens to mention a rule ID: that mention must not be
# read as a citation requiring a definition, since the ID it names is
# already defined, but a bogus one in Check: text would prove the
# distinction if it leaked through.
d="$(make_fixture)"
sed -i.bak 's/Check: first paragraph names the problem./Check: first paragraph names the problem, as in R-DOC-01./' "$d/STANDARD.md"
run_case "rule ID mentioned in Check: line does not break parsing" 0 "$d"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
