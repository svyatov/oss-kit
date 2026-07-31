#!/usr/bin/env node
// Reports how recently each ecosystem file was checked against the upstream
// pages its Verified line names. Reports only: a metric that gates turns into a
// chore that gets disabled. check-ecosystems.mjs is the gate, and it asks only
// that the line is well formed and not in the future.
import { existsSync, readFileSync } from "node:fs"

const ROSTER = "skills/oss-audit/ecosystems.json"
const WINDOW_MONTHS = 6

const roster = JSON.parse(readFileSync(ROSTER, "utf8"))
const ecosystems = Object.keys(roster.ecosystems)
const skills = Object.keys(roster.sections)

const cutoff = new Date()
cutoff.setMonth(cutoff.getMonth() - WINDOW_MONTHS)
const cutoffDay = cutoff.toLocaleDateString("en-CA")

/** @type {{ path: string, verified: string|null }[]} */
const rows = []
for (const skill of skills) {
  for (const name of ecosystems) {
    const path = `skills/${skill}/references/ecosystems/${name}.md`
    if (!existsSync(path)) continue
    const lines = readFileSync(path, "utf8").split("\n")
    const last = lines.findLast((line) => line.trim() !== "") ?? ""
    rows.push({ path, verified: /^Verified (\d{4}-\d{2}-\d{2})\b/.exec(last)?.[1] ?? null })
  }
}

if (rows.length === 0) {
  console.log("no ecosystem files found")
} else {
  const isFresh = (r) => r.verified !== null && r.verified >= cutoffDay
  const fresh = rows.filter(isFresh)
  const stale = rows.filter((r) => !isFresh(r)).sort((a, b) => (a.verified ?? "").localeCompare(b.verified ?? ""))
  const pct = Math.round((fresh.length / rows.length) * 100)
  console.log(`${fresh.length}/${rows.length} ecosystem files verified within ${WINDOW_MONTHS} months (${pct}%)`)

  if (stale.length > 0) {
    console.log(`\n${stale.length} stale or undated, oldest first:`)
    for (const r of stale) console.log(`  ${(r.verified ?? "never").padEnd(12)} ${r.path}`)
  }
}
