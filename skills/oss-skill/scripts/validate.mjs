#!/usr/bin/env node
// @ts-check
/**
 * Validates a repository that ships agent skills against R-SKL-01 through
 * R-SKL-05 of the oss-kit standard.
 *
 * Reads files. Writes nothing, spawns nothing, and makes no network call.
 *
 * Runs on Node 22 or later and on Bun, with nothing installed. Imports only
 * Node built-in modules and uses no runtime-specific global, because a skill
 * ships to whatever the reader already has. R-SKL-05 says the same thing, and
 * this file is held to it.
 */
import { readFileSync, readdirSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * @typedef {object} Finding
 * @property {"error"|"warning"} severity
 * @property {string|null} rule Rule ID, or null for a rule this standard does not define
 * @property {string} file Repository-relative path
 * @property {string} message
 */

/**
 * @typedef {object} Frontmatter
 * @property {boolean} ok
 * @property {"missing"|"unterminated"|null} reason
 * @property {Map<string,string>} entries
 * @property {number[]} unreadable 1-based line numbers this reader could not parse
 * @property {number} bodyStart 0-based index of the first body line
 */

const SPEC_KEYS = ["name", "description", "license", "compatibility", "metadata", "allowed-tools"]
const SKIP_DIRS = new Set([".git", "node_modules"])
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Yields every regular file under dir. Skips .git and node_modules, and never
 * follows a symlink: a repository may commit .claude/skills and .agents/skills
 * pointing at one real skills/ directory, and following them reports every
 * skill two or three times.
 * @param {string} dir
 * @returns {Generator<string>}
 */
function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(path)
    } else if (entry.isFile()) {
      yield path
    }
  }
}

/**
 * @param {string} root
 * @returns {string[]} absolute paths, sorted
 */
export function findSkillFiles(root) {
  const found = []
  for (const path of walk(root)) {
    if (basename(path) === "SKILL.md") found.push(path)
  }
  return found.sort()
}

/**
 * @param {string} value
 * @returns {string}
 */
function unquote(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"')
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'")
  }
  return value
}

/**
 * Reads YAML frontmatter without a YAML parser, which no Node built-in
 * provides. Handles single-line plain, single-quoted, and double-quoted
 * scalars plus a nested metadata block, which is what real frontmatter holds.
 *
 * Any other construct is recorded in unreadable rather than reported as
 * invalid. A validator that calls a valid file broken is worse than one that
 * says which line it could not check.
 * @param {string} text
 * @returns {Frontmatter}
 */
export function parseFrontmatter(text) {
  const lines = text.split("\n")
  /** @type {Map<string,string>} */
  const entries = new Map()
  /** @type {number[]} */
  const unreadable = []
  if (lines[0] !== "---") {
    return { ok: false, reason: "missing", entries, unreadable, bodyStart: 0 }
  }
  let end = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      end = i
      break
    }
  }
  if (end === -1) {
    return { ok: false, reason: "unterminated", entries, unreadable, bodyStart: 0 }
  }
  let inMap = false
  for (let i = 1; i < end; i++) {
    const line = lines[i] ?? ""
    if (line.trim() === "") continue
    if (/^\s/.test(line)) {
      if (!(inMap && /^\s+[\w.-]+:\s*\S/.test(line))) unreadable.push(i + 1)
      continue
    }
    inMap = false
    const match = line.match(/^([\w.-]+):(.*)$/)
    if (!match) {
      unreadable.push(i + 1)
      continue
    }
    const [, key = "", rest = ""] = match
    const raw = rest.trim()
    if (raw === "") {
      if (key === "metadata") {
        inMap = true
        entries.set(key, "")
      } else {
        unreadable.push(i + 1)
      }
      continue
    }
    if (/^[>|&*]/.test(raw)) {
      unreadable.push(i + 1)
      continue
    }
    entries.set(key, unquote(raw))
  }
  return { ok: true, reason: null, entries, unreadable, bodyStart: end + 1 }
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0] ?? 0
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const above = row[j] ?? 0
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(above + 1, (row[j - 1] ?? 0) + 1, diagonal + cost)
      diagonal = above
    }
  }
  return row[b.length] ?? 0
}

/**
 * @param {string} key
 * @returns {string|null} the closest specification key within edit distance 2
 */
function suggest(key) {
  let best = null
  let bestDistance = 3
  for (const candidate of SPEC_KEYS) {
    const d = distance(key, candidate)
    if (d < bestDistance) {
      best = candidate
      bestDistance = d
    }
  }
  return best
}

/**
 * R-SKL-02: conformance to the Agent Skills specification.
 * @param {string} rel repository-relative path of the SKILL.md
 * @param {string} dirName name of its parent directory
 * @param {Frontmatter} fm
 * @returns {Finding[]}
 */
export function checkSpec(rel, dirName, fm) {
  /** @type {Finding[]} */
  const out = []
  /** @param {string} message */
  const err = (message) => out.push({ severity: "error", rule: "R-SKL-02", file: rel, message })
  /** @param {string} message */
  const warn = (message) => out.push({ severity: "warning", rule: "R-SKL-02", file: rel, message })

  if (!fm.ok) {
    err(
      fm.reason === "missing"
        ? "no frontmatter: the file must begin with a line containing only three hyphens"
        : "frontmatter is never closed: add a line containing only three hyphens",
    )
    return out
  }
  for (const line of fm.unreadable) {
    warn(`line ${line} uses a construct this validator does not read; check it with a YAML parser`)
  }

  const name = fm.entries.get("name")
  if (name === undefined || name === "") {
    err("frontmatter declares no name, which the specification requires")
  } else {
    if (name.length > 64) err(`name is ${name.length} characters; the limit is 64`)
    if (!NAME_RE.test(name)) {
      err(`name "${name}" must be lowercase letters, digits, and single hyphens, with no leading or trailing hyphen`)
    }
    if (name !== dirName) {
      err(`name "${name}" does not match its directory "${dirName}"; the specification requires them to match`)
    }
  }

  const description = fm.entries.get("description")
  if (description === undefined || description === "") {
    err("frontmatter declares no description, which the specification requires")
  } else if (description.length > 1024) {
    err(`description is ${description.length} characters; the limit is 1024`)
  }

  const compatibility = fm.entries.get("compatibility")
  if (compatibility !== undefined && compatibility.length > 500) {
    err(`compatibility is ${compatibility.length} characters; the limit is 500`)
  }

  for (const key of fm.entries.keys()) {
    if (SPEC_KEYS.includes(key)) continue
    const closest = suggest(key)
    warn(
      closest
        ? `unknown frontmatter key "${key}"; did you mean "${closest}"?`
        : `unknown frontmatter key "${key}"; the specification defines ${SPEC_KEYS.join(", ")}`,
    )
  }
  return out
}

/**
 * @param {string} root
 * @returns {Finding[]}
 */
export function validate(root) {
  /** @type {Finding[]} */
  const out = []
  for (const abs of findSkillFiles(root)) {
    const rel = relative(root, abs)
    const dir = dirname(abs)
    const text = readFileSync(abs, "utf8")
    const fm = parseFrontmatter(text)
    out.push(...checkSpec(rel, basename(dir), fm))
  }
  return out
}

function main() {
  const root = process.argv[2] ?? "."
  const findings = validate(root)
  for (const finding of findings) {
    const rule = finding.rule ? ` ${finding.rule}` : ""
    process.stdout.write(`${finding.severity}${rule} ${finding.file}: ${finding.message}\n`)
  }
  const errorCount = findings.filter((finding) => finding.severity === "error").length
  process.stdout.write(`${errorCount} error(s), ${findings.length - errorCount} warning(s)\n`)
  process.exitCode = errorCount > 0 ? 1 : 0
}

// import.meta.main landed in Node 24 and this file supports Node 22.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
