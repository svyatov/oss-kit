import { expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"

const install = () => readFileSync("docs/install.md", "utf8")
const readme = () => readFileSync("README.md", "utf8")

test("the install page names every harness that has a manifest", () => {
  const text = install()
  for (const harness of ["Claude Code", "Codex", "Cursor", "Kimi", "OpenCode", "VS Code", "Copilot"]) {
    expect(text, harness).toContain(harness)
  }
})

test("every manifest path the install page claims exists", () => {
  const paths = install().match(/`\.[\w./-]+\/(plugin|marketplace)\.json`/g) ?? []
  expect(paths.length).toBeGreaterThan(3)
  for (const quoted of paths) {
    const path = quoted.replaceAll("`", "")
    expect(existsSync(path), path).toBe(true)
  }
})

test("the README keeps the fast path and links to the install page", () => {
  const text = readme()
  expect(text).toContain("npx skills add svyatov/oss-kit")
  expect(text).toContain("docs/install.md")
})

test("the README does not duplicate the per-harness matrix", () => {
  expect(readme()).not.toContain("<details>")
  for (const harness of ["Cursor", "Kimi", "OpenCode"]) {
    expect(readme(), harness).not.toContain(harness)
  }
})
