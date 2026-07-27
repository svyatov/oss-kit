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
import { basename, dirname, extname, join, relative, sep } from "node:path"
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

// A distinctive phrase from each license's standard text, for identifiers whose
// own name does not appear in that text. An identifier absent from this table
// and absent from the file draws no finding: telling a project its own license
// is wrong is worse than staying quiet about one this table does not know.
const LICENSE_MARKERS = new Map([
  ["apache-2.0", "apache license"],
  ["bsd-2-clause", "redistributions of source code must retain"],
  ["bsd-3-clause", "neither the name of the copyright holder"],
  ["gpl-2.0", "gnu general public license"],
  ["gpl-3.0", "gnu general public license"],
  ["lgpl-3.0", "gnu lesser general public license"],
  ["agpl-3.0", "gnu affero general public license"],
  ["mpl-2.0", "mozilla public license"],
  ["isc", "isc license"],
  ["unlicense", "this is free and unencumbered software"],
])

// Public and legacy built-ins present at the Node 22 floor. Keep this fixed:
// reading the running runtime's list would let Node 24+ or Bun-specific
// modules pass even though a Node 22 reader cannot import them.
const NODE_22_BUILTINS = [
  "assert",
  "assert/strict",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "dns/promises",
  "domain",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "inspector/promises",
  "module",
  "net",
  "os",
  "path",
  "path/posix",
  "path/win32",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "readline/promises",
  "repl",
  "stream",
  "stream/consumers",
  "stream/promises",
  "stream/web",
  "string_decoder",
  "sys",
  "timers",
  "timers/promises",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "util/types",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
]
const BUILTINS = new Set([
  ...NODE_22_BUILTINS,
  ...NODE_22_BUILTINS.map((name) => `node:${name}`),
  // Built-ins Node exposes only under the node: prefix, so they cannot go in
  // the list above. node:sea arrived in v21.7.0 and needs no flag to import.
  // node:sqlite arrived in v22.5.0 and left --experimental-sqlite in v22.13.0,
  // below the 22.23.1 that ubuntu-24.04 ships.
  "node:sea",
  "node:sqlite",
  "node:test",
  "node:test/reporters",
])
const MANIFESTS = [
  "package.json",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "deno.json",
  "deno.jsonc",
  "deno.lock",
]
const CODE_EXTENSIONS = new Set([".js", ".mjs", ".cjs"])
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".mts", ".cts"])
// Documentation and data a script's directory may carry alongside it. A file
// with no extension is a script, not data, and stays in scope for the shebang
// check below.
const DATA_EXTENSIONS = new Set([".md", ".txt", ".json", ".yml", ".yaml", ".toml", ".csv"])
// The interpreter may be named directly, at any path, or through env. The -S
// flag is how a portable shebang passes arguments through env, so a script
// written as env -S node --flag names node just as plainly as env node does.
const SHEBANG_RE = /^#!\s*(?:\S*\/)?(?:env\s+(?:-S\s+)?)?(?:sh|node)(?:\s|$)/
// This guard stops the pattern from matching a property access on some other
// identifier that merely ends in a runtime name, such as `myBun.trim()`. It
// does not stop every false match: the same runtime name inside a string or a
// comment, followed by a dot, is still reported, because a shipped script has
// no legitimate reason to write that text either.
const RUNTIME_GLOBAL_RE = /(?<![\w$.'"`])(Bun|Deno)[^\S\n]*(?:\?\.|\.|\[)/
// A module namespace only one runtime provides. Checked before the built-in set
// below, because that set reflects whichever runtime is running this file, and a
// runtime that ships its own modules lists them there as though they were Node's.
const RUNTIME_MODULE_RE = /^(?:bun|deno)(?::|$)/
const SPECIFIER_RE = /\b(?:from|require|import)\s*\(?\s*["']([^"']+)["']/g
// A specifier contains no whitespace and none of the characters a regex
// literal or a shell string brings with it. A capture that fails this test is
// prose the specifier scan misread, not a dependency.
const SPECIFIER_SHAPE_RE = /^[^\s"'()*<>|?]+$/
const UNREADABLE_FILE_MESSAGE = "could not read this file"

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
 * Yields every directory under dir, including one named node_modules, which
 * walk() skips. R-SKL-05 bans that directory, so the check has to be able to
 * see it. Does not descend into a directory it reports, since one finding for a
 * vendored tree is enough.
 * @param {string} dir
 * @returns {Generator<string>}
 */
function* walkDirs(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink() || !entry.isDirectory()) continue
    if (entry.name === ".git") continue
    const path = join(dir, entry.name)
    yield path
    if (entry.name !== "node_modules") yield* walkDirs(path)
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
 * a carriage return. Both parseFrontmatter and checkBody call this one
 * function, so the frontmatter reader and the body-size check share a single
 * definition of a line and can never disagree about where one ends.
 * @param {string} text
 * @returns {string[]}
 */
function splitLines(text) {
  return text.replace(/^\uFEFF/, "").split(/\r?\n/)
}

/**
 * @param {string[]} lines result of splitLines
 * @returns {number} lines.length, minus one when a trailing newline in the
 *   source text left a trailing empty element
 */
function countLines(lines) {
  return lines.at(-1) === "" ? lines.length - 1 : lines.length
}

/**
 * @param {string} value
 * @returns {string|null}
 */
function unquote(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
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
      if (!quoted) {
        unreadable.push(i + 1)
        unreadableKeys.add(key)
        continue
      }
      value = unquote(quoted[1] ?? raw)
      if (value === null) {
        unreadable.push(i + 1)
        unreadableKeys.add(key)
        continue
      }
    } else {
      value = raw.replace(/(^|\s)#.*$/, "")
    }
    entries.set(key, value)
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
 * Real path of the top-level skills directory, or null when there is none.
 * Resolved because a repository may keep the real directory elsewhere and
 * commit skills/ as a symlink to it, which R-SKL-01 permits.
 * @param {string} root
 * @returns {string|null}
 */
function realSkillsDir(root) {
  try {
    return realpathSync(join(root, "skills"))
  } catch {
    return null
  }
}

/**
 * True when abs is <skills>/<name>/SKILL.md, comparing real paths so a
 * symlinked skills directory matches its target.
 * @param {string} abs
 * @param {string|null} realSkills
 * @returns {boolean}
 */
function isSkillOfDir(abs, realSkills) {
  if (realSkills === null) return false
  try {
    return realpathSync(dirname(dirname(abs))) === realSkills
  } catch {
    return false
  }
}

/**
 * R-SKL-01: skills live in a top-level skills/ directory, one per skill, and
 * no other SKILL.md exists in the repository. A repository with no SKILL.md
 * anywhere ships no skills, so the whole SKL area is out of scope for it and
 * this returns no findings rather than guessing at a directory it should have.
 * @param {string} root
 * @param {string[]} skillFiles absolute paths, as found by findSkillFiles
 * @returns {Finding[]}
 */
export function checkLayout(root, skillFiles) {
  if (skillFiles.length === 0) return []
  const realSkills = realSkillsDir(root)
  /** @type {import("node:fs").Dirent[]|null} */
  let entries
  try {
    entries = realSkills === null ? null : readdirSync(realSkills, { withFileTypes: true })
  } catch {
    entries = null
  }
  /** @type {Finding[]} */
  const out = []
  if (realSkills === null || entries === null) {
    out.push({
      severity: "error",
      rule: "R-SKL-01",
      file: `skills${sep}`,
      message: "no top-level skills/ directory; the skills CLI installer and every plugin loader read that path",
    })
    return out
  }
  for (const abs of skillFiles) {
    if (isSkillOfDir(abs, realSkills)) continue
    out.push({
      severity: "error",
      rule: "R-SKL-01",
      file: relative(root, abs),
      message: "not a direct child of a top-level skills/<name>/ directory; move the whole skill directory under skills/",
    })
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (!existsSync(join(realSkills, entry.name, "SKILL.md"))) {
      out.push({
        severity: "error",
        rule: "R-SKL-01",
        file: `skills${sep}${entry.name}${sep}`,
        message: "directory under skills/ holds no SKILL.md",
      })
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
  const bodyLines = countLines(splitLines(text)) - fm.bodyStart
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
  for (const name of [
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt",
    "COPYING",
    "LICENCE",
    "COPYING.txt",
    "COPYING.md",
    "LICENSE.rst",
    "LICENSE-MIT",
  ]) {
    try {
      return readFileSync(join(root, name), "utf8").slice(0, 400)
    } catch {
      // try the next candidate
    }
  }
  return null
}

/**
 * @param {string} value declared license identifier
 * @returns {string} lower-cased, with a trailing -or-later, -only, or + removed
 */
function normalizeLicenseId(value) {
  return value.toLowerCase().replace(/(-or-later|-only|\+)$/, "")
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
  if (!repoLicense) return []
  const text = repoLicense.toLowerCase()
  const id = normalizeLicenseId(value)
  if (text.includes(id)) return []
  const marker = LICENSE_MARKERS.get(id)
  if (marker === undefined) return []
  if (text.includes(marker)) return []
  return [
    {
      severity: "warning",
      rule: "R-SKL-04",
      file: rel,
      message: `license "${value}" does not appear in the repository license file; confirm both name the same license`,
    },
  ]
}

/**
 * Removes block and line comments so prose in a comment is not read as an
 * import. A protocol-relative or absolute URL inside a string literal can be
 * truncated by the line-comment pass, which at worst loses an import on that
 * line and never invents one.
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

/**
 * R-SKL-05: a shipped script uses sh or Node, with no dependencies.
 *
 * The specifier scan runs against a comment-stripped copy of the source, so
 * prose that merely reads like an import statement is not reported. A
 * commented-out import is stripped along with the comment that carries it, so
 * it no longer draws a finding either: a line the author commented out is not
 * a dependency the skill ships.
 * @param {string} root
 * @param {string} skillDir absolute path of the skill directory
 * @returns {Finding[]}
 */
export function checkScripts(root, skillDir) {
  /** @type {Finding[]} */
  const out = []
  /**
   * @param {string} path
   * @param {string} message
   */
  const err = (path, message) => out.push({ severity: "error", rule: "R-SKL-05", file: relative(root, path), message })

  for (const path of walk(skillDir)) {
    if (MANIFESTS.includes(basename(path))) {
      err(path, "a skill ships no manifest and no lockfile; its scripts run with no install step")
    }
  }
  for (const path of walkDirs(skillDir)) {
    if (basename(path) === "node_modules") {
      err(path, "a skill ships no node_modules; its scripts use only Node built-in modules")
    }
  }

  const scriptsDir = join(skillDir, "scripts")
  if (!existsSync(scriptsDir)) return out

  for (const path of walk(scriptsDir)) {
    const extension = extname(path)
    const isData = DATA_EXTENSIONS.has(extension)
    let source
    try {
      source = readFileSync(path, "utf8")
    } catch {
      out.push({ severity: "warning", rule: null, file: relative(root, path), message: UNREADABLE_FILE_MESSAGE })
      continue
    }
    if (!isData && !SHEBANG_RE.test(source)) {
      err(path, "no shebang naming sh or node; a reader's machine may have no other interpreter")
    }
    if (TYPESCRIPT_EXTENSIONS.has(extension)) {
      err(path, "TypeScript is not portable to the Node 22 floor; ship JavaScript instead")
      continue
    }
    if (!CODE_EXTENSIONS.has(extension)) continue
    const runtime = source.match(RUNTIME_GLOBAL_RE)
    if (runtime?.[1]) {
      err(path, `uses the ${runtime[1]} runtime global; a shipped script runs under whatever the reader already has`)
    }
    const withoutComments = stripComments(source)
    for (const match of withoutComments.matchAll(SPECIFIER_RE)) {
      const specifier = match[1] ?? ""
      if (!SPECIFIER_SHAPE_RE.test(specifier)) continue
      if (specifier.startsWith(".") || specifier.startsWith("/")) continue
      if (RUNTIME_MODULE_RE.test(specifier)) {
        err(path, `imports "${specifier}", which is a module only one runtime provides; a skill ships no dependencies`)
        continue
      }
      if (BUILTINS.has(specifier)) continue
      err(path, `imports "${specifier}", which is not a Node built-in module; a skill ships no dependencies`)
    }
  }
  return out
}

/**
 * @param {string} root
 * @returns {Finding[]}
 */
export function validate(root) {
  const skillFiles = findSkillFiles(root)
  const repoLicense = readRepoLicense(root)
  const realSkills = realSkillsDir(root)
  /** @type {Finding[]} */
  const out = [...checkLayout(root, skillFiles)]
  for (const abs of skillFiles) {
    // A file outside skills/<name>/ already drew its whole and correct
    // report from checkLayout above; running the per-skill checks on it too
    // would compare it against a directory it does not belong to.
    if (!isSkillOfDir(abs, realSkills)) continue
    const rel = relative(root, abs)
    const dir = dirname(abs)
    let text
    try {
      text = readFileSync(abs, "utf8")
    } catch {
      out.push({ severity: "warning", rule: null, file: rel, message: UNREADABLE_FILE_MESSAGE })
      continue
    }
    const fm = parseFrontmatter(text)
    out.push(...checkSpec(rel, basename(dir), fm))
    out.push(...checkBody(rel, text, fm))
    out.push(...checkLicense(rel, fm, repoLicense))
    out.push(...checkScripts(root, dir))
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
