#!/usr/bin/env bash
# Checks STANDARD.md and skills/ agree, in both directions.
set -uo pipefail

status=0
err() { echo "drift: $*" >&2; status=1; }

if [ ! -f STANDARD.md ] || [ ! -r STANDARD.md ]; then
  err "STANDARD.md is missing or unreadable; restore it before this check can run"
  exit $status
fi

# Strip CRLF once so neither the rule scan nor the "Fixed by:" field
# split below ends up with a trailing \r glued to an id or a skill name.
content="$(tr -d '\r' < STANDARD.md)"
defined="$(grep -oE '^### (R-[A-Z]+-[0-9]{2})' <<<"$content" | awk '{print $2}' | sort -u)"

if [ -z "$defined" ]; then
  err "STANDARD.md defines no rules matching '### R-<AREA>-<NN>'; add at least one rule"
  exit $status
fi

cited="$(grep -rhoE 'R-[A-Z]+-[0-9]{2}' skills/ 2>/dev/null | tr -d '\r' | sort -u)"

# Every cited rule must exist.
while read -r id; do
  [ -z "$id" ] && continue
  grep -qx "$id" <<<"$defined" || err "skills cite $id, which STANDARD.md does not define; define $id in STANDARD.md or remove the citation"
done <<<"$cited"

# Every defined rule must name exactly one owning skill, and that skill must exist.
while read -r id; do
  [ -z "$id" ] && continue
  info="$(awk -v id="$id" '
    $0 ~ "^### " id ":" { inrule = 1; next }
    inrule && /^### / { exit }
    inrule && /^Fixed by:/ { count++; owner = $3 }
    END { printf "%d\t%s\n", count + 0, owner }
  ' <<<"$content")"
  count="${info%%$'\t'*}"
  owner="${info#*$'\t'}"
  if [ "$count" -eq 0 ]; then
    err "$id has no 'Fixed by:' line; add one naming the skill that fixes it"
  elif [ "$count" -gt 1 ]; then
    err "$id has $count 'Fixed by:' lines; keep exactly one"
  elif [ ! -d "skills/$owner" ]; then
    err "$id is fixed by '$owner', which is not a directory under skills/; create skills/$owner or correct the 'Fixed by:' line"
  fi
done <<<"$defined"

exit $status
