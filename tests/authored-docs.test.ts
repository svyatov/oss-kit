import { expect, test } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"

import { PATTERNS, scan } from "../skills/oss-writing/scripts/check-tells.mjs"

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

// The dash checks run through the shipped checker, which reads prose only:
// quoted code, output, and config are reproduced verbatim, and a rule may name
// the pattern it forbids inside backticks. That is looser than reading the raw
// bytes, and deliberately so.
const DASHES = PATTERNS.filter((p) => ["em-dash", "en-dash", "double-hyphen"].includes(p.id))
const dashes = (file: string) => scan(readFileSync(file, "utf8"), file, { patterns: DASHES })

test("no authored page uses a dash character the house style forbids", () => {
  for (const page of PAGES) {
    expect(dashes(page), page).toEqual([])
  }
})

test("no repository prose uses a dash the house style forbids", () => {
  const skillFiles = readdirSync("skills", { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".md"))
    .map((f) => `skills/${f}`)
  expect(skillFiles.length).toBeGreaterThan(9)

  const rootDocs = ["README.md", "CONTRIBUTING.md", "AGENTS.md", "CHANGELOG.md", "SECURITY.md"]

  for (const file of [...skillFiles, ...rootDocs]) {
    expect(dashes(file), file).toEqual([])
  }
})

test("the adoption guide defers ordering to oss-audit rather than listing rules", () => {
  const text = readFileSync("site/src/content/docs/guides/adoption-guide.md", "utf8")
  expect(text).toContain("oss-audit")
  expect(text.match(/R-[A-Z]{2,3}-\d{2}/g) ?? []).toHaveLength(0)
})
