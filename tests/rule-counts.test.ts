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
  /Audited (\d+) applicable rules: (\d+) pass, (\d+) fail, (\d+) unknown, (\d+) not applicable\.?\s*(?:\((\d+) PUB)?/g
const audits = (text: string) => [...text.matchAll(AUDIT)].map((m) => m.slice(1).map((n) => (n ? Number(n) : null)))

// The audit check rides along with the totals check rather than reaching
// further. Both files below already have to change when a rule is added, so
// checking their breakdown costs one more number in an edit that was happening
// anyway. oss-audit's own SKILL.md quotes no total, so guarding it would invent
// a new chore on every rule addition, and the reader it would protect is an
// agent learning the shape of the output, which sums nothing.
const quotingTotals = ["README.md", "skills/oss-readme/SKILL.md"]
const quotingAudits = quotingTotals

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

  for (const path of quotingAudits) {
    test(`${path} shows an audit whose numbers add up`, () => {
      const found = audits(readFileSync(path, "utf8"))
      expect(found.length).toBeGreaterThan(0)
      for (const [applicable, pass, fail, unknown, skipped, pubSkipped] of found) {
        // Every rule is either applicable to the audited repository or not.
        expect(applicable! + skipped!).toBe(total)
        // Every applicable rule got one of the three verdicts.
        expect(pass! + fail! + unknown!).toBe(applicable!)
        // The examples all depict a GitHub repository publishing no package,
        // so what it skips is the whole PUB area plus the GitLab-only rules.
        expect(skipped).toBe(pub + gitlabOnly)
        if (pubSkipped !== null) expect(pubSkipped).toBe(pub)
      }
    })
  }
})
