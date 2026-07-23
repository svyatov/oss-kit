import { expect, test } from "bun:test"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { parseFrontmatter, validate } from "../skills/oss-skill/scripts/validate.mjs"
import { addSkill, goodFrontmatter, makeRepo } from "./fixtures.ts"

function errors(root: string) {
  return validate(root).filter((f) => f.severity === "error")
}

function rules(findings: { rule: string | null }[]) {
  return findings.map((f) => f.rule)
}

test("a conforming repository produces no errors", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", goodFrontmatter("oss-thing"))
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("parseFrontmatter reads quoted and plain scalars", () => {
  const fm = parseFrontmatter('---\nname: a-b\ndescription: "x: y"\n---\nbody\n')
  expect(fm.ok).toBe(true)
  expect(fm.entries.get("name")).toBe("a-b")
  expect(fm.entries.get("description")).toBe("x: y")
  expect(fm.bodyStart).toBe(4)
})

test("parseFrontmatter reports a missing opening delimiter", () => {
  const fm = parseFrontmatter("name: a\n---\n")
  expect(fm.ok).toBe(false)
  expect(fm.reason).toBe("missing")
})

test("parseFrontmatter reports an unterminated block", () => {
  const fm = parseFrontmatter("---\nname: a\nbody\n")
  expect(fm.ok).toBe(false)
  expect(fm.reason).toBe("unterminated")
})

test("parseFrontmatter reads a nested metadata block", () => {
  const fm = parseFrontmatter("---\nname: a\nmetadata:\n  author: someone\n---\n")
  expect(fm.ok).toBe(true)
  expect(fm.unreadable).toEqual([])
})

test("parseFrontmatter flags a construct it cannot read without claiming invalid", () => {
  const fm = parseFrontmatter("---\nname: a\ndescription: >\n  folded text\n---\n")
  expect(fm.ok).toBe(true)
  expect(fm.unreadable).toEqual([3, 4])
})

test("frontmatter not at byte 0 is an R-SKL-02 error", () => {
  const root = makeRepo()
  const dir = addSkill(root, "oss-thing", goodFrontmatter("oss-thing"))
  const path = join(dir, "SKILL.md")
  writeFileSync(path, `\n${readFileSync(path, "utf8")}`)
  const found = errors(root).filter((f) => f.rule === "R-SKL-02")
  expect(found).toHaveLength(1)
  expect(found[0]?.message).toContain("must begin with")
  rmSync(root, { recursive: true, force: true })
})

test("a missing name is an R-SKL-02 error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", 'description: "x"\nlicense: MIT')
  expect(rules(errors(root))).toContain("R-SKL-02")
  rmSync(root, { recursive: true, force: true })
})

test("a name that does not match its directory is an R-SKL-02 error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", 'name: oss-other\ndescription: "x"\nlicense: MIT')
  const found = errors(root).filter((f) => f.rule === "R-SKL-02")
  expect(found).toHaveLength(1)
  expect(found[0]?.message).toContain("does not match its directory")
  rmSync(root, { recursive: true, force: true })
})

test("consecutive hyphens and uppercase in a name are R-SKL-02 errors", () => {
  const root = makeRepo()
  addSkill(root, "oss--thing", 'name: oss--thing\ndescription: "x"\nlicense: MIT')
  expect(rules(errors(root))).toContain("R-SKL-02")
  rmSync(root, { recursive: true, force: true })
})

test("an over-long description is an R-SKL-02 error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", `name: oss-thing\ndescription: "${"x".repeat(1025)}"\nlicense: MIT`)
  const found = errors(root).filter((f) => f.rule === "R-SKL-02")
  expect(found[0]?.message).toContain("1024")
  rmSync(root, { recursive: true, force: true })
})

test("an unknown key is a warning with a suggestion, not an error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", 'name: oss-thing\ndescripton: "typo"\ndescription: "x"\nlicense: MIT')
  expect(errors(root)).toEqual([])
  const warned = validate(root).filter((f) => f.severity === "warning")
  expect(warned[0]?.message).toContain('did you mean "description"')
  rmSync(root, { recursive: true, force: true })
})
