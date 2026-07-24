// tests/generate.test.ts
import { expect, test } from "bun:test"
import {
  agentNotice,
  pageDescription,
  parseRules,
  summarize,
  renderRulePage,
  renderSkillPage,
  rewriteLinks,
  splitFrontmatter,
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
    section: "Documentation",
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

test("parseRules rejects an unknown Forges value", () => {
  const broken = TWO_RULES.replace("Forges: github", "Forges: gitub")
  expect(() => parseRules(broken)).toThrow("R-SEC-01")
  expect(() => parseRules(broken)).toThrow("gitub")
})

test("parseRules rejects a malformed heading", () => {
  const broken = TWO_RULES.replace("### R-SEC-01: Pin", "### R-SEC-1: Pin")
  expect(() => parseRules(broken)).toThrow("R-SEC-1")
})

test("renderRulePage titles the page by the rule, not by its ID", () => {
  const page = renderRulePage(parseRules(TWO_RULES)[1]!, "skills/oss-audit/STANDARD.md")
  expect(page.startsWith("---\n")).toBe(true)
  expect(page).toContain('title: "Pin every third-party action to a full commit SHA"')
  expect(page).toContain('description: "A tag moves."')
  expect(page).toContain('"badge":"R-SEC-01"')
  expect(page).toContain("edit/main/skills/oss-audit/STANDARD.md")
  expect(page).toContain("A tag moves.")
  expect(page).toContain("every `uses:` line resolves to a 40-character SHA.")
  expect(page).toContain("/skills/oss-harden/")
  expect(page).toContain("GitHub only")
})

test("summarize cuts prose to one sentence a search result can show", () => {
  expect(summarize("A tag moves. A SHA does not.")).toBe("A tag moves.")
  expect(summarize("Needs npm 11.5.1 or newer. More.")).toBe("Needs npm 11.5.1 or newer.")
  expect(summarize("See [the docs](https://x.test) and `code`.")).toBe("See the docs and code.")
  expect(summarize(`${"word ".repeat(60)}end.`).length).toBeLessThanOrEqual(160)
})

test("pageDescription skips headings and directives to reach real prose", () => {
  const doc = "# Title\n\n:::note\nAside.\n:::\n\nThe real first paragraph. Second sentence.\n"
  expect(pageDescription(doc, "fallback")).toBe("The real first paragraph.")
  expect(pageDescription("# Title only\n", "fallback")).toBe("fallback")
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

test("every page has a unique title and a description that is not a copy of it", () => {
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  const { written } = writeAll(".", out)
  const pages = written
    .filter((p) => p.endsWith(".md"))
    .map((p) => {
      const { fields } = splitFrontmatter(read(join(out, p), "utf8"))
      return { path: p, title: fields.title, description: fields.description }
    })

  const titles = pages.map((p) => p.title)
  expect(new Set(titles).size).toBe(titles.length)
  expect(pages.filter((p) => p.description === p.title)).toEqual([])
  expect(pages.filter((p) => !p.description)).toEqual([])
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
