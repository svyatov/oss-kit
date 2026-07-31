import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

// README.md and the slate in oss-readme quote how many rules the standard
// holds, how many score both forges, and how an audit of one repository splits
// them. Nothing derived those numbers, so adding a rule left them stale and no
// check failed: the slate offered 45 rules and 40 of 41 rules on both forges
// long after the standard passed each, and both audit examples went on summing
// to 46 after the standard reached 50. Both files are exemplars of R-DOC-04,
// the rule against exactly this drift, so they are the last that should carry
// an unchecked number.
const standard = readFileSync("skills/oss-audit/STANDARD.md", "utf8")

const total = [...standard.matchAll(/^### R-[A-Z]+-\d{2}:/gm)].length
const forges = [...standard.matchAll(/^Forges: (\S+)$/gm)].map((m) => m[1])
const both = forges.filter((f) => f === "both").length
const pub = [...standard.matchAll(/^### R-PUB-\d{2}:/gm)].length
const gitlabOnly = forges.filter((f) => f === "gitlab").length

// Compared as phrases rather than with toContain on the file, so a failure
// prints the stale wording instead of the whole document.
const phrases = (text: string) => [...text.matchAll(/\b\d+ (?:of (?:the )?\d+ )?rules\b/g)].map((m) => m[0])

// The audit examples state a breakdown, and a breakdown is checkable where a
// bare count is only quotable. Matching the numbers out and doing the sums
// catches the drift a phrase list cannot see: "41 applicable rules ... 5 not
// applicable" names no total, so it survived the standard growing to 50.
const AUDIT =
  /Audited (\d+) applicable rules: (\d+) pass, (\d+) fail, (\d+) unknown, (\d+) not applicable\.?\s*(\([^)]*\))?/g
const audits = (text: string) =>
  [...text.matchAll(AUDIT)].map((m) => ({
    numbers: m.slice(1, 6).map(Number),
    // The parenthetical enumerates why each skipped rule was skipped. Summing
    // it is what catches a breakdown that no longer adds up, which a check on
    // the PUB count alone cannot see now that more than one thing skips a rule.
    breakdown: m[6] ? [...m[6].matchAll(/(\d+)\s+(PUB|GitLab-only|where)/g)].map((b) => Number(b[1])) : null,
    pubSkipped: m[6] ? Number(/(\d+) PUB/.exec(m[6])?.[1] ?? Number.NaN) : null,
  }))

// The audit check rides along with the totals check rather than reaching
// further. Both files below already have to change when a rule is added, so
// checking their breakdown costs one more number in an edit that was happening
// anyway. oss-audit's own SKILL.md quotes no total, so guarding it would invent
// a new chore on every rule addition, and the reader it would protect is an
// agent learning the shape of the output, which sums nothing.
const quotingTotals = ["README.md", "skills/oss-readme/SKILL.md"]
const quotingAudits = quotingTotals

// STANDARD.md's own preamble carries an index: the total, and one line per area
// naming its ID range. It is the one file that changes whenever a rule is
// added, so a hand-written number there is the same drift in a worse place, and
// check-drift.sh's parse contract cannot see a wrong number. Both halves are
// derived here from the rule headings the rest of the file already parses.
const INDEX_TOTAL = /^The standard holds (\d+) rules:$/m
const INDEX_ROW = /^- (.+): R-([A-Z]+)-(\d{2}) through R-([A-Z]+)-(\d{2})$/gm

const ranges = new Map<string, [number, number]>()
for (const m of standard.matchAll(/^### R-([A-Z]+)-(\d{2}):/gm)) {
  const area = m[1]!
  const n = Number(m[2])
  const seen = ranges.get(area)
  ranges.set(area, seen ? [Math.min(seen[0], n), Math.max(seen[1], n)] : [n, n])
}

describe("rule counts quoted in prose", () => {
  test("the standard parses to a sane set of counts", () => {
    expect(total).toBeGreaterThan(0)
    expect(both).toBeLessThanOrEqual(total)
    // One Forges: line per rule, so a mismatch means a malformed rule block
    // rather than a stale count, and the counts below would be meaningless.
    expect(forges.length).toBe(total)
    // The audit sums below treat PUB and GitLab-only as disjoint. They are
    // today, and this says so out loud rather than double-counting in silence
    // if a PUB rule is ever scoped to one forge.
    const pubForges = [...standard.matchAll(/^### R-PUB-\d{2}:[\s\S]*?^Forges: (\S+)$/gm)].map((m) => m[1])
    expect(pubForges.filter((f) => f !== "both")).toEqual([])
  })

  for (const path of quotingTotals) {
    test(`${path} quotes the current counts and no stale one`, () => {
      const found = phrases(readFileSync(path, "utf8"))
      expect(found).toContain(`${total} rules`)
      expect(found).toContain(`${both} of the ${total} rules`)
      // Every count in the file, not only the two expected ones: a third
      // sentence quoting an old total would otherwise pass unnoticed.
      const allowed = new Set([`${total} rules`, `${both} of the ${total} rules`, `${both} of ${total} rules`])
      expect(found.filter((p) => !allowed.has(p))).toEqual([])
    })
  }

  test("STANDARD.md's index states the derived total", () => {
    const found = INDEX_TOTAL.exec(standard)
    expect(found).not.toBeNull()
    expect(Number(found![1])).toBe(total)
  })

  test("STANDARD.md's index covers every area at its current range", () => {
    const rows = [...standard.matchAll(INDEX_ROW)]
    // One row per area, and each row's two IDs name the same area, so a row
    // reading "R-DOC-01 through R-COM-09" fails rather than half-passing.
    expect(rows.map((r) => r[2])).toEqual([...ranges.keys()])
    expect(rows.filter((r) => r[2] !== r[4])).toEqual([])
    for (const row of rows) {
      const [low, high] = ranges.get(row[2]!)!
      expect(`${row[2]} ${row[3]} ${row[5]}`).toBe(
        `${row[2]} ${String(low).padStart(2, "0")} ${String(high).padStart(2, "0")}`,
      )
    }
  })

  for (const path of quotingAudits) {
    test(`${path} shows an audit whose numbers add up`, () => {
      const found = audits(readFileSync(path, "utf8"))
      expect(found.length).toBeGreaterThan(0)
      for (const { numbers, breakdown, pubSkipped } of found) {
        const [applicable, pass, fail, unknown, skipped] = numbers as [number, number, number, number, number]
        // Every rule is either applicable to the audited repository or not.
        expect(applicable + skipped).toBe(total)
        // Every applicable rule got one of the three verdicts.
        expect(pass + fail + unknown).toBe(applicable)
        // The examples all depict a GitHub repository publishing no package, so
        // it skips at least the whole PUB area and the GitLab-only rules. It is
        // a floor rather than an equality because a rule can also place this
        // repository outside itself on its own terms, which R-CHG-07 does: an
        // ecosystem that does not encode the major version in package identity
        // falls outside it, and most do not.
        expect(skipped).toBeGreaterThanOrEqual(pub + gitlabOnly)
        if (pubSkipped !== null) expect(pubSkipped).toBe(pub)
        // Whatever the extra skips are, the example has to enumerate them.
        if (breakdown !== null) expect(breakdown.reduce((a, b) => a + b, 0)).toBe(skipped)
      }
    })
  }
})
