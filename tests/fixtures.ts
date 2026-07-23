import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** Creates a repository root with an MIT LICENSE and an empty skills/ directory. */
export function makeRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "oss-kit-fixture-"))
  writeFileSync(join(root, "LICENSE"), "MIT License\n\nCopyright (c) 2026 Test\n")
  mkdirSync(join(root, "skills"))
  return root
}

/** Writes skills/<name>/SKILL.md with the given frontmatter block and body. */
export function addSkill(root: string, name: string, frontmatter: string, body = "# Heading\n\nText.\n"): string {
  const dir = join(root, "skills", name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "SKILL.md"), `---\n${frontmatter}\n---\n${body}`)
  return dir
}

/** Frontmatter that satisfies every rule, for a skill of the given name. */
export function goodFrontmatter(name: string): string {
  return `name: ${name}\ndescription: "Does a thing. Use when a thing needs doing."\nlicense: MIT`
}

/** Creates a symlink at root/linkName pointing at root/skills, mirroring .agents/skills and .claude/skills. */
export function addSkillsSymlink(root: string, linkName: string): void {
  symlinkSync(join(root, "skills"), join(root, linkName), "dir")
}

/** Writes a SKILL.md at an arbitrary path relative to the repository root. */
export function addStraySkill(root: string, relativeDir: string, frontmatter: string): string {
  const dir = join(root, relativeDir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "SKILL.md"), `---\n${frontmatter}\n---\n# Heading\n\nText.\n`)
  return dir
}
