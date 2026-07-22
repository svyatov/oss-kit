#!/usr/bin/env bash
# Checks STANDARD.md and skills/ agree, in both directions.
set -uo pipefail

status=0
err() { echo "drift: $*" >&2; status=1; }

defined="$(grep -oE '^### (R-[A-Z]+-[0-9]{2})' STANDARD.md | awk '{print $2}' | sort -u)"
cited="$(grep -rhoE 'R-[A-Z]+-[0-9]{2}' skills/ 2>/dev/null | sort -u)"

# Every cited rule must exist.
while read -r id; do
  [ -z "$id" ] && continue
  grep -qx "$id" <<<"$defined" || err "skills cite $id, which STANDARD.md does not define"
done <<<"$cited"

# Every defined rule must name exactly one owning skill, and that skill must exist.
while read -r id; do
  [ -z "$id" ] && continue
  owner="$(awk -v id="$id" '
    $0 ~ "^### " id ":" { inrule = 1; next }
    inrule && /^### / { exit }
    inrule && /^Fixed by:/ { print $3; exit }
  ' STANDARD.md)"
  if [ -z "$owner" ]; then
    err "$id has no 'Fixed by:' line"
  elif [ ! -d "skills/$owner" ]; then
    err "$id is fixed by '$owner', which is not a directory under skills/"
  fi
done <<<"$defined"

exit $status
