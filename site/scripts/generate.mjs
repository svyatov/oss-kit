#!/usr/bin/env node
// @ts-check
/**
 * Generates the oss-kit documentation site's content from the repository.
 *
 * Reads the standard, the skills, the tracked prose under docs/, and the
 * changelog. Writes Markdown into the site's content directory. Imports only
 * Node built-ins and reads no runtime-specific global, so node and bun both
 * run it.
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
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith("### ")) starts.push(i)
    if (ANY_HEADING.test(lines[i] ?? "")) headings.push(i)
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
    return { id, area, number, statement, why, check: one("Check"), fixedBy: one("Fixed by"), forges }
  })
}

/** @param {Record<string,string>} fields @param {string} body */
export function frontmatter(fields, body) {
  const head = Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n")
  return `---\n${head}\n---\n\n${body.trimStart()}`
}

/** @param {Rule} rule */
export function renderRulePage(rule) {
  const body = `## ${rule.statement}

${rule.why}

**Check:** ${rule.check}

**Fixed by:** [${rule.fixedBy}](/skills/${rule.fixedBy}/)

**Applies to:** ${FORGE_LABEL[rule.forges]}

[Read the whole standard](/standard/)
`
  return frontmatter(
    { title: rule.id, description: rule.statement },
    body,
  )
}

const BLOB = "https://github.com/svyatov/oss-kit/blob/main"
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
    { title, description },
    `${agentNotice(sourcePath)}\n\n${body}`,
  )
}

const GENERATED = ["rules", "skills", "guides", "standard.md", "changelog.md"]

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
    written.push(write(outDir, `rules/${rule.id.toLowerCase()}.md`, renderRulePage(rule)))
  }
  written.push(
    write(
      outDir,
      "standard.md",
      frontmatter(
        { title: "The standard", description: "Every rule oss-kit holds, in one page." },
        `${agentNotice(standardPath)}\n\n${standardText.replace(/^# .*\n/, "")}`,
      ),
    ),
  )

  const skillNames = readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
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
      const body = `${agentNotice(refSource)}\n\n${text.replace(/^# (.*)\n/, "")}`
      const title = /^# (.*)$/m.exec(text)?.[1] ?? ref.replace(/\.md$/, "")
      const refPage = frontmatter({ title, description: `Reference for ${name}.` }, body)
      written.push(write(outDir, `skills/${name}/${ref}`, rewriteLinks(refPage, resolve(name))))
    }
  }

  const guides = safeReaddir(join(repoRoot, "docs")).filter((n) => n.endsWith(".md"))
  const guideTargets = new Set(guides.map((n) => n.replace(/\.md$/, "")))
  for (const guide of guides) {
    const source = `docs/${guide}`
    const text = readFileSync(join(repoRoot, source), "utf8")
    const title = /^# (.*)$/m.exec(text)?.[1] ?? guide.replace(/\.md$/, "")
    const page = frontmatter({ title, description: title }, text.replace(/^# .*\n/, ""))
    const resolveGuide = (/** @type {string} */ target) => {
      const key = target.replace(/^\.\//, "").replace(/\.md$/, "")
      if (guideTargets.has(key)) return `/guides/${key}/`
      if (key === "CHANGELOG") return "/changelog/"
      if (/^(\.\.\/)*skills\/oss-audit\/STANDARD$/.test(key)) return "/standard/"
      if (key.startsWith("skills/")) return `/${key.replace(/\/SKILL$/, "")}/`
      return resolve("")(target)
    }
    written.push(write(outDir, `guides/${guide}`, rewriteLinks(page, resolveGuide)))
  }

  const changelog = readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8")
  written.push(
    write(
      outDir,
      "changelog.md",
      frontmatter(
        { title: "Changelog", description: "Every notable change to oss-kit." },
        changelog.replace(/^# .*\n/, ""),
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
