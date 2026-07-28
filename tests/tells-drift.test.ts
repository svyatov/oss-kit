import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

import { PATTERNS } from "../skills/oss-writing/scripts/check-tells.mjs"

// A regex source is not searchable prose, so each catalog entry carries a token
// a reader would look up. Deleting a tell from the prose without touching the
// script leaves the checker enforcing a rule the skill no longer states.
const CATALOG = [
  "skills/oss-writing/references/tells.md",
  "skills/oss-writing/SKILL.md",
].map((path) => readFileSync(path, "utf8"))

const missing = (patterns: typeof PATTERNS, catalog: string[]) =>
  patterns.filter((p) => !catalog.some((text) => text.toLowerCase().includes(p.token.toLowerCase()))).map((p) => p.id)

test("every pattern the script carries is named in the prose a reader reads", () => {
  expect(missing(PATTERNS, CATALOG)).toEqual([])
})

test("a pattern named in neither file fails the check", () => {
  const invented = { ...(PATTERNS[0] as (typeof PATTERNS)[number]), id: "invented", token: "quantum foam" }
  expect(missing([...PATTERNS, invented], CATALOG)).toEqual(["invented"])
})

test("deleting the promotional adjectives row fails the check", () => {
  const withoutRow = CATALOG.map((text) => text.replace(/^\| Promotional adjectives.*$/m, ""))
  expect(missing(PATTERNS, withoutRow).length).toBeGreaterThan(0)
})
