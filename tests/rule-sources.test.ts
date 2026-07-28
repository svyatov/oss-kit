import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const ids = [...readFileSync("skills/oss-audit/STANDARD.md", "utf8").matchAll(/^### (R-[A-Z]+-\d{2}):/gm)].map(
  (m) => m[1] as string,
)
const sources: Record<string, { sources?: string[]; verified?: string; note?: string }> = JSON.parse(
  readFileSync("skills/oss-audit/rule-sources.json", "utf8"),
)

const today = new Date().toISOString().slice(0, 10)

describe("rule-sources.json", () => {
  test("covers every rule STANDARD.md defines", () => {
    expect(ids.filter((id) => !(id in sources))).toEqual([])
  })

  test("names no rule STANDARD.md does not define", () => {
    expect(Object.keys(sources).filter((id) => !ids.includes(id))).toEqual([])
  })

  for (const [id, entry] of Object.entries(sources)) {
    test(`${id} has a well-formed entry`, () => {
      expect(Array.isArray(entry.sources)).toBe(true)
      for (const url of entry.sources ?? []) expect(url).toMatch(/^https?:\/\/\S+$/)
      if (entry.verified !== undefined) {
        expect(entry.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(entry.verified <= today).toBe(true)
      }
      // A verified date with nothing to have verified against is a date nobody can re-check.
      if (entry.verified !== undefined) expect(entry.sources?.length).toBeGreaterThan(0)
      // A rule claiming its own position with no argument recorded is a rule
      // nobody can challenge. The note carries what was observed and what
      // would retire the rule, and the site renders it in place of a source.
      if ((entry.sources?.length ?? 0) === 0) expect(entry.note?.trim()).toBeTruthy()
    })
  }
})
