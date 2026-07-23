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
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs"
import { basename, dirname, join, relative, sep } from "node:path"
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
 * @property {Set<string>} unreadableKeys keys whose value this reader could not read
 * @property {number[]} duplicates 1-based line numbers that repeat a key already set
 * @property {number} bodyStart 0-based index of the first body line
 */

const SPEC_KEYS = ["name", "description", "license", "compatibility", "metadata", "allowed-tools"]
const SKIP_DIRS = new Set([".git", "node_modules"])
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const QUOTED_RE = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*')\s*(?:#.*)?$/

/**
 * Yields every regular file under dir. Skips .git and node_modules. A symlinked
 * entry is already neither a file nor a directory as Node reports it, so the
 * walk declines it twice over below; the explicit isSymbolicLink() check exists
 * to state that intent at the point where a future edit, such as switching to a
 * recursive readdir or adding a call that resolves the target, would otherwise
 * reintroduce the fault. This matters because a repository may commit
 * .claude/skills and .agents/skills pointing at one real skills/ directory, and
 * following them would report every skill two or three times.
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
    // Node reports a symlink as neither a file nor a directory, so this is
    // usually redundant with the checks below; it stays explicit as a guard.
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
 * Strips a leading byte order mark and splits on a line ending that tolerates
 * a carriage return, the same split parseFrontmatter uses to compute
 * bodyStart. Any other code that measures line counts against bodyStart must
 * split the same way, or a CRLF file throws the two counts out of step.
 * @param {string} text
 * @returns {string[]}
 */
function splitLines(text) {
  return text.replace(/^\uFEFF/, "").split(/\r?\n/)
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
  const lines = splitLines(text)
  /** @type {Map<string,string>} */
  const entries = new Map()
  /** @type {number[]} */
  const unreadable = []
  /** @type {Set<string>} */
  const unreadableKeys = new Set()
  /** @type {number[]} */
  const duplicates = []
  if ((lines[0] ?? "").trimEnd() !== "---") {
    return { ok: false, reason: "missing", entries, unreadable, unreadableKeys, duplicates, bodyStart: 0 }
  }
  let end = -1
  for (let i = 1; i < lines.length; i++) {
    if ((lines[i] ?? "").trimEnd() === "---") {
      end = i
      break
    }
  }
  if (end === -1) {
    return { ok: false, reason: "unterminated", entries, unreadable, unreadableKeys, duplicates, bodyStart: 0 }
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
    if (entries.has(key) || unreadableKeys.has(key)) duplicates.push(i + 1)
    const raw = rest.trim()
    if (raw === "") {
      if (key === "metadata") {
        inMap = true
      }
      entries.set(key, "")
      unreadableKeys.delete(key)
      continue
    }
    if (/^[>|&*]/.test(raw)) {
      unreadable.push(i + 1)
      unreadableKeys.add(key)
      continue
    }
    let value
    if (raw.startsWith('"') || raw.startsWith("'")) {
      const quoted = raw.match(QUOTED_RE)
      value = quoted ? quoted[1] ?? raw : raw
    } else {
      value = raw.replace(/(^|\s)#.*$/, "")
    }
    entries.set(key, unquote(value))
    unreadableKeys.delete(key)
  }
  return { ok: true, reason: null, entries, unreadable, unreadableKeys, duplicates, bodyStart: end + 1 }
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
  for (const line of fm.duplicates) {
    warn(`line ${line} repeats a key already set; a strict YAML parser rejects a duplicate key`)
  }

  if (!fm.unreadableKeys.has("name")) {
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
  }

  if (!fm.unreadableKeys.has("description")) {
    const description = fm.entries.get("description")
    if (description === undefined || description === "") {
      err("frontmatter declares no description, which the specification requires")
    } else if (description.length > 1024) {
      err(`description is ${description.length} characters; the limit is 1024`)
    }
  }

  if (!fm.unreadableKeys.has("compatibility")) {
    const compatibility = fm.entries.get("compatibility")
    if (compatibility !== undefined && compatibility.length > 500) {
      err(`compatibility is ${compatibility.length} characters; the limit is 500`)
    }
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
 * R-SKL-01: skills live in a top-level skills/ directory, one per skill, and
 * no other SKILL.md exists in the repository.
 * @param {string} root
 * @param {string[]} skillFiles absolute paths, as found by findSkillFiles
 * @returns {Finding[]}
 */
export function checkLayout(root, skillFiles) {
  /** @type {Finding[]} */
  const out = []
  const skillsDir = join(root, "skills")
  if (!existsSync(skillsDir)) {
    out.push({
      severity: "error",
      rule: "R-SKL-01",
      file: `skills${sep}`,
      message: "no top-level skills/ directory; the skills CLI installer and every plugin loader read that path",
    })
  }
  for (const abs of skillFiles) {
    const rel = relative(root, abs)
    const parts = rel.split(sep)
    if (parts.length !== 3 || parts[0] !== "skills") {
      out.push({
        severity: "error",
        rule: "R-SKL-01",
        file: rel,
        message: "not a direct child of a top-level skills/<name>/ directory; move the whole skill directory under skills/",
      })
    }
  }
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (!existsSync(join(skillsDir, entry.name, "SKILL.md"))) {
        out.push({
          severity: "error",
          rule: "R-SKL-01",
          file: `skills${sep}${entry.name}${sep}`,
          message: "directory under skills/ holds no SKILL.md",
        })
      }
    }
  }
  return out
}

/**
 * R-SKL-03: the body loads into context whole, so it stays under 500 lines.
 * @param {string} rel
 * @param {string} text
 * @param {Frontmatter} fm
 * @returns {Finding[]}
 */
export function checkBody(rel, text, fm) {
  const bodyLines = splitLines(text).length - fm.bodyStart
  if (bodyLines < 500) return []
  return [
    {
      severity: "error",
      rule: "R-SKL-03",
      file: rel,
      message: `body is ${bodyLines} lines; keep it under 500 and move depth into that skill's references/ directory`,
    },
  ]
}

/**
 * @param {string} root
 * @returns {string|null} the opening text of the repository license file
 */
export function readRepoLicense(root) {
  for (const name of ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"]) {
    const path = join(root, name)
    if (existsSync(path)) return readFileSync(path, "utf8").slice(0, 400)
  }
  return null
}

/**
 * R-SKL-04: an installer copies one skill directory, so LICENSE stays behind.
 *
 * A missing field is an error. A field the license file does not name is a
 * warning, because license naming varies enough that a strict comparison
 * would report false failures. A license value this reader could not parse,
 * such as a block scalar, is skipped here too: checkSpec already warns about
 * the unreadable construct on that line, and the field is not actually
 * absent, so reporting it missing here would be a second, misleading finding
 * for the same cause.
 * @param {string} rel
 * @param {Frontmatter} fm
 * @param {string|null} repoLicense
 * @returns {Finding[]}
 */
export function checkLicense(rel, fm, repoLicense) {
  if (fm.unreadableKeys.has("license")) return []
  const value = fm.entries.get("license")
  if (value === undefined || value === "") {
    return [
      {
        severity: "error",
        rule: "R-SKL-04",
        file: rel,
        message: "frontmatter declares no license; an installer copies one skill directory and leaves the repository license behind",
      },
    ]
  }
  if (repoLicense && !repoLicense.toLowerCase().includes(value.toLowerCase())) {
    return [
      {
        severity: "warning",
        rule: "R-SKL-04",
        file: rel,
        message: `license "${value}" does not appear in the repository license file; confirm both name the same license`,
      },
    ]
  }
  return []
}

/**
 * @param {string} root
 * @returns {Finding[]}
 */
export function validate(root) {
  const skillFiles = findSkillFiles(root)
  const repoLicense = readRepoLicense(root)
  /** @type {Finding[]} */
  const out = [...checkLayout(root, skillFiles)]
  for (const abs of skillFiles) {
    const rel = relative(root, abs)
    const dir = dirname(abs)
    let text
    try {
      text = readFileSync(abs, "utf8")
    } catch {
      out.push({ severity: "warning", rule: null, file: rel, message: "could not read this file" })
      continue
    }
    const fm = parseFrontmatter(text)
    out.push(...checkSpec(rel, basename(dir), fm))
    out.push(...checkBody(rel, text, fm))
    out.push(...checkLicense(rel, fm, repoLicense))
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

/**
 * True when this file is the script the runtime was asked to run. Compares real
 * paths because a reader may link this file into their PATH, and resolve() is
 * lexical. import.meta.main landed in Node 24 and this file supports Node 22.
 * @returns {boolean}
 */
function isMain() {
  const invoked = process.argv[1]
  if (invoked === undefined) return false
  try {
    return realpathSync(invoked) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (isMain()) main()
