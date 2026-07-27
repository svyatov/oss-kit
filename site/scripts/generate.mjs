#!/usr/bin/env node
// @ts-check
/**
 * Generates the oss-kit documentation site's content from the repository.
 *
 * Reads the standard, the skills, and the changelog. Writes Markdown into the
 * site's content directory. Imports only Node built-ins and reads no
 * runtime-specific global, so node and bun both run it.
 */

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const HEADING = /^### (R-([A-Z]{2,3})-(\d{2})): (.+)$/ // areas are 2 or 3 letters (CI is two)
const ANY_HEADING = /^#{1,6} /
/** @type {Record<string, string>} */
const FORGE_LABEL = { github: "GitHub only", gitlab: "GitLab only", both: "GitHub and GitLab" }

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

/** @param {Rule} rule @param {string} sourcePath */
export function renderRulePage(rule, sourcePath) {
  const body = `<dl class="doc-instrument-meta">
  <div><dt>Rule</dt><dd>${rule.id}</dd></div>
  <div><dt>Forge scope</dt><dd>${FORGE_LABEL[rule.forges]}</dd></div>
  <div><dt>Fixed by</dt><dd><a href="/skills/${rule.fixedBy}/">${rule.fixedBy}</a></dd></div>
</dl>

${rule.why}

<section class="doc-check">
  <h2>Observable check</h2>
  <p>${inlineCodeHtml(rule.check)}</p>
</section>

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

/** @param {string} sourcePath */
export function agentNotice(sourcePath) {
  return `:::note
This page is the instruction text an agent loads, reproduced verbatim from [\`${sourcePath}\`](${BLOB}/${sourcePath}).
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

/** @param {string} sourcePath @param {string} text */
export function renderSkillPage(sourcePath, text) {
  const { fields, body } = splitFrontmatter(text)
  const title = fields.name ?? sourcePath
  const description = fields.description ?? ""
  return frontmatter(
    { title, description, sidebar: { badge: "Skill" }, editUrl: `${EDIT}/${sourcePath}` },
    `<p class="doc-kind-label">Agent instruction · canonical source</p>\n\n${agentNotice(sourcePath)}\n\n${body}`,
  )
}

const GENERATED = ["rules", "skills", "standard.md", "changelog.md"]

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
  for (const rule of rules) {
    written.push(write(outDir, `rules/${rule.id.toLowerCase()}.md`, renderRulePage(rule, standardPath)))
  }
  const sections = [...new Set(rules.map((rule) => rule.section))]
  written.push(
    write(
      outDir,
      "rules/index.md",
      frontmatter(
        {
          title: "Rules",
          description: "Browse the current oss-kit standard by maintainer responsibility.",
          sidebar: { label: "All rules" },
        },
        sections
          .map((section) => {
            const members = rules.filter((rule) => rule.section === section)
            const area = members[0]?.area.toLowerCase()
            return `- [${section}](/rules/${area}/) (${members.length} rules)`
          })
          .join("\n"),
      ),
    ),
  )
  for (const section of sections) {
    const members = rules.filter((rule) => rule.section === section)
    const area = members[0]?.area.toLowerCase() ?? ""
    written.push(
      write(
        outDir,
        `rules/${area}/index.md`,
        frontmatter(
          {
            title: section,
            description: `The ${section.toLowerCase()} rules in the oss-kit standard.`,
            sidebar: { label: `About ${section.toLowerCase()}` },
          },
          members
            .map(
              (rule) =>
                `- [${rule.id}: ${rule.statement}](/rules/${rule.id.toLowerCase()}/) · [${rule.fixedBy}](/skills/${rule.fixedBy}/)`,
            )
            .join("\n"),
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
        `${agentNotice(standardPath)}\n\n${standardText.replace(/^# .*\n/m, "")}`,
      ),
    ),
  )

  const skillNames = readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  const skillEntries = skillNames.map((name) => {
    const source = `skills/${name}/SKILL.md`
    const { fields } = splitFrontmatter(readFileSync(join(repoRoot, source), "utf8"))
    return { name, description: fields.description ?? "" }
  })
  written.push(
    write(
      outDir,
      "skills/index.md",
      frontmatter(
        {
          title: "Skills",
          description: "The current curated set of agent skills for open source maintainers.",
          sidebar: { label: "All skills" },
        },
        `oss-kit currently ships ${skillEntries.length} skills. Install the full collection, or choose the responsibility you need.\n\n${skillEntries
          .map(({ name, description }) => `## [${name}](/skills/${name}/)\n\n${description}`)
          .join("\n\n")}`,
      ),
    ),
  )
  /** @type {Map<string, string>} */
  const refTargets = new Map()
  for (const name of skillNames) {
    for (const ref of safeReaddir(join(repoRoot, "skills", name, "references"))) {
      refTargets.set(`${name}/references/${ref}`, `/skills/${name}/${ref.replace(/\.md$/, "")}/`)
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

  for (const name of skillNames) {
    const source = `skills/${name}/SKILL.md`
    const page = renderSkillPage(source, readFileSync(join(repoRoot, source), "utf8"))
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

  const changelog = readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8")
  written.push(
    write(
      outDir,
      "changelog.md",
      frontmatter(
        {
          title: "Changelog",
          description: "Every notable change to oss-kit.",
          editUrl: `${EDIT}/CHANGELOG.md`,
        },
        changelog.replace(/^# .*\n/m, ""),
      ),
    ),
  )

  return { written }
}

/** @param {string} path */
function safeReaddir(path) {
  try {
    return readdirSync(path)
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
