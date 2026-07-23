import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const PAGES = ["docs/install.md", "docs/getting-started.md", "docs/adoption-guide.md"]

test("every authored page opens with one H1", () => {
  for (const page of PAGES) {
    const lines = readFileSync(page, "utf8").split("\n")
    expect(lines[0]!.startsWith("# "), page).toBe(true)
    expect(lines.filter((l) => l.startsWith("# ")), page).toHaveLength(1)
  }
})

test("no authored page uses a dash character the house style forbids", () => {
  for (const page of PAGES) {
    const text = readFileSync(page, "utf8")
    expect(text.includes("—"), page).toBe(false)
    expect(text.includes("–"), page).toBe(false)
    expect(text.includes(" -- "), page).toBe(false)
  }
})

test("the adoption guide defers ordering to oss-audit rather than listing rules", () => {
  const text = readFileSync("docs/adoption-guide.md", "utf8")
  expect(text).toContain("oss-audit")
  expect(text.match(/R-[A-Z]{2,3}-\d{2}/g) ?? []).toHaveLength(0)
})
