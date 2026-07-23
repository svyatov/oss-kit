// tests/generate.test.ts
import { expect, test } from "bun:test"
import {
  agentNotice,
  parseRules,
  renderRulePage,
  renderSkillPage,
  rewriteLinks,
  writeAll,
} from "../site/scripts/generate.mjs"
import { existsSync, mkdtempSync, readFileSync as read, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const TWO_RULES = `# The oss-kit standard

Preamble prose that is not a rule.

## Documentation

### R-DOC-01: The README opens with one sentence saying what the project does

A reader decides in about five seconds whether to keep reading.

Check: the first paragraph of \`README.md\` after the title is a single sentence.

Fixed by: oss-readme
Forges: both

### R-SEC-01: Pin every third-party action to a full commit SHA

A tag moves.

Check: every \`uses:\` line resolves to a 40-character SHA.

Fixed by: oss-harden
Forges: github

## Security

Section preamble prose.
`

test("parseRules reads every field of every rule", () => {
  const rules = parseRules(TWO_RULES)
  expect(rules).toHaveLength(2)
  expect(rules[0]).toEqual({
    id: "R-DOC-01",
    area: "DOC",
    number: "01",
    statement: "The README opens with one sentence saying what the project does",
    why: "A reader decides in about five seconds whether to keep reading.",
    check: "the first paragraph of `README.md` after the title is a single sentence.",
    fixedBy: "oss-readme",
    forges: "both",
  })
  expect(rules[1]!.id).toBe("R-SEC-01")
  expect(rules[1]!.forges).toBe("github")
})

test("parseRules ends a rule body at the next heading of any level, not just ###", () => {
  const rules = parseRules(TWO_RULES)
  expect(rules[1]!.why).not.toContain("Security")
  expect(rules[1]!.why).not.toContain("Section preamble")
})

test("parseRules rejects a rule missing its check line", () => {
  const broken = TWO_RULES.replace("Check: every `uses:` line resolves to a 40-character SHA.\n\n", "")
  expect(() => parseRules(broken)).toThrow("R-SEC-01: expected exactly one Check: line, found 0")
})

test("parseRules rejects a malformed heading", () => {
  const broken = TWO_RULES.replace("### R-SEC-01: Pin", "### R-SEC-1: Pin")
  expect(() => parseRules(broken)).toThrow("R-SEC-1")
})

test("renderRulePage writes frontmatter and every field", () => {
  const page = renderRulePage(parseRules(TWO_RULES)[1]!)
  expect(page.startsWith("---\n")).toBe(true)
  expect(page).toContain('title: "R-SEC-01"')
  expect(page).toContain("Pin every third-party action to a full commit SHA")
  expect(page).toContain("A tag moves.")
  expect(page).toContain("every `uses:` line resolves to a 40-character SHA.")
  expect(page).toContain("/skills/oss-harden/")
  expect(page).toContain("GitHub only")
})

test("every rule in the real standard parses", () => {
  const text = require("node:fs").readFileSync("skills/oss-audit/STANDARD.md", "utf8")
  const rules = parseRules(text)
  expect(rules.length).toBe(40)
  expect(new Set(rules.map((r) => r.id)).size).toBe(40)
  expect(rules.some((r) => r.fixedBy === "oss-audit")).toBe(false)
  // The CI area is two letters, unlike the three-letter areas; the parser must accept both.
  expect(rules.filter((r) => r.area === "CI")).toHaveLength(5)
})

test("rewriteLinks replaces the targets the resolver claims", () => {
  const md = "See [refs](references/npm.md) and [home](https://example.com) and [rule](#anchor)."
  const out = rewriteLinks(md, (t) => (t === "references/npm.md" ? "/skills/oss-publish/npm/" : null))
  expect(out).toContain("[refs](/skills/oss-publish/npm/)")
  expect(out).toContain("[home](https://example.com)")
  expect(out).toContain("[rule](#anchor)")
})

test("rewriteLinks throws when a relative markdown target resolves to nothing", () => {
  expect(() => rewriteLinks("[x](missing.md)", () => null)).toThrow("missing.md")
})

test("agentNotice names the source file and links to it", () => {
  const notice = agentNotice("skills/oss-readme/SKILL.md")
  expect(notice).toContain("instruction text")
  expect(notice).toContain("https://github.com/svyatov/oss-kit/blob/main/skills/oss-readme/SKILL.md")
})

test("renderSkillPage keeps the body verbatim under the notice", () => {
  const source = `---\nname: oss-readme\ndescription: "Write a README."\nlicense: MIT\n---\n\n# Write a README\n\nBody line.\n`
  const page = renderSkillPage("skills/oss-readme/SKILL.md", source)
  expect(page).toContain('title: "oss-readme"')
  expect(page).toContain("Write a README.")
  expect(page).toContain("Body line.")
  expect(page).not.toContain("license: MIT")
  expect(page.indexOf("instruction text")).toBeLessThan(page.indexOf("Body line."))
})

test("writeAll produces every page the site needs", () => {
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  const { written } = writeAll(".", out)

  expect(written.filter((p) => p.startsWith("rules/"))).toHaveLength(40)
  expect(existsSync(join(out, "rules/r-sec-01.md"))).toBe(true)
  expect(existsSync(join(out, "standard.md"))).toBe(true)
  expect(existsSync(join(out, "changelog.md"))).toBe(true)
  expect(existsSync(join(out, "skills/oss-audit.md"))).toBe(true)
  expect(existsSync(join(out, "skills/oss-publish/npm.md"))).toBe(true)
  expect(existsSync(join(out, "guides/install.md"))).toBe(true)
  expect(existsSync(join(out, "guides/superpowers"))).toBe(false)

  expect(read(join(out, "rules/r-sec-01.md"), "utf8")).toContain("/skills/oss-harden/")
  rmSync(out, { recursive: true, force: true })
})

test("writeAll clears stale output so a renamed page cannot linger", () => {
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  require("node:fs").mkdirSync(join(out, "rules"), { recursive: true })
  require("node:fs").writeFileSync(join(out, "rules/r-zzz-99.md"), "stale")
  writeAll(".", out)
  expect(existsSync(join(out, "rules/r-zzz-99.md"))).toBe(false)
  rmSync(out, { recursive: true, force: true })
})
