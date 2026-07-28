#!/usr/bin/env node
// Reports how many rules in STANDARD.md were re-verified against their upstream
// source recently. Reports only: a metric that gates turns into a chore that
// gets disabled.
import { readFileSync } from "node:fs"

const STANDARD = "skills/oss-audit/STANDARD.md"
const SOURCES = "skills/oss-audit/rule-sources.json"
const WINDOW_MONTHS = 6

const ids = [...readFileSync(STANDARD, "utf8").matchAll(/^### (R-[A-Z]+-\d{2}):/gm)].map((m) => m[1])
const sources = JSON.parse(readFileSync(SOURCES, "utf8"))

const cutoff = new Date()
cutoff.setMonth(cutoff.getMonth() - WINDOW_MONTHS)
const cutoffDay = cutoff.toISOString().slice(0, 10)

const rows = ids.map((id) => {
  const entry = sources[id] ?? {}
  return { id, verified: entry.verified ?? null, sourceless: (entry.sources ?? []).length === 0 }
})

const fresh = rows.filter((r) => r.verified && r.verified >= cutoffDay)
const stale = rows.filter((r) => !fresh.includes(r)).sort((a, b) => (a.verified ?? "").localeCompare(b.verified ?? ""))
const sourceless = rows.filter((r) => r.sourceless)

const pct = Math.round((fresh.length / rows.length) * 100)
console.log(`${fresh.length}/${rows.length} rules verified within ${WINDOW_MONTHS} months (${pct}%)`)

if (stale.length > 0) {
  console.log(`\n${stale.length} stale or never verified, oldest first:`)
  for (const r of stale) console.log(`  ${r.id.padEnd(10)} ${r.verified ?? "never"}`)
}

if (sourceless.length > 0) {
  console.log(`\n${sourceless.length} with no upstream source named:`)
  for (const r of sourceless) console.log(`  ${r.id}`)
}
