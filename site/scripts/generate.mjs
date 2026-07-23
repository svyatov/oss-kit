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

const HEADING = /^### (R-([A-Z]{2,3})-(\d{2})): (.+)$/ // areas are 2 or 3 letters (CI is two)
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
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith("### ")) starts.push(i)
  }
  return starts.map((start, index) => {
    const end = starts[index + 1] ?? lines.length
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
    return { id, area, number, statement, why, check: one("Check"), fixedBy: one("Fixed by"), forges: one("Forges") }
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
    { title: rule.id, description: rule.statement, tableOfContents: "false" },
    body,
  )
}
