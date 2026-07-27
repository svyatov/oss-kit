import { expect, test } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"

const PAGES = [
  "site/src/content/docs/guides/install.md",
  "site/src/content/docs/guides/getting-started.md",
  "site/src/content/docs/guides/adoption-guide.md",
]

test("every authored page declares one title in frontmatter", () => {
  for (const page of PAGES) {
    const lines = readFileSync(page, "utf8").split("\n")
    expect(lines[0], page).toBe("---")
    expect(lines.filter((l) => l.startsWith("title: ")), page).toHaveLength(1)
    expect(lines.filter((l) => l.startsWith("# ")), page).toHaveLength(0)
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

// Scans for the two dash characters only. It cannot scan for " -- ", because
// oss-writing names that pattern inside backticks in the rule that forbids it.
test("no skill file uses a dash character the house style forbids", () => {
  const files = readdirSync("skills", { recursive: true, encoding: "utf8" }).filter((f) =>
    f.endsWith(".md"),
  )
  expect(files.length).toBeGreaterThan(9)
  for (const file of files) {
    const text = readFileSync(`skills/${file}`, "utf8")
    expect(text.includes("—"), `em dash in ${file}`).toBe(false)
    expect(text.includes("–"), `en dash in ${file}`).toBe(false)
  }
})

test("the adoption guide defers ordering to oss-audit rather than listing rules", () => {
  const text = readFileSync("site/src/content/docs/guides/adoption-guide.md", "utf8")
  expect(text).toContain("oss-audit")
  expect(text.match(/R-[A-Z]{2,3}-\d{2}/g) ?? []).toHaveLength(0)
})
