import { expect, test } from "bun:test"
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from "node:fs"

const MANIFESTS = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
]

function json(path: string) {
  return JSON.parse(readFileSync(path, "utf8"))
}

test("every harness manifest is valid JSON naming oss-kit", () => {
  for (const path of MANIFESTS) {
    const m = json(path)
    expect(m.name, path).toBe("oss-kit")
    expect(m.license, path).toBe("MIT")
  }
})

// The `skills` array is what makes `npx skills` render one select-all group
// instead of nine loose rows, and it has to name every skill literally: the
// installer matches a skill's own directory against the array, so "./skills/"
// on its own groups nothing.
//
// It is also load-bearing for Claude Code. `skills` normally adds to the
// default `skills/` scan, but the plugin's marketplace entry resolves to the
// marketplace root, which is the documented exception where the declared paths
// replace that scan. A skill missing from the array would stop loading.
test("the claude manifest declares every skill, so none silently stops loading", () => {
  const declared = json(".claude-plugin/plugin.json").skills
  const present = readdirSync("skills")
    .filter((n) => existsSync(`skills/${n}/SKILL.md`))
    .map((n) => `./skills/${n}`)
  // Comparing against paths built as `./skills/<name>` also pins the leading
  // `./` the installer requires: an entry without it is skipped in silence.
  expect([...declared].sort()).toEqual(present.sort())
})

// Only the Claude manifest enumerates. Codex and Cursor scan the directory, so
// they keep the one-line form and need no maintenance when a skill is added.
test("the other harness manifests point at skills/ as a whole", () => {
  for (const path of MANIFESTS.filter((p) => p !== ".claude-plugin/plugin.json")) {
    expect(json(path).skills, path).toBe("./skills/")
  }
})

test("manifest versions all match .claude-plugin/plugin.json", () => {
  const version = json(".claude-plugin/plugin.json").version
  for (const path of MANIFESTS) {
    expect(json(path).version, path).toBe(version)
  }
})

test("the cross-harness marketplace declares the plugin at the repository root", () => {
  const m = json(".agents/plugins/marketplace.json")
  expect(m.name).toBe("oss-kit")
  expect(m.plugins).toHaveLength(1)
  expect(m.plugins[0].name).toBe("oss-kit")
  expect(m.plugins[0].source).toEqual({ source: "local", path: "./" })
})

test("every skills symlink resolves to the one real skills directory", () => {
  const skillCount = readdirSync("skills").filter((n) => existsSync(`skills/${n}/SKILL.md`)).length
  expect(skillCount).toBe(9)
  for (const link of [".claude/skills", ".agents/skills", ".opencode/skills"]) {
    expect(lstatSync(link).isSymbolicLink(), link).toBe(true)
    expect(readlinkSync(link), link).toBe("../skills")
    expect(existsSync(`${link}/oss-audit/SKILL.md`), link).toBe(true)
  }
})

test("R-SKL-06 exists and oss-skill claims it", () => {
  const standard = readFileSync("skills/oss-audit/STANDARD.md", "utf8")
  const block = standard.split("### ").find((b) => b.startsWith("R-SKL-06:"))
  expect(block).toBeDefined()
  expect(block!.match(/^Check: /gm)).toHaveLength(1)
  expect(block!).toContain("Fixed by: oss-skill")
  expect(block!).toContain("Forges: both")
  expect(readFileSync("skills/oss-skill/SKILL.md", "utf8")).toContain("R-SKL-06")
})
