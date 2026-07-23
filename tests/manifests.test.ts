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

test("every manifest that declares a skills path points at skills/", () => {
  for (const path of MANIFESTS) {
    const m = json(path)
    if ("skills" in m) expect(m.skills, path).toBe("./skills/")
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
