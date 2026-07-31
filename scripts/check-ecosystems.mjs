#!/usr/bin/env node
// Fails when the ecosystem matrix has a hole. The roster names the ecosystems
// and, per skill, the headings that skill's files must carry, so adding an
// ecosystem is one roster entry plus one file per skill and this reports the
// files. It deliberately does not compare a skill's routing prose to the
// roster: that comparison is review work, and a guard is a tax forever.
//
// Collect then exit, in check-drift.sh's style, so one run reports every hole
// rather than the first. Node builtins only, cwd-relative paths, no dependency.

import { existsSync, readdirSync, readFileSync } from "node:fs"

const ROSTER = "skills/oss-audit/ecosystems.json"

/** @type {string[]} */
const problems = []
const report = (problem, fix) => problems.push(`ecosystems: ${problem}; ${fix}`)

/**
 * An empty roster must fail rather than iterate zero times. A checker that
 * exits 0 on nothing checked is the dangerous failure, because it reads
 * exactly like a checker that looked and found everything in order.
 */
function readRoster() {
  if (!existsSync(ROSTER)) {
    report(`${ROSTER} does not exist`, `restore the roster, which is what declares the ecosystems`)
    return null
  }
  let roster
  try {
    roster = JSON.parse(readFileSync(ROSTER, "utf8"))
  } catch (error) {
    report(`${ROSTER} is not valid JSON: ${error.message}`, "fix the syntax")
    return null
  }
  const ecosystems = Object.keys(roster.ecosystems ?? {})
  const sections = roster.sections ?? {}
  if (ecosystems.length === 0) {
    report(`${ROSTER} lists no ecosystems`, "add an entry under the ecosystems key")
    return null
  }
  if (Object.keys(sections).length === 0) {
    report(`${ROSTER} declares no section sets`, "add an entry under the sections key")
    return null
  }
  return { ecosystems, sections }
}

/**
 * A declared heading is an `##` line beginning with the declared text, so the
 * gap convention `## Verify provenance (Step 5): a gap, not a check` still
 * matches. The level is exact: a heading demoted to `###` is a hole, because
 * the site stitches on `##`.
 * @param {string[]} lines
 */
function headings(lines) {
  return lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^## \S/.test(line))
    .map(({ line, index }) => ({ text: line.slice(3).trim(), index }))
}

/**
 * The weakest content assertion that still means something: one non-blank line
 * before the next heading of any level or the end of the file. It is what stops
 * a bare heading satisfying "every file carries every section" and "a gap is
 * stated rather than omitted" at the same time, which is the state the second
 * of those exists to prevent. Anything stronger starts grading prose.
 * @param {string[]} lines @param {number} start
 */
function hasBody(lines, start) {
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? ""
    if (/^#{1,6} /.test(line)) return false
    if (line.trim() !== "") return true
  }
  return false
}

const VERIFIED = /^Verified (\d{4})-(\d{2})-(\d{2})\b/

/** @param {string} path @param {string[]} declared */
function checkFile(path, declared) {
  const lines = readFileSync(path, "utf8").split("\n")
  const found = headings(lines)

  for (const want of declared) {
    const match = found.find((heading) => heading.text.startsWith(want))
    if (!match) {
      report(`${path} is missing the declared section '${want}'`, `add a '## ${want}' heading with a body`)
      continue
    }
    if (!hasBody(lines, match.index)) {
      report(
        `${path} declares '${want}' and leaves it empty`,
        "state the answer, or state the gap and why it is one",
      )
    }
  }

  const verified = VERIFIED.exec(lines.findLast((line) => line.trim() !== "") ?? "")
  if (!verified) {
    report(
      `${path} does not end with a Verified line`,
      "close the file with 'Verified YYYY-MM-DD' naming the pages read",
    )
    return
  }
  // A date nobody could have read on is worse than no date: it claims a
  // verification that has not happened yet.
  const [, year, month, day] = verified
  const stamp = `${year}-${month}-${day}`
  // The local calendar day, not the UTC one that rule-freshness.mjs compares
  // against: a maintainer ahead of UTC stamps the day they read the pages, and
  // a UTC comparison would call that today's date tomorrow's for a few hours.
  const today = new Date().toLocaleDateString("en-CA")
  if (Number.isNaN(Date.parse(stamp))) {
    report(`${path} has an unparseable Verified date '${stamp}'`, "use a real calendar date")
  } else if (stamp > today) {
    report(`${path} is verified as of ${stamp}, which is in the future`, "date it to the day the pages were read")
  }
}

const roster = readRoster()
if (roster) {
  const { ecosystems, sections } = roster
  for (const [skill, declared] of Object.entries(sections)) {
    const dir = `skills/${skill}/references/ecosystems`
    if (!existsSync(dir)) {
      report(`${dir} does not exist`, `create it and add one file per ecosystem, or drop '${skill}' from the roster`)
      continue
    }
    if (!Array.isArray(declared) || declared.length === 0) {
      report(`the roster declares no sections for '${skill}'`, "list the headings its ecosystem files carry")
      continue
    }
    for (const name of ecosystems) {
      const path = `${dir}/${name}.md`
      if (!existsSync(path)) {
        report(`${path} does not exist`, `write it, or remove '${name}' from the roster`)
        continue
      }
      checkFile(path, declared)
    }
    // A file naming no roster entry is a rename nobody finished or an
    // ecosystem somebody added without the roster. Either way it is invisible
    // to the site, which stitches from the roster.
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith(".md")) continue
      const name = entry.slice(0, -3)
      if (!ecosystems.includes(name)) {
        report(`${dir}/${entry} names no roster ecosystem`, `add '${name}' to the roster, or delete the file`)
      }
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem)
  process.exit(1)
}
console.log(`ecosystems: ${roster.ecosystems.length} ecosystems x ${Object.keys(roster.sections).length} skills, all present`)
