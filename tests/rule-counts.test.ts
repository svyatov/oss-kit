import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

// README.md and the worked example in oss-readme both quote how many rules the
// standard holds and how many score both forges. Nothing derived those numbers,
// so adding a rule left them stale and no check failed: the slate in oss-readme
// claimed 45 rules and 40 of 41 on both forges long after the standard passed
// each. Both files are exemplars of R-DOC-04, the rule against exactly this
// drift, so they are the last two that should carry an unchecked number.
const standard = readFileSync("skills/oss-audit/STANDARD.md", "utf8")

const total = [...standard.matchAll(/^### R-[A-Z]+-\d{2}:/gm)].length
const forges = [...standard.matchAll(/^Forges: (\S+)$/gm)].map((m) => m[1])
const both = forges.filter((f) => f === "both").length

// Compared as phrases rather than with toContain on the file, so a failure
// prints the stale wording instead of the whole document.
const phrases = (text: string) => [...text.matchAll(/\b\d+ (?:of (?:the )?\d+ )?rules\b/g)].map((m) => m[0])

const quoting = ["README.md", "skills/oss-readme/SKILL.md"]

describe("rule counts quoted in prose", () => {
  test("the standard parses to a sane pair of counts", () => {
    expect(total).toBeGreaterThan(0)
    expect(both).toBeLessThanOrEqual(total)
    // One Forges: line per rule, so a mismatch means a malformed rule block
    // rather than a stale count, and the counts below would be meaningless.
    expect(forges.length).toBe(total)
  })

  for (const path of quoting) {
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
})
