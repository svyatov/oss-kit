import { expect, test } from "bun:test"
import { existsSync, readFileSync, readdirSync } from "node:fs"

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

// Strips fenced blocks and inline code, so the scan reads only prose. This is
// the skill's own exception: quoted code, output, and config are reproduced
// verbatim, and a rule may name the pattern it forbids inside backticks.
const proseOnly = (text: string) => text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "")

test("no repository prose uses a dash the house style forbids", () => {
  const skillFiles = readdirSync("skills", { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".md"))
    .map((f) => `skills/${f}`)
  expect(skillFiles.length).toBeGreaterThan(9)

  const rootDocs = ["README.md", "CONTRIBUTING.md", "AGENTS.md", "CHANGELOG.md", "SECURITY.md"]

  for (const file of [...skillFiles, ...rootDocs]) {
    const prose = proseOnly(readFileSync(file, "utf8"))
    expect(prose.includes("—"), `em dash in ${file}`).toBe(false)
    expect(prose.includes("–"), `en dash in ${file}`).toBe(false)
    expect(prose.includes(" -- "), `" -- " in ${file}`).toBe(false)
  }
})

// The scan above reads Markdown. A derived skill also carries public prose in
// sources.json, which README.md points a reader at for attribution, and parsing
// it here is the only thing that holds these files to valid JSON.
test("no sources.json prose uses a dash the house style forbids", () => {
  const files = readdirSync("skills", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `skills/${entry.name}/sources.json`)
    .filter((file) => existsSync(file))
  expect(files.length).toBeGreaterThanOrEqual(4)

  for (const file of files) {
    const record: { modifications: string[]; sources: { note?: string }[] } = JSON.parse(
      readFileSync(file, "utf8"),
    )
    const prose = [...record.modifications, ...record.sources.map((source) => source.note ?? "")]
    for (const text of prose) {
      expect(text.includes("—"), `em dash in ${file}`).toBe(false)
      expect(text.includes("–"), `en dash in ${file}`).toBe(false)
      expect(text.includes(" -- "), `" -- " in ${file}`).toBe(false)
    }
  }
})

test("the adoption guide defers ordering to oss-audit rather than listing rules", () => {
  const text = readFileSync("site/src/content/docs/guides/adoption-guide.md", "utf8")
  expect(text).toContain("oss-audit")
  expect(text.match(/R-[A-Z]{2,3}-\d{2}/g) ?? []).toHaveLength(0)
})
