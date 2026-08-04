#!/usr/bin/env node
// @ts-check
/**
 * Generates the oss-kit documentation site's content from the repository.
 *
 * Reads the standard, the skills, and the changelog. Writes Markdown into the
 * site's content directory. Imports only Node built-ins and reads no
 * runtime-specific global, so node and bun both run it.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const HEADING = /^### (R-([A-Z]{2,3})-(\d{2})): (.+)$/ // areas are 2 or 3 letters (CI is two)
const ANY_HEADING = /^#{1,6} /
/** @type {Record<string, string>} */
export const FORGE_LABEL = { github: "GitHub only", gitlab: "GitLab only", both: "GitHub and GitLab" }

/**
 * @typedef {object} Rule
 * @property {string} id
 * @property {string} area
 * @property {string} number
 * @property {string} statement
 * @property {string} section
 * @property {string} why
 * @property {string} check
 * @property {string} fixedBy
 * @property {string} forges
 */

/** @param {string} text @returns {Rule[]} */
export function parseRules(text) {
  const lines = text.split("\n")
  /** @type {number[]} */
  const starts = []
  /** @type {number[]} */
  const headings = []
  /** @type {Map<number, string>} */
  const sections = new Map()
  let section = ""
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ""
    if (line.startsWith("## ") && !line.startsWith("### ")) section = line.slice(3).trim()
    if (line.startsWith("### ")) {
      starts.push(i)
      sections.set(i, section)
    }
    if (ANY_HEADING.test(line)) headings.push(i)
  }
  return starts.map((start) => {
    const end = headings.find((h) => h > start) ?? lines.length
    const heading = lines[start] ?? ""
    const match = HEADING.exec(heading)
    if (!match) throw new Error(`malformed rule heading: ${heading.slice(4)}`)
    const [, id = "", area = "", number = "", statement = ""] = match
    const body = lines.slice(start + 1, end)
    const one = (/** @type {string} */ label) => {
      const found = body.filter((l) => l.startsWith(`${label}: `))
      if (found.length !== 1) {
        throw new Error(`${id}: expected exactly one ${label}: line, found ${found.length}`)
      }
      return (found[0] ?? "").slice(label.length + 2).trim()
    }
    const why = body
      .filter((l) => l.trim() !== "" && !/^(Check|Fixed by|Forges): /.test(l))
      .join(" ")
      .trim()
    const forges = one("Forges")
    if (forges !== "github" && forges !== "gitlab" && forges !== "both") {
      throw new Error(`${id}: Forges: must be github, gitlab, or both, found ${JSON.stringify(forges)}`)
    }
    return {
      id,
      area,
      number,
      statement,
      section: sections.get(start) ?? "",
      why,
      check: one("Check"),
      fixedBy: one("Fixed by"),
      forges,
    }
  })
}

/** @param {Record<string,unknown>} fields @param {string} body */
export function frontmatter(fields, body) {
  const head = Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n")
  return `---\n${head}\n---\n\n${body.trimStart()}`
}

const LIMIT = 160

/**
 * Condenses prose into a meta description: one sentence, no markup, capped at
 * a length search engines and social cards will actually show.
 * @param {string} text
 */
export function summarize(text) {
  const flat = text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  const sentence = /^.*?[.!?](?=\s|$)/.exec(flat)?.[0] ?? flat
  if (sentence.length <= LIMIT) return sentence
  return `${sentence.slice(0, LIMIT - 1).replace(/\s+\S*$/, "")}...`
}

/** @param {string} markdown */
export function firstParagraph(markdown) {
  const blocks = markdown.split(/\n\s*\n/).map((block) => block.trim())
  return blocks.find((block) => block !== "" && !/^([#>|:`-]|\d+\.\s|\*\s)/.test(block)) ?? ""
}

/** @param {string} markdown @param {string} fallback */
export function pageDescription(markdown, fallback) {
  return summarize(firstParagraph(markdown)) || fallback
}

/**
 * The body of one rule: what it is, why it exists, and how to observe it. The
 * standard renders every rule through this too, so a rule reads the same
 * whether a visitor lands on its own page or scrolls past it in the whole set.
 * @param {Rule} rule
 * @param {object} opts
 * @param {string} [opts.position] suffix for the area cell
 * @param {2|4} opts.level the heading level of the check panel. The rule page
 *   has the statement as its h1 and wants h2 here; the standard already spends
 *   h2 on areas and h3 on rules, and h4 keeps the panel out of its contents
 *   list.
 * @param {boolean} opts.full whether to carry the Rule and Area cells. A rule
 *   page needs both: a visitor arriving from search has only the statement, so
 *   the ID and the area are the two things they cannot see. The standard shows
 *   the ID in the heading directly above and the area in the `##` above that,
 *   so there both cells restate what is already on screen, 46 times over.
 */
function ruleInstrument(rule, { position = "", level, full }) {
  const area = rule.area.toLowerCase()
  const cells = [
    ...(full
      ? [
          `<div><dt>Rule</dt><dd>${rule.id}</dd></div>`,
          `<div><dt>Area</dt><dd><a href="/rules/${area}/">${rule.section}</a>${position}</dd></div>`,
        ]
      : []),
    `<div><dt>Forge scope</dt><dd>${FORGE_LABEL[rule.forges]}</dd></div>`,
    // The fragment lands on the rule's entry in the skill's own list of what it
    // fixes. A skill page is several thousand words of agent instruction, and
    // the bare link dropped a reader who asked "how do I fix R-SEC-01" at the
    // top of it with nothing naming the rule they came from.
    `<div><dt>Fixed by</dt><dd><a href="/skills/${rule.fixedBy}/#${rule.id.toLowerCase()}">${rule.fixedBy}</a></dd></div>`,
  ]
  // The panel's id is keyed by rule rather than a bare `check`, because the
  // standard renders every rule through this same function onto one page, where
  // a fixed id would repeat once per rule.
  return `<dl class="doc-instrument-meta">
  ${cells.join("\n  ")}
</dl>

${rule.why}

<section class="doc-check" id="${rule.id.toLowerCase()}-check">
  <h${level}>Observable check</h${level}>
  <p>${inlineCodeHtml(rule.check)}</p>
</section>`
}

/**
 * Rewrites the standard so each rule carries the same meta strip and check
 * panel as its own page, and leaves every other line of it alone. The prose
 * between the rules is the argument the standard makes, and it stays verbatim.
 * @param {string} standardText
 * @param {Rule[]} rules
 */
export function renderStandardBody(standardText, rules) {
  const byId = new Map(rules.map((rule) => [rule.id, rule]))
  /** @type {string[]} */
  const out = []
  let inRule = false
  for (const line of standardText.split("\n")) {
    const heading = HEADING.exec(line)
    if (heading) {
      const rule = byId.get(heading[1] ?? "")
      if (!rule) throw new Error(`rule heading with no parsed rule: ${line}`)
      // The trailing blank line closes the HTML block, or CommonMark swallows
      // the next heading into it.
      out.push(line, "", ruleInstrument(rule, { level: 4, full: false }), "")
      inRule = true
      continue
    }
    if (inRule) {
      if (!ANY_HEADING.test(line)) continue
      inRule = false
    }
    out.push(line)
  }
  return out.join("\n")
}

/**
 * Where a rule's opinion came from, rendered on the rule page and nowhere else.
 * The standard is an argument and stays clean; a visitor asking "says who" is
 * asking about one rule. A rule with no upstream says so in those words rather
 * than rendering an empty list, because the whole point of publishing this is
 * that a reader can tell a sourced rule from this standard's own position.
 * @param {{sources?: string[], verified?: string, note?: string}} [entry]
 */
export function renderRuleSources(entry) {
  const urls = entry?.sources ?? []
  // A date belongs to the list it was read against, so it rides the sourced branch.
  const verified = entry?.verified ? `\n<p class="doc-verified">Last read against these sources on ${entry.verified}.</p>` : ""
  const list = urls.map((url) => `  <li><a href="${inlineCodeHtml(url)}">${inlineCodeHtml(url)}</a></li>`).join("\n")
  const body =
    urls.length === 0
      ? "<p>No upstream source. This is oss-kit's own position, and the argument for it is below.</p>"
      : `<ul>\n${list}\n</ul>${verified}`
  // Notes quote upstream verbatim, and upstream writes things like
  // GET /integrity/<project>/<version>/. Unescaped, CommonMark eats them as tags.
  return `<section class="doc-sources">
  <h2>Where this comes from</h2>
  ${body}${entry?.note ? `\n  <p>${inlineCodeHtml(entry.note)}</p>` : ""}
</section>`
}

/**
 * @param {Rule} rule
 * @param {string} sourcePath
 * @param {{position: number, total: number}} [place] where the rule sits in its
 *   area. Search resolves to a rule page rather than to the standard, so a
 *   visitor commonly arrives here with no idea which area they landed in.
 * @param {{sources?: string[], verified?: string, note?: string}} [entry] this
 *   rule's entry in rule-sources.json.
 */
export function renderRulePage(rule, sourcePath, place, entry) {
  // The count is one token: unwrapped it broke as "1 of" over "13" in a cell
  // narrow enough to need two lines.
  const position = place
    ? ` <span class="doc-instrument-meta__place">· ${place.position} of ${place.total}</span>`
    : ""
  const body = `${ruleInstrument(rule, { position, level: 2, full: true })}

${renderRuleSources(entry)}

[Read the whole standard](/standard/)
`
  return frontmatter(
    {
      title: rule.statement,
      description: summarize(rule.why),
      sidebar: { label: rule.statement, badge: rule.id },
      editUrl: `${EDIT}/${sourcePath}`,
      // One rule, no headings under it, so a table of contents would list only itself.
      tableOfContents: false,
    },
    body,
  )
}

const BLOB = "https://github.com/svyatov/oss-kit/blob/main"
const EDIT = "https://github.com/svyatov/oss-kit/edit/main"
const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g

/** @param {string} markdown @param {(target: string) => string|null} resolve */
export function rewriteLinks(markdown, resolve) {
  return markdown.replace(LINK, (whole, /** @type {string} */ label, /** @type {string} */ target) => {
    if (/^(https?:|mailto:|#|\/)/.test(target)) return whole
    const replacement = resolve(target)
    if (replacement) return `[${label}](${replacement})`
    if (target.endsWith(".md")) throw new Error(`link target resolves to no page: ${target}`)
    return whole
  })
}

// A label, a colon, and one token of target. An entry that opens with a bracket
// has the first two, so the target is what tells a definition from prose.
const DEFINITION = /^\[[^\]]+\]: \S+\s*$/

/**
 * The site publishes released versions only. Keep a Changelog requires the
 * section in the file, where it stages the next release, but on a page it
 * either renders as an empty heading or advertises work nobody can install.
 * Its reference definition goes too, so the word reaches neither the page nor
 * the search index.
 *
 * A changelog is a body followed by a block of reference definitions, and
 * finding that boundary first is what keeps the two removals out of each
 * other's reach. In the body only a `##` heading ends the section, so a
 * definition an entry carries cannot end it early. The definition removal
 * looks only inside the block, so an example of the footer quoted in a
 * released entry is not mistaken for the footer itself.
 *
 * Each line keeps its own newline, so dropping the last line of a file does
 * not take the newline off the line above it, and a file that ends without one
 * cannot leave its final entry behind.
 * @param {string} markdown
 */
export function stripUnreleased(markdown) {
  const lines = markdown.split(/(?<=\n)/)

  let footer = lines.length
  while (footer > 0) {
    const line = lines[footer - 1]
    if (line === undefined || (line.trim() !== "" && !DEFINITION.test(line))) break
    footer--
  }
  // The blank line separating the two belongs to the body, so a section that
  // runs to the footer takes it and does not leave the page opening on it.
  while (footer < lines.length && lines[footer]?.trim() === "") footer++

  const start = lines.findIndex((line) => line.startsWith("## [Unreleased]"))
  if (start > -1 && start < footer) {
    let end = start + 1
    while (end < footer && !lines[end]?.startsWith("## ")) end++
    lines.splice(start, end - start)
    footer -= end - start
  }

  const definition = lines.findIndex((line, i) => i >= footer && line.startsWith("[Unreleased]: "))
  if (definition > -1) lines.splice(definition, 1)

  return lines.join("")
}

/**
 * The second sentence is for the human reader. Everything below the notice is
 * written to be loaded by an agent, and without it the page reads as
 * documentation somebody forgot to finish.
 * @param {string} sourcePath
 */
export function agentNotice(sourcePath) {
  return `:::note
This page is the instruction text an agent loads, reproduced verbatim from [\`${sourcePath}\`](${BLOB}/${sourcePath}). You do not have to read it: install the kit and ask your agent for the skill by name.
:::`
}

/** @param {string} text */
export function splitFrontmatter(text) {
  const lines = text.split("\n")
  if (lines[0] !== "---") return { fields: /** @type {Record<string, string>} */ ({}), body: text }
  const close = lines.indexOf("---", 1)
  if (close === -1) throw new Error("unterminated frontmatter")
  /** @type {Record<string, string>} */
  const fields = {}
  for (const line of lines.slice(1, close)) {
    const at = line.indexOf(":")
    if (at === -1) continue
    const key = line.slice(0, at).trim()
    let value = line.slice(at + 1).trim()
    if (/^".*"$/.test(value)) value = JSON.parse(value)
    fields[key] = value
  }
  return { fields, body: lines.slice(close + 1).join("\n") }
}

/**
 * The README table is the human-facing one-line summary of each skill. A
 * SKILL.md description is written to make an agent load the skill, so it reads
 * as trigger phrasing and is not prose to open a page with.
 * @param {string} readmeText @returns {Map<string, string>}
 */
export function skillSummaries(readmeText) {
  const rows = [...readmeText.matchAll(/^\| `(oss-[a-z-]+)` \| (.+?) \|$/gm)]
  if (rows.length === 0) throw new Error("no skills parsed from the README table")
  return new Map(rows.map(([, name = "", summary = ""]) => [name, summary]))
}

const OWNED_LINE = /^(R-[A-Z]{2,3}-\d{2}): (.+)$/gm

/**
 * Most skills already list what they own as plain lines under their own
 * heading. Those lines become the anchor a rule page's Fixed by cell links to,
 * and a link back to the rule, rather than the page growing a second list of
 * the same rules. The wrapper is a paragraph, not a heading, so a skill owning
 * nine rules adds nothing to the table of contents.
 * @param {string} body @param {Map<string, Rule>} byId
 */
function anchorOwnedRules(body, byId) {
  return body.replace(OWNED_LINE, (whole, /** @type {string} */ id, /** @type {string} */ statement) => {
    if (!byId.has(id)) return whole
    const slug = id.toLowerCase()
    return `<p class="skill-rule" id="${slug}"><a href="/rules/${slug}/"><code>${id}</code> <span>${statement}</span></a></p>`
  })
}

/**
 * The fallback for a skill that names its rules only inside prose, so the
 * transform above finds no line to anchor and a Fixed by link would land
 * nowhere. Raw HTML, so the heading stays out of the table of contents.
 * @param {Rule[]} rules
 */
function ownedRules(rules) {
  if (rules.length === 0) return ""
  const items = rules.map(
    (rule) =>
      `  <li id="${rule.id.toLowerCase()}"><a href="/rules/${rule.id.toLowerCase()}/"><code>${rule.id}</code> <span>${rule.statement}</span></a></li>`,
  )
  return `<section class="skill-rules">
<h2>Rules this skill fixes</h2>
<ul>
${items.join("\n")}
</ul>
</section>

`
}

/**
 * @param {string} sourcePath
 * @param {string} text
 * @param {string} [summary] the README one-liner. It takes the slot the body's
 *   own `# ` heading held, which the page title already renders: two h1 at the
 *   same size read as two pages stacked.
 * @param {Rule[]} [rules] the rules this skill is named as fixing
 */
export function renderSkillPage(sourcePath, text, summary, rules = []) {
  const { fields, body } = splitFrontmatter(text)
  const title = fields.name ?? sourcePath
  const description = fields.description ?? ""
  const lede = summary ? `<p class="doc-lede">${summary}</p>\n\n` : ""
  const byId = new Map(rules.map((rule) => [rule.id, rule]))
  const anchored = anchorOwnedRules(body.replace(/^# .*\n/m, ""), byId)
  const fallback = anchored === body.replace(/^# .*\n/m, "") ? ownedRules(rules) : ""
  return frontmatter(
    // No badge. Every one of these read "Skill", under a sidebar group already
    // named Skills, so nine identical badges marked nothing.
    { title, description, editUrl: `${EDIT}/${sourcePath}` },
    `${lede}${agentNotice(sourcePath)}\n\n${fallback}${anchored}`,
  )
}

const GENERATED = ["rules", "skills", "ecosystems", "standard.md", "changelog.md"]

/** @param {string} text */
function inlineCodeHtml(text) {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>")
}

/**
 * @param {string} outDir
 * @param {string} relative
 * @param {string} contents
 */
function write(outDir, relative, contents) {
  const path = join(outDir, relative)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, contents)
  return relative
}

/** @param {string} repoRoot @param {string} outDir */
export function writeAll(repoRoot, outDir) {
  for (const entry of GENERATED) rmSync(join(outDir, entry), { recursive: true, force: true })
  /** @type {string[]} */
  const written = []

  const standardPath = "skills/oss-audit/STANDARD.md"
  const standardText = readFileSync(join(repoRoot, standardPath), "utf8")
  const rules = parseRules(standardText)
  const ruleSources = JSON.parse(readFileSync(join(repoRoot, "skills/oss-audit/rule-sources.json"), "utf8"))
  for (const rule of rules) {
    const siblings = rules.filter((other) => other.section === rule.section)
    const place = { position: siblings.indexOf(rule) + 1, total: siblings.length }
    written.push(
      write(outDir, `rules/${rule.id.toLowerCase()}.md`, renderRulePage(rule, standardPath, place, ruleSources[rule.id])),
    )
  }
  const sections = [...new Set(rules.map((rule) => rule.section))]
  written.push(
    write(
      outDir,
      "rules/index.mdx",
      frontmatter(
        {
          title: "Rules",
          description: "Browse the current oss-kit standard by maintainer responsibility.",
          sidebar: { label: "All rules" },
          tableOfContents: false,
        },
        `import Rack from "../../../components/Rack.astro";
import { domainRackItems } from "../../../lib/content.mjs";

The standard groups its ${rules.length} rules into ${sections.length} maintainer responsibilities. Each
one names the skills that fix its rules.

<Rack items={domainRackItems} />`,
      ),
    ),
  )
  for (const section of sections) {
    const members = rules.filter((rule) => rule.section === section)
    const area = members[0]?.area.toLowerCase() ?? ""
    written.push(
      write(
        outDir,
        `rules/${area}/index.mdx`,
        frontmatter(
          {
            title: section,
            description: `The ${section.toLowerCase()} rules in the oss-kit standard.`,
            sidebar: { label: `About ${section.toLowerCase()}` },
            // The page is one rack and carries no heading, so a contents list
            // here announced a region holding a single entry.
            tableOfContents: false,
          },
          `import Rack from "../../../../components/Rack.astro";
import { areaRackItems } from "../../../../lib/content.mjs";

${section} holds ${members.length} of the standard's ${rules.length} rules. Each one names the evidence
that settles it and the skill that fixes it.

<Rack items={areaRackItems.${area}} variant="rules" />`,
        ),
      ),
    )
  }
  written.push(
    write(
      outDir,
      "standard.md",
      frontmatter(
        {
          title: "The standard",
          description: "Every rule oss-kit holds, in one page.",
          editUrl: `${EDIT}/${standardPath}`,
          // Every rule here also has its own page. Indexing both returns the
          // same rule twice for one query, so search resolves to the rule page.
          pagefind: false,
        },
        `${agentNotice(standardPath)}\n\n${renderStandardBody(standardText.replace(/^# .*\n/m, ""), rules)}`,
      ),
    ),
  )

  const skillNames = readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  written.push(
    write(
      outDir,
      "skills/index.mdx",
      frontmatter(
        {
          title: "Skills",
          description: "The current curated set of agent skills for open source maintainers.",
          sidebar: { label: "All skills" },
          tableOfContents: false,
        },
        `import Rack from "../../../components/Rack.astro";
import { skillRackItems } from "../../../lib/content.mjs";

oss-kit ships ${skillNames.length} skills. Install the full collection, or take the one that owns
the job in front of you.

<Rack items={skillRackItems} variant="skills" />`,
      ),
    ),
  )
  /** @type {Map<string, string>} */
  const refTargets = new Map()
  for (const name of skillNames) {
    for (const ref of safeReaddir(join(repoRoot, "skills", name, "references"))) {
      refTargets.set(`${name}/references/${ref}`, `/skills/${name}/${ref.replace(/\.md$/, "")}/`)
    }
    // An ecosystem file has no page of its own; it is stitched into the
    // ecosystem page beside the other six skills' answers. Two directories link
    // it and the key is resolved relative to the linking file, so both forms
    // are mapped: a `SKILL.md` writes `references/ecosystems/<name>.md`, and a
    // pointer inside `references/github.md` writes the sibling `ecosystems/<name>.md`.
    for (const eco of safeReaddir(join(repoRoot, "skills", name, "references", "ecosystems"))) {
      const page = `/ecosystems/${eco.replace(/\.md$/, "")}/`
      refTargets.set(`${name}/references/ecosystems/${eco}`, page)
      refTargets.set(`${name}/ecosystems/${eco}`, page)
    }
  }
  const resolve = (/** @type {string} */ owner) => (/** @type {string} */ target) => {
    const key = target.replace(/^\.\//, "")
    if (refTargets.has(`${owner}/${key}`)) return refTargets.get(`${owner}/${key}`) ?? null
    if (key === "STANDARD.md") return "/standard/"
    const rule = /^#?(R-[A-Z]{2,3}-\d{2})$/.exec(key)
    if (rule) return `/rules/${(rule[1] ?? "").toLowerCase()}/`
    return null
  }

  const summaries = skillSummaries(readFileSync(join(repoRoot, "README.md"), "utf8"))
  for (const name of skillNames) {
    const source = `skills/${name}/SKILL.md`
    const page = renderSkillPage(
      source,
      readFileSync(join(repoRoot, source), "utf8"),
      summaries.get(name),
      rules.filter((rule) => rule.fixedBy === name),
    )
    written.push(write(outDir, `skills/${name}.md`, rewriteLinks(page, resolve(name))))
    for (const ref of safeReaddir(join(repoRoot, "skills", name, "references"))) {
      const refSource = `skills/${name}/references/${ref}`
      const text = readFileSync(join(repoRoot, refSource), "utf8")
      const body = `${agentNotice(refSource)}\n\n${text.replace(/^# (.*)\n/m, "")}`
      const heading = /^# (.*)$/m.exec(text)?.[1] ?? ref.replace(/\.md$/, "")
      // Two skills both ship a "GitHub reference"; the owning skill disambiguates them.
      const title = `${name}: ${heading}`
      const refPage = frontmatter(
        {
          title,
          description: pageDescription(text.replace(/^# .*\n/m, ""), `Reference for ${name}.`),
          sidebar: { label: heading },
          editUrl: `${EDIT}/${refSource}`,
        },
        body,
      )
      written.push(write(outDir, `skills/${name}/${ref}`, rewriteLinks(refPage, resolve(name))))
    }
  }

  // One page per ecosystem, stitching that ecosystem's answer out of every
  // skill that has one. Seventy-seven per-file pages would have put seven
  // entries labelled "npm" in the sidebar; this puts one, and it reads as the
  // per-language answer a maintainer actually arrived looking for.
  const rosterPath = "skills/oss-audit/ecosystems.json"
  const roster = JSON.parse(readFileSync(join(repoRoot, rosterPath), "utf8"))
  const ecosystems = Object.entries(roster.ecosystems ?? {})
  const sectionSkills = Object.keys(roster.sections ?? {})
  // Loud rather than zero iterations: a generator that writes no ecosystem page
  // because the roster is empty looks exactly like one that had nothing to write.
  if (ecosystems.length === 0) throw new Error(`${rosterPath} lists no ecosystems`)
  if (sectionSkills.length === 0) throw new Error(`${rosterPath} declares no section sets`)
  for (const [eco, meta] of ecosystems) {
    const parts = sectionSkills.map((skill) => {
      const refSource = `skills/${skill}/references/ecosystems/${eco}.md`
      const heading = `## [${skill}](/skills/${skill}/)`
      // The site shows the same hole the checker fails on, in the same
      // direction, rather than rendering a page that looks complete.
      if (!existsSync(join(repoRoot, refSource))) {
        return `${heading}\n\nThis skill has no answer for ${meta.title} yet: \`${refSource}\` does not exist.`
      }
      const text = readFileSync(join(repoRoot, refSource), "utf8")
      const body = text.replace(/^# .*\n/m, "").replace(/^(#{2,5}) /gm, "$1# ")
      return `${heading}\n\n${rewriteLinks(body, resolve(skill)).trim()}`
    })
    written.push(
      write(
        outDir,
        `ecosystems/${eco}.md`,
        frontmatter(
          {
            title: meta.title,
            description: `What every oss-kit skill knows about ${meta.title}, from detection to release.`,
            // The page has seven sources and no single file to edit, so the
            // link goes to the roster, which is what declares the page exists.
            editUrl: `${EDIT}/${rosterPath}`,
          },
          parts.join("\n\n"),
        ),
      ),
    )
  }

  // The eleven ecosystem pages were reachable only from a sidebar group, and the
  // one page that introduces the ecosystems is the splash page, which has no
  // sidebar. This is the landing page the footer and that group both point at.
  written.push(
    write(
      outDir,
      "ecosystems/index.mdx",
      frontmatter(
        {
          title: "Ecosystems",
          description: "How the oss-kit skills read each distribution ecosystem, from detection to release.",
          sidebar: { label: "All ecosystems" },
          editUrl: `${EDIT}/${rosterPath}`,
          tableOfContents: false,
        },
        `import Rack from "../../../components/Rack.astro";

The roster covers ${ecosystems.length} distribution ecosystems. Each page answers for one of them in the
voice of all ${sectionSkills.length} skills that detect, document, and release it.

<Rack items={${JSON.stringify(
          ecosystems.map(([eco, meta]) => ({
            href: `/ecosystems/${eco}/`,
            name: meta.title,
            meta: (meta.manifests ?? []).join(", "),
            count: meta.registry ?? "no registry",
          })),
        )}} variant="ecosystems" />`,
      ),
    ),
  )

  const changelog = readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8")
  // A relative target in the changelog names a file in the repository, and this
  // is the one page with no sibling page to point at, so it goes to the source.
  // The check throws rather than returning null, because rewriteLinks raises
  // only on a target ending in `.md` and every target here carries an anchor.
  // Returning null would put back the raw relative link that used to 404.
  const releases = rewriteLinks(stripUnreleased(changelog).replace(/^# .*\n/m, "").trim(), (target) => {
    const path = target.replace(/#.*$/, "")
    if (!existsSync(join(repoRoot, path))) throw new Error(`changelog links a missing file: ${path}`)
    return `${BLOB}/${target}`
  })
  written.push(
    write(
      outDir,
      "changelog.md",
      frontmatter(
        {
          title: "Changelog",
          description: "Every notable change to oss-kit.",
          editUrl: `${EDIT}/CHANGELOG.md`,
          // Versions only. Keep a Changelog gives every release the same set of
          // Added / Changed / Fixed headings, so a contents list that took them
          // repeated the same four words once per release and named no version
          // a reader could navigate to.
          tableOfContents: { maxHeadingLevel: 2 },
        },
        // A bare div, blank-line separated, so CommonMark closes the HTML block
        // and parses the releases as Markdown. The headings stay real headings,
        // which is what keeps the anchors and the table of contents working.
        `<div class="release-rail">\n\n${releases}\n\n</div>`,
      ),
    ),
  )

  return { written }
}

/**
 * Every caller reads a reference directory and hands each entry to
 * `readFileSync`, so a subdirectory such as `references/ecosystems/` used to
 * throw `EISDIR` and kill the build. Filtering here rather than at each call
 * site is also what keeps a per-file page from being emitted for one.
 * @param {string} path
 */
function safeReaddir(path) {
  try {
    return readdirSync(path).filter((entry) => entry.endsWith(".md"))
  } catch {
    return []
  }
}

if (process.argv[1] && process.argv[1].endsWith("generate.mjs")) {
  const repoRoot = process.argv[2] ?? ".."
  const outDir = process.argv[3] ?? "src/content/docs"
  const { written } = writeAll(repoRoot, outDir)
  console.log(`${written.length} page(s) written`)
}
