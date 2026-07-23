import { expect, test } from "bun:test"
import { chmodSync, mkdirSync, readFileSync, rmSync, rmdirSync, symlinkSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { findSkillFiles, parseFrontmatter, validate } from "../skills/oss-skill/scripts/validate.mjs"
import { addSkill, addSkillsSymlink, addStraySkill, goodFrontmatter, makeRepo } from "./fixtures.ts"

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

test("consecutive hyphens in a name are an R-SKL-02 error", () => {
  const root = makeRepo()
  addSkill(root, "oss--thing", 'name: oss--thing\ndescription: "x"\nlicense: MIT')
  expect(rules(errors(root))).toContain("R-SKL-02")
  rmSync(root, { recursive: true, force: true })
})

test("an uppercase name is an R-SKL-02 error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", 'name: OSS-thing\ndescription: "x"\nlicense: MIT')
  const found = errors(root).filter((f) => f.rule === "R-SKL-02")
  expect(found.some((f) => f.message.includes("lowercase letters"))).toBe(true)
  rmSync(root, { recursive: true, force: true })
})

test("a 65-character name is an R-SKL-02 error naming the limit", () => {
  const root = makeRepo()
  const longName = `oss-${"a".repeat(61)}`
  expect(longName).toHaveLength(65)
  addSkill(root, longName, `name: ${longName}\ndescription: "x"\nlicense: MIT`)
  const found = errors(root).filter((f) => f.rule === "R-SKL-02")
  expect(found.some((f) => f.message.includes("65 characters") && f.message.includes("limit is 64"))).toBe(true)
  rmSync(root, { recursive: true, force: true })
})

test("a 501-character compatibility is an R-SKL-02 error naming the limit", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", `name: oss-thing\ndescription: "x"\nlicense: MIT\ncompatibility: "${"x".repeat(501)}"`)
  const found = errors(root).filter((f) => f.rule === "R-SKL-02")
  expect(found.some((f) => f.message.includes("501 characters") && f.message.includes("limit is 500"))).toBe(true)
  rmSync(root, { recursive: true, force: true })
})

test("a symlinked skills directory is not walked, so a skill is found once", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", goodFrontmatter("oss-thing"))
  addSkillsSymlink(root, "linked-skills")
  expect(findSkillFiles(root)).toHaveLength(1)
  rmSync(root, { recursive: true, force: true })
})

test("an unreadable SKILL.md warns and does not stop the run", () => {
  const root = makeRepo()
  const unreadableDir = addSkill(root, "oss-broken", goodFrontmatter("oss-broken"))
  const unreadablePath = join(unreadableDir, "SKILL.md")
  // Assumes a non-root user and a filesystem that honors mode bits. Running as
  // root, or on a filesystem that ignores them, makes the chmod a no-op, the
  // read succeeds, and this test passes without exercising the guard it names.
  chmodSync(unreadablePath, 0o000)
  addSkill(root, "oss-thing", goodFrontmatter("oss-thing"))
  let findings: ReturnType<typeof validate> = []
  expect(() => {
    findings = validate(root)
  }).not.toThrow()
  expect(findings.some((f) => f.severity === "warning" && f.rule === null && f.file.includes("oss-broken"))).toBe(
    true,
  )
  expect(errors(root).some((f) => f.file.includes("oss-thing"))).toBe(false)
  chmodSync(unreadablePath, 0o644)
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

test("CRLF line endings throughout a SKILL.md produce no error", () => {
  const root = makeRepo()
  const dir = addSkill(root, "oss-thing", goodFrontmatter("oss-thing"))
  const path = join(dir, "SKILL.md")
  const crlf = readFileSync(path, "utf8").replace(/\n/g, "\r\n")
  writeFileSync(path, crlf)
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("a byte order mark at the start of a SKILL.md produces no error", () => {
  const root = makeRepo()
  const dir = addSkill(root, "oss-thing", goodFrontmatter("oss-thing"))
  const path = join(dir, "SKILL.md")
  writeFileSync(path, `﻿${readFileSync(path, "utf8")}`)
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("delimiter lines with trailing whitespace produce no error", () => {
  const root = makeRepo()
  const dir = addSkill(root, "oss-thing", goodFrontmatter("oss-thing"))
  const path = join(dir, "SKILL.md")
  writeFileSync(path, `--- \n${goodFrontmatter("oss-thing")}\n--- \n# Heading\n\nText.\n`)
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("a folded block scalar description produces no error and one warning naming its line", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", "name: oss-thing\ndescription: >\nlicense: MIT")
  expect(errors(root)).toEqual([])
  const warned = validate(root).filter((f) => f.severity === "warning")
  expect(warned).toHaveLength(1)
  expect(warned[0]?.message).toContain("line 3")
  rmSync(root, { recursive: true, force: true })
})

test("an empty description value still errors, with no unreadable-construct warning", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", "name: oss-thing\ndescription:\nlicense: MIT")
  const found = errors(root).filter((f) => f.rule === "R-SKL-02")
  expect(found.some((f) => f.message.includes("declares no description"))).toBe(true)
  const warned = validate(root).filter((f) => f.severity === "warning")
  expect(warned.some((f) => f.message.includes("does not read"))).toBe(false)
  rmSync(root, { recursive: true, force: true })
})

test("an inline comment on a plain scalar name produces no error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", 'name: oss-thing # the name\ndescription: "x"\nlicense: MIT')
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("a double-quoted name with a trailing inline comment produces no error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", 'name: "oss-thing" # the name\ndescription: "x"\nlicense: MIT')
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("a single-quoted name with a trailing inline comment produces no error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", "name: 'oss-thing' # c\ndescription: \"x\"\nlicense: MIT")
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("a quoted 1020-character description with a trailing inline comment produces no error", () => {
  const root = makeRepo()
  const description = "x".repeat(1020)
  addSkill(root, "oss-thing", `name: oss-thing\ndescription: "${description}" # note\nlicense: MIT`)
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("a description whose value is only a comment is reported as absent", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", "name: oss-thing\ndescription:   # nothing here\nlicense: MIT")
  const found = errors(root).filter((f) => f.rule === "R-SKL-02")
  expect(found.some((f) => f.message.includes("declares no description"))).toBe(true)
  rmSync(root, { recursive: true, force: true })
})

test("a description containing a hash with no space before it survives intact", () => {
  const fm = parseFrontmatter('---\nname: a\ndescription: uses C# syntax # note\n---\nbody\n')
  expect(fm.entries.get("description")).toBe("uses C# syntax")
})

test("a duplicate key warns and the last value drives the outcome", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", 'name: oss-other\nname: oss-thing\ndescription: "x"\nlicense: MIT')
  const warned = validate(root).filter((f) => f.severity === "warning")
  expect(warned.some((f) => f.message.includes("duplicate") && f.message.includes("strict YAML parser"))).toBe(true)
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("a readable description after a block-scalar description of the same key is still checked", () => {
  const root = makeRepo()
  const longDescription = "x".repeat(1025)
  addSkill(
    root,
    "oss-thing",
    `name: oss-thing\ndescription: >\n  folded text\ndescription: "${longDescription}"\nlicense: MIT`,
  )
  const found = errors(root).filter((f) => f.rule === "R-SKL-02")
  expect(found.some((f) => f.message.includes("1025 characters") && f.message.includes("limit is 1024"))).toBe(true)
  rmSync(root, { recursive: true, force: true })
})

test("a block-scalar description followed by a second description line warns of a duplicate", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", 'name: oss-thing\ndescription: >\n  folded text\ndescription: "x"\nlicense: MIT')
  const warned = validate(root).filter((f) => f.severity === "warning")
  expect(warned.some((f) => f.message.includes("duplicate") && f.message.includes("strict YAML parser"))).toBe(true)
  rmSync(root, { recursive: true, force: true })
})

test("a SKILL.md outside skills/ is an R-SKL-01 error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", goodFrontmatter("oss-thing"))
  addStraySkill(root, ".claude/skills/oss-elsewhere", goodFrontmatter("oss-elsewhere"))
  const found = errors(root).filter((f) => f.rule === "R-SKL-01")
  expect(found).toHaveLength(1)
  expect(found[0]?.file).toContain(".claude")
  rmSync(root, { recursive: true, force: true })
})

test("a symlinked skills directory does not double-count", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", goodFrontmatter("oss-thing"))
  mkdirSync(join(root, ".claude"))
  symlinkSync("../skills", join(root, ".claude", "skills"))
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("a missing skills directory is an R-SKL-01 error", () => {
  const root = makeRepo()
  rmdirSync(join(root, "skills"))
  expect(rules(errors(root))).toContain("R-SKL-01")
  rmSync(root, { recursive: true, force: true })
})

test("a directory under skills with no SKILL.md is an R-SKL-01 error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", goodFrontmatter("oss-thing"))
  mkdirSync(join(root, "skills", "oss-empty"))
  const found = errors(root).filter((f) => f.rule === "R-SKL-01")
  expect(found).toHaveLength(1)
  expect(found[0]?.message).toContain("no SKILL.md")
  rmSync(root, { recursive: true, force: true })
})

test("a body of 500 lines or more is an R-SKL-03 error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", goodFrontmatter("oss-thing"), "x\n".repeat(500))
  const found = errors(root).filter((f) => f.rule === "R-SKL-03")
  expect(found).toHaveLength(1)
  expect(found[0]?.message).toContain("under 500")
  rmSync(root, { recursive: true, force: true })
})

test("a body just under the ceiling passes", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", goodFrontmatter("oss-thing"), "x\n".repeat(498))
  expect(errors(root)).toEqual([])
  rmSync(root, { recursive: true, force: true })
})

test("a missing license is an R-SKL-04 error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", 'name: oss-thing\ndescription: "x"')
  expect(rules(errors(root))).toContain("R-SKL-04")
  rmSync(root, { recursive: true, force: true })
})

test("a license the repository file does not name is a warning, not an error", () => {
  const root = makeRepo()
  addSkill(root, "oss-thing", 'name: oss-thing\ndescription: "x"\nlicense: Apache-2.0')
  expect(errors(root)).toEqual([])
  const warned = validate(root).filter((f) => f.rule === "R-SKL-04")
  expect(warned[0]?.severity).toBe("warning")
  rmSync(root, { recursive: true, force: true })
})
