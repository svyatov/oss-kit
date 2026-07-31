// tests/generate.test.ts
import { expect, test } from "bun:test"
import {
  agentNotice,
  pageDescription,
  parseRules,
  summarize,
  renderRulePage,
  renderRuleSources,
  renderSkillPage,
  renderStandardBody,
  rewriteLinks,
  skillSummaries,
  splitFrontmatter,
  stripUnreleased,
  writeAll,
} from "../site/scripts/generate.mjs"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync as read,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const currentRules = parseRules(read("skills/oss-audit/STANDARD.md", "utf8"))

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
  const page = renderRulePage(
    parseRules(TWO_RULES)[1]!,
    "skills/oss-audit/STANDARD.md",
    { position: 1, total: 9 },
    { sources: ["https://example.com/spec"], verified: "2026-07-28" },
  )
  expect(page.startsWith("---\n")).toBe(true)
  expect(page).toContain('title: "Pin every third-party action to a full commit SHA"')
  expect(page).toContain('description: "A tag moves."')
  expect(page).toContain('"badge":"R-SEC-01"')
  expect(page).toContain("edit/main/skills/oss-audit/STANDARD.md")
  expect(page).toContain("A tag moves.")
  expect(page).toContain("every <code>uses:</code> line resolves to a 40-character SHA.")
  expect(page).toContain("/skills/oss-harden/#r-sec-01")
  expect(page).toContain("GitHub only")
  // A visitor arriving from search needs to know which area they landed in.
  expect(page).toContain("1 of 9")
  expect(page).toContain('<a href="/rules/sec/">')
  // The provenance section is the reason renderRulePage takes an entry at all.
  // Without this, deleting the renderRuleSources call empties every rule page
  // on the site and the suite stays green.
  expect(page).toContain("Where this comes from")
  expect(page).toContain('<a href="https://example.com/spec">')
})

test("renderRuleSources tells a sourced rule apart from this standard's own position", () => {
  const sourced = renderRuleSources({
    sources: ["https://example.com/spec"],
    verified: "2026-07-28",
    note: "Upstream writes GET /integrity/<project>/provenance.",
  })
  expect(sourced).toContain('<a href="https://example.com/spec">')
  expect(sourced).toContain("Last read against these sources on 2026-07-28.")
  // Verbatim upstream quotes carry angle brackets, and CommonMark eats them as tags.
  expect(sourced).toContain("/integrity/&lt;project&gt;/provenance")
  expect(sourced).not.toContain("<project>")

  // A source nobody has re-read yet carries no date. The date belongs to the
  // list it was read against, so conflating "has sources" with "has been
  // verified" would print "Last read against these sources on undefined".
  const unread = renderRuleSources({ sources: ["https://example.com/spec"] })
  expect(unread).toContain('<a href="https://example.com/spec">')
  expect(unread).not.toContain("Last read")

  // A rule with no upstream must say so, not render an empty list: telling the
  // two apart is the whole reason these are published.
  for (const empty of [{ sources: [] }, undefined]) {
    const own = renderRuleSources(empty)
    expect(own).toContain("oss-kit's own position")
    expect(own).not.toContain("<ul>")
    expect(own).not.toContain("Last read")
  }

  // rule-sources.test.ts requires the note when there is no source, so the
  // sourceless copy has to hand off to it rather than end the section.
  const argued = renderRuleSources({ sources: [], note: "Retire this rule if forges render it." })
  expect(argued).toContain("the argument for it is below")
  expect(argued).toContain("Retire this rule if forges render it.")
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
  expect(currentRules.length).toBeGreaterThan(0)
  expect(new Set(currentRules.map((rule) => rule.id)).size).toBe(currentRules.length)
  expect(currentRules.some((rule) => rule.fixedBy === "oss-audit")).toBe(false)
  // The CI area is two letters, unlike the three-letter areas; the parser must
  // accept both. A parser that only matched three would yield none of them, so
  // this asserts they parse rather than how many there are: pinning the count
  // made adding a CI rule an edit here and proved nothing the emptiness check
  // does not.
  expect(currentRules.filter((rule) => rule.area === "CI").length).toBeGreaterThan(0)
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

test("agentNotice tells a human reader what to do with a page written for an agent", () => {
  expect(agentNotice("skills/oss-readme/SKILL.md")).toContain("You do not have to read it")
})

test("renderSkillPage anchors the rule list the skill body already carries", () => {
  const owned = parseRules(TWO_RULES).slice(1)
  const body = "# Harden\n\nBody line.\n\n## Rules this skill owns\n\nR-SEC-01: Pin every third-party action to a full commit SHA\n"
  const page = renderSkillPage("skills/oss-harden/SKILL.md", `---\nname: oss-harden\n---\n\n${body}`, undefined, owned)
  expect(page).toContain('<p class="skill-rule" id="r-sec-01"><a href="/rules/r-sec-01/">')
  expect(page).toContain("<code>R-SEC-01</code>")
  // One list, not two: the body already had it, so no panel is added.
  expect(page).not.toContain("skill-rules")
  // A rule ID inside a sentence is prose, not a list row.
  expect(page).toContain("## Rules this skill owns")
})

test("renderSkillPage falls back to a generated panel when the body lists no rules", () => {
  const source = `---\nname: oss-skill\n---\n\n# Skills\n\nR-SKL-01 is named only inside this sentence.\n`
  const page = renderSkillPage("skills/oss-skill/SKILL.md", source, undefined, parseRules(TWO_RULES).slice(1))
  expect(page).toContain('<li id="r-sec-01">')
  // Raw HTML, not a Markdown heading: nine owned rules would otherwise be nine
  // entries in the table of contents.
  expect(page).toContain("<h2>Rules this skill fixes</h2>")
  expect(page).not.toContain("## Rules this skill fixes")
  // A skill that owns no rule renders no empty panel.
  expect(renderSkillPage("skills/oss-audit/SKILL.md", source, undefined, [])).not.toContain("skill-rules")
})

test("renderSkillPage drops the body heading the page title already renders", () => {
  const source = `---\nname: oss-readme\ndescription: "Write a README."\nlicense: MIT\n---\n\n# Write a README\n\nBody line.\n`
  const page = renderSkillPage("skills/oss-readme/SKILL.md", source, "Orders the README.")
  expect(page).toContain('title: "oss-readme"')
  expect(page).toContain("Write a README.")
  expect(page).toContain("Body line.")
  expect(page).not.toContain("license: MIT")
  expect(page).not.toContain("# Write a README")
  expect(page).toContain('<p class="doc-lede">Orders the README.</p>')
  expect(page.indexOf("doc-lede")).toBeLessThan(page.indexOf("instruction text"))
  expect(page.indexOf("instruction text")).toBeLessThan(page.indexOf("Body line."))
})

test("skillSummaries reads the README table and rejects a README with no table", () => {
  const summaries = skillSummaries(read("README.md", "utf8"))
  expect(summaries.get("oss-audit")).toContain("routes each gap")
  expect(summaries.size).toBe(9)
  expect(() => skillSummaries("# No table here\n")).toThrow("README table")
})

test("renderStandardBody gives every rule the instrument its own page has", () => {
  const body = renderStandardBody(TWO_RULES.replace(/^# .*\n/m, ""), parseRules(TWO_RULES))

  // The prose between the rules is the argument the standard makes; it stays.
  expect(body).toContain("Preamble prose that is not a rule.")
  expect(body).toContain("Section preamble prose.")
  expect(body).toContain("### R-DOC-01: The README opens")

  expect(body.match(/doc-instrument-meta/g)).toHaveLength(2)
  // The fragment lands on the rule's row in the skill's own list of what it
  // fixes, rather than at the top of several thousand words of agent text.
  expect(body).toContain('<a href="/skills/oss-harden/#r-sec-01">oss-harden</a>')
  // Two cells, not four. The heading above carries the ID and the `##` above
  // that carries the area, so both cells would restate the screen 46 times.
  expect(body).not.toContain("<dt>Rule</dt>")
  expect(body).not.toContain("<dt>Area</dt>")
  expect(body).toContain("<dt>Forge scope</dt>")
  // h4, not h2: the standard spends h2 on areas and h3 on rules, and a
  // 54-entry contents list of "Observable check" is not a contents list.
  expect(body).toContain("<h4>Observable check</h4>")
  expect(body).not.toContain("<h2>Observable check</h2>")
  // A raw HTML block runs to the next blank line, so without one the heading
  // after it is swallowed and never becomes an anchor.
  expect(body).toContain("</section>\n\n### R-SEC-01")
})

test("writeAll produces every page the site needs", () => {
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  const { written } = writeAll(".", out)

  expect(written.filter((path) => /^rules\/r-[a-z]+-\d{2}\.md$/.test(path))).toHaveLength(currentRules.length)
  expect(existsSync(join(out, "rules/r-sec-01.md"))).toBe(true)
  expect(existsSync(join(out, "rules/index.mdx"))).toBe(true)
  expect(existsSync(join(out, "rules/sec/index.mdx"))).toBe(true)
  expect(existsSync(join(out, "standard.md"))).toBe(true)
  expect(existsSync(join(out, "changelog.md"))).toBe(true)
  expect(existsSync(join(out, "skills/index.mdx"))).toBe(true)
  expect(existsSync(join(out, "skills/oss-audit.md"))).toBe(true)
  expect(existsSync(join(out, "skills/oss-publish/npm.md"))).toBe(true)
  expect(existsSync(join(out, "guides/install.md"))).toBe(false)

  const secOne = read(join(out, "rules/r-sec-01.md"), "utf8")
  expect(secOne).toContain("/skills/oss-harden/")
  // End to end from rule-sources.json onto a written page. renderRuleSources is
  // unit-tested on a literal, so only this catches writeAll reading the wrong
  // file, keying it wrong, or passing no entry at all.
  expect(secOne).toContain("Where this comes from")
  expect(secOne).toContain("https://docs.github.com/en/actions/reference/secure-use-reference")
  // A rule holding this standard's own position must say so on its own page.
  expect(read(join(out, "rules/r-doc-03.md"), "utf8")).toContain("oss-kit's own position")

  // An area index is the page an audit routes a maintainer to, so it renders
  // through the same rack as /rules/ and /skills/ rather than a bullet list.
  const area = read(join(out, "rules/sec/index.mdx"), "utf8")
  expect(area).toContain('<Rack items={areaRackItems.sec} variant="rules" />')
  expect(area).toContain("../../../../components/Rack.astro")
  expect(area).toContain("tableOfContents: false")
  expect(area).not.toContain("- [R-SEC-01")
  rmSync(out, { recursive: true, force: true })
})

const roster = JSON.parse(read("skills/oss-audit/ecosystems.json", "utf8"))
const ecosystemNames: string[] = Object.keys(roster.ecosystems)
const sectionSkills: string[] = Object.keys(roster.sections)

/**
 * A copy rather than a symlink, because every ecosystem test varies the skills
 * tree and a symlink would vary the repository instead.
 */
function fixtureRepo() {
  const root = mkdtempSync(join(tmpdir(), "oss-kit-repo-"))
  cpSync(resolve("skills"), join(root, "skills"), { recursive: true })
  symlinkSync(resolve("README.md"), join(root, "README.md"))
  symlinkSync(resolve("CHANGELOG.md"), join(root, "CHANGELOG.md"))
  return root
}

test("writeAll stitches one page per roster ecosystem, not one page per file", () => {
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  const { written } = writeAll(".", out)

  const pages = written.filter((path) => /^ecosystems\/[a-z-]+\.md$/.test(path))
  expect(pages).toHaveLength(ecosystemNames.length)
  for (const name of ecosystemNames) expect(pages).toContain(`ecosystems/${name}.md`)

  // Every skill in the roster gets a section on every page, present or absent,
  // so a reader can tell an unresearched gap from a skill with nothing to say.
  const npm = read(join(out, "ecosystems/npm.md"), "utf8")
  for (const skill of sectionSkills) expect(npm).toContain(`## [${skill}](/skills/${skill}/)`)
  rmSync(out, { recursive: true, force: true })
})

test("a skill with no file for an ecosystem renders a hole naming the path it needs", () => {
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  writeAll(".", out)
  expect(read(join(out, "ecosystems/npm.md"), "utf8")).toContain(
    "`skills/oss-publish/references/ecosystems/npm.md` does not exist",
  )
  rmSync(out, { recursive: true, force: true })
})

test("an ecosystem file is stitched in and gets no per-file page of its own", () => {
  const root = fixtureRepo()
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  mkdirSync(join(root, "skills/oss-publish/references/ecosystems"), { recursive: true })
  writeFileSync(
    join(root, "skills/oss-publish/references/ecosystems/npm.md"),
    "# npm\n\n## Gather facts (Step 1)\n\nRead the manifest.\n",
  )

  const { written } = writeAll(root, out)
  // A subdirectory used to reach readFileSync and throw EISDIR; now it neither
  // throws nor emits the seventy-seven pages a per-file rule would have.
  expect(written).not.toContain("skills/oss-publish/ecosystems/npm.md")
  expect(written).not.toContain("skills/oss-publish/references/ecosystems/npm.md")

  const page = read(join(out, "ecosystems/npm.md"), "utf8")
  // Demoted one level, so the skill heading above it stays the section heading.
  expect(page).toContain("### Gather facts (Step 1)")
  expect(page).not.toContain("skills/oss-publish/references/ecosystems/npm.md` does not exist")
  rmSync(root, { recursive: true, force: true })
  rmSync(out, { recursive: true, force: true })
})

test("both link forms for an ecosystem file resolve to the one stitched page", () => {
  const root = fixtureRepo()
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  mkdirSync(join(root, "skills/oss-harden/references/ecosystems"), { recursive: true })
  writeFileSync(join(root, "skills/oss-harden/references/ecosystems/hex.md"), "# Hex\n\nMix.\n")

  const skill = join(root, "skills/oss-harden/SKILL.md")
  writeFileSync(skill, `${read(skill, "utf8")}\n\nSee [Hex](references/ecosystems/hex.md).\n`)
  // The sibling form, which is what a migrated paragraph in a forge reference
  // leaves behind. rewriteLinks throws on an unmapped `.md` target, so missing
  // this key kills the build rather than producing a broken link.
  const github = join(root, "skills/oss-harden/references/github.md")
  writeFileSync(github, `${read(github, "utf8")}\n\nSee [Hex](ecosystems/hex.md).\n`)

  writeAll(root, out)
  expect(read(join(out, "skills/oss-harden.md"), "utf8")).toContain("[Hex](/ecosystems/hex/)")
  expect(read(join(out, "skills/oss-harden/github.md"), "utf8")).toContain("[Hex](/ecosystems/hex/)")
  rmSync(root, { recursive: true, force: true })
  rmSync(out, { recursive: true, force: true })
})

test("an empty or unparseable roster fails the build loudly rather than writing no pages", () => {
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  const withRoster = (contents: string) => {
    const root = fixtureRepo()
    writeFileSync(join(root, "skills/oss-audit/ecosystems.json"), contents)
    return root
  }

  const empty = withRoster("{}")
  expect(() => writeAll(empty, out)).toThrow(/skills\/oss-audit\/ecosystems\.json lists no ecosystems/)

  const noSections = withRoster('{"ecosystems":{"npm":{"title":"npm"}}}')
  expect(() => writeAll(noSections, out)).toThrow(/skills\/oss-audit\/ecosystems\.json declares no section sets/)

  rmSync(empty, { recursive: true, force: true })
  rmSync(noSections, { recursive: true, force: true })
  rmSync(out, { recursive: true, force: true })
})

test("every page has a unique title and a description that is not a copy of it", () => {
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  const { written } = writeAll(".", out)
  const pages = written
    .filter((p) => p.endsWith(".md") || p.endsWith(".mdx"))
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

const RELEASED = `## [0.2.0] - 2026-07-27

### Added

- A thing.

[0.2.0]: https://example.com/compare/v0.1.0...v0.2.0
`

test("stripUnreleased drops the section, its entries, and its definition", () => {
  const text = `## [Unreleased]

### Changed

- [A link](https://example.com) opens this entry, which is not a definition.

${RELEASED}[Unreleased]: https://example.com/compare/v0.2.0...HEAD
`
  expect(stripUnreleased(text)).toBe(RELEASED)
})

test("stripUnreleased handles an empty section and a changelog without one", () => {
  const empty = `## [Unreleased]

${RELEASED}[Unreleased]: https://example.com/compare/v0.2.0...HEAD
`
  expect(stripUnreleased(empty)).toBe(RELEASED)
  expect(stripUnreleased(RELEASED)).toBe(RELEASED)
  // The definition is the last line of a file that does not end in a newline.
  expect(stripUnreleased(`${RELEASED}[Unreleased]: https://example.com/h`)).toBe(RELEASED)
})

test("stripUnreleased ends the section at a release, not at a definition inside it", () => {
  // Only a heading ends the section. Ending it at the first line that looks
  // like a definition, which an entry can carry and prose can imitate, left
  // every entry below that line on the page with no heading to explain it.
  const text = `## [Unreleased]

### Changed

[Note]: this line has the label and the colon but no URL, so it is prose.
- An entry that must go too. See [#12].

[#12]: https://example.com/issues/12

- A last entry, below a definition this section really does carry.

${RELEASED}[Unreleased]: https://example.com/compare/v0.2.0...HEAD
`
  expect(stripUnreleased(text)).toBe(RELEASED)
})

test("stripUnreleased takes the last entry of a file that ends without a newline", () => {
  // The section runs to the end of the file, and its final entry carries no
  // newline to be recognized by.
  expect(stripUnreleased("## [Unreleased]\n\n### Fixed\n\n- A leaking entry")).toBe("")
})

test("stripUnreleased removes the definition in the footer, not an example of one", () => {
  // oss-kit documents changelogs, so a released entry may quote the footer it
  // prescribes. Removing the first match took the example and left the real
  // definition, putting the word on the page and in the search index.
  const quoted = `## [0.2.0] - 2026-07-27

### Added

- A footer, which reads:

\`\`\`
[Unreleased]: https://example.com/compare/v0.2.0...HEAD
\`\`\`

[0.2.0]: https://example.com/compare/v0.1.0...v0.2.0
[Unreleased]: https://example.com/compare/v0.2.0...HEAD
`
  const stripped = stripUnreleased(quoted)
  expect(stripped).toContain("```\n[Unreleased]: https://example.com/compare/v0.2.0...HEAD\n```")
  expect(stripped.endsWith("[0.2.0]: https://example.com/compare/v0.1.0...v0.2.0\n")).toBe(true)
  expect(stripped.match(/^\[Unreleased\]: /gm)).toHaveLength(1)
})

test("stripUnreleased ends the section at the definitions when no release follows", () => {
  // A project before its first release. This is the only input that reaches
  // the terminator's second alternative, since every other case stops at the
  // next `##` heading. The issue reference definition is what makes the case
  // observable: a terminator that ran to the end of the file would take it
  // too, and oss-changelog asks for forge links to be collected this way.
  const unreleased = `## [Unreleased]

### Added

- The first thing, not yet released. See [#12].

[Unreleased]: https://example.com/compare/v0.0.0...HEAD
[#12]: https://example.com/issues/12
`
  expect(stripUnreleased(unreleased)).toBe("[#12]: https://example.com/issues/12\n")
})

test("the changelog link check fails the build on a target that does not exist", () => {
  const root = mkdtempSync(join(tmpdir(), "oss-kit-repo-"))
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  symlinkSync(resolve("skills"), join(root, "skills"))
  symlinkSync(resolve("README.md"), join(root, "README.md"))
  writeFileSync(join(root, "CHANGELOG.md"), read("CHANGELOG.md", "utf8").replaceAll("README.md#", "GONE.md#"))

  expect(() => writeAll(root, out)).toThrow(/changelog links a missing file: GONE\.md/)
  rmSync(root, { recursive: true, force: true })
  rmSync(out, { recursive: true, force: true })
})

test("the changelog page publishes released versions only", () => {
  const out = mkdtempSync(join(tmpdir(), "oss-kit-site-"))
  writeAll(".", out)
  const page = read(join(out, "changelog.md"), "utf8")
  const source = read("CHANGELOG.md", "utf8")
  const count = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0

  // Assert the construct, not the word: a released entry may discuss the
  // Unreleased section in prose, and one of them does.
  expect(page).not.toMatch(/^## \[Unreleased\]/m)
  expect(page).not.toMatch(/^\[Unreleased\]: /m)

  // Every release heading is a shortcut reference link, so it renders as
  // literal brackets if its definition is dropped along with the section's.
  // Counting against the source catches a strip that ate a real release, which
  // an assertion that merely finds one surviving release would pass.
  const headings = /^## \[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}$/gm
  const definitions = /^\[\d+\.\d+\.\d+\]: https:/gm
  expect(count(page, headings)).toBe(count(source, headings))
  expect(count(page, definitions)).toBe(count(source, definitions))
  expect(count(page, headings)).toBeGreaterThan(0)

  // The changelog is the only page with no sibling page to link, so a relative
  // target used to ship raw and 404 on the site.
  expect(page).not.toContain("](README.md")
  expect(page).toContain("blob/main/README.md#versioning")
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
