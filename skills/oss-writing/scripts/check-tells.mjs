#!/usr/bin/env node
// @ts-check
/**
 * Reports the mechanical prose tells the oss-writing skill names: the ones a
 * fixed vocabulary or a character class decides. The patterns that need
 * judgment, such as passive voice and elegant variation, stay in the skill body
 * for a reader to apply.
 *
 * Reads files. Writes nothing and makes no network call.
 *
 * Runs on Node 22 or later and on Bun, with nothing installed. Imports only
 * Node built-in modules and uses no runtime-specific global, because a skill
 * ships to whatever the reader already has. R-SKL-05 says the same thing, and
 * this file is held to it.
 */
import { readFileSync, realpathSync } from "node:fs"
import { fileURLToPath } from "node:url"

/**
 * @typedef {"offence"|"suspicion"} Severity
 */

/**
 * @typedef {object} Finding
 * @property {string} file Path as it was given, or <stdin>
 * @property {number} line 1-based
 * @property {number} col 1-based
 * @property {Severity} severity
 * @property {string} tell The text found, or the rule that found it
 * @property {string} instead What to write instead
 */

/**
 * @typedef {object} Pattern
 * @property {string} id
 * @property {Severity} severity
 * @property {string} token The catalog wording, for the drift test to find
 * @property {RegExp} match Global, and safe to reuse: every scan resets lastIndex
 * @property {string} instead
 */

const LIST_RE = /^ {0,3}(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/
const QUOTE_RE = /^ {0,3}>/
const INDENT_RE = /^(?: {4}|\t)/

/** @type {Pattern[]} */
export const PATTERNS = [
  {
    id: "em-dash",
    severity: "offence",
    token: "em dash",
    match: /—/g,
    instead: "a period, a comma, a colon, or a pair of parentheses",
  },
  {
    id: "en-dash",
    severity: "offence",
    token: "en dash",
    match: /–/g,
    instead: "a plain hyphen in a range, or a rewritten sentence",
  },
  {
    id: "double-hyphen",
    severity: "offence",
    token: " -- ",
    match: / -- /g,
    instead: "a period, a comma, a colon, or a pair of parentheses",
  },
]

/**
 * Replaces every character of a range with a space, leaving newlines in place
 * so a later offset still resolves to its true line and column.
 * @param {string[]} chars
 * @param {number} start
 * @param {number} end exclusive
 */
function blank(chars, start, end) {
  for (let i = start; i < end; i++) {
    if (chars[i] !== "\n") chars[i] = " "
  }
}

/**
 * Masks fenced blocks, indented code blocks, and block quotes, line by line.
 *
 * The list rule is a heuristic, not a CommonMark parser: a four-space indent
 * under a list item is a continuation paragraph rather than a code block, so
 * masking it blind would stop checking real prose and return a false clean.
 * Erring toward prose is the safe direction, since the worst case is a finding
 * inside something that turns out to be code, which a reader can see.
 * @param {string[]} chars
 * @param {string[]} lines
 */
function maskBlocks(chars, lines) {
  let offset = 0
  /** @type {{char: string, len: number}|null} */
  let fence = null
  let inList = false
  let inCode = false
  let prevBlank = true
  for (const line of lines) {
    const start = offset
    const end = offset + line.length
    offset = end + 1
    const isBlank = line.trim() === ""

    if (fence) {
      blank(chars, start, end)
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/)
      if (close?.[1] && close[1][0] === fence.char && close[1].length >= fence.len) fence = null
      prevBlank = false
      continue
    }
    if (isBlank) {
      prevBlank = true
      continue
    }

    const open = line.match(FENCE_RE)
    if (open?.[1]) {
      fence = { char: open[1][0] ?? "`", len: open[1].length }
      blank(chars, start, end)
      inCode = false
      prevBlank = false
      continue
    }
    if (QUOTE_RE.test(line)) {
      blank(chars, start, end)
      inCode = false
      prevBlank = false
      continue
    }
    if (INDENT_RE.test(line)) {
      if (!inList && (inCode || prevBlank)) {
        blank(chars, start, end)
        inCode = true
      }
      prevBlank = false
      continue
    }

    inCode = false
    if (prevBlank) inList = false
    if (LIST_RE.test(line)) inList = true
    prevBlank = false
  }
}

/**
 * Masks inline code spans, including one wrapped across a line break. A span
 * opens on a run of backticks and closes on the next run of the same length; a
 * run with no partner is literal text. A blank line ends the search, which is
 * what CommonMark says and what stops one stray backtick from masking the rest
 * of the document.
 * @param {string[]} chars
 * @param {string} text the block-masked text, so a fence's own backticks are gone
 */
function maskSpans(chars, text) {
  /** @type {{index: number, len: number}[]} */
  const runs = []
  for (const run of text.matchAll(/`+/g)) {
    runs.push({ index: run.index, len: run[0].length })
  }
  for (let i = 0; i < runs.length; i++) {
    const open = runs[i]
    if (!open) continue
    for (let j = i + 1; j < runs.length; j++) {
      const close = runs[j]
      if (!close || close.len !== open.len) continue
      const between = text.slice(open.index + open.len, close.index)
      if (/\n[ \t]*\n/.test(between)) break
      blank(chars, open.index, close.index + close.len)
      i = j
      break
    }
  }
}

/**
 * The text with everything the checker must not report on replaced by spaces.
 * Blanking rather than deleting keeps every offset equal to the source, so a
 * finding's line and column are the ones a reader sees in their editor.
 * @param {string} text
 * @returns {string}
 */
export function maskProse(text) {
  const normalized = text.replace(/\r\n/g, "\n")
  const chars = [...normalized]
  maskBlocks(chars, normalized.split("\n"))
  const blocked = chars.join("")
  maskSpans(chars, blocked)
  return chars.join("")
}

/**
 * @param {string} text
 * @returns {number[]} offset of the first character of each line
 */
function lineStarts(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") starts.push(i + 1)
  }
  return starts
}

/**
 * @param {number[]} starts
 * @param {number} offset
 * @returns {{line: number, col: number}}
 */
function position(starts, offset) {
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if ((starts[mid] ?? 0) <= offset) low = mid
    else high = mid - 1
  }
  return { line: low + 1, col: offset - (starts[low] ?? 0) + 1 }
}

/**
 * @typedef {object} ScanOptions
 * @property {Pattern[]} [patterns]
 * @property {boolean} [promote] Report every finding as an offence
 */

/**
 * @param {string} text
 * @param {string} file
 * @param {ScanOptions} [options]
 * @returns {Finding[]}
 */
export function scan(text, file, options = {}) {
  const patterns = options.patterns ?? PATTERNS
  const prose = maskProse(text)
  const starts = lineStarts(prose)
  /** @type {Finding[]} */
  const findings = []
  for (const pattern of patterns) {
    pattern.match.lastIndex = 0
    for (const hit of prose.matchAll(pattern.match)) {
      const { line, col } = position(starts, hit.index)
      findings.push({
        file,
        line,
        col,
        severity: options.promote ? "offence" : pattern.severity,
        tell: hit[0].trim() === "" ? pattern.token : hit[0],
        instead: pattern.instead,
      })
    }
  }
  return sortFindings(findings)
}

/**
 * @param {Finding[]} findings
 * @returns {Finding[]}
 */
export function sortFindings(findings) {
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col || a.tell.localeCompare(b.tell))
}

/**
 * @param {Finding} finding
 * @returns {string}
 */
export function formatFinding(finding) {
  return `${finding.file}:${finding.line}:${finding.col}  ${finding.severity}  ${finding.tell}  ->  ${finding.instead}`
}

/**
 * @param {string} path a file path, or - for standard input
 * @returns {string}
 */
function readInput(path) {
  return path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8")
}

/**
 * @param {string[]} argv
 * @returns {number} the process exit code
 */
export function main(argv) {
  const paths = argv.filter((arg) => arg !== "")
  if (paths.length === 0) {
    process.stderr.write("usage: check-tells.mjs <file>... | -\n")
    return 2
  }
  /** @type {Finding[]} */
  const findings = []
  for (const path of paths) {
    let text
    try {
      text = readInput(path)
    } catch {
      process.stderr.write(`could not read ${path}\n`)
      return 2
    }
    findings.push(...scan(text, path === "-" ? "<stdin>" : path))
  }
  for (const finding of findings) {
    process.stdout.write(`${formatFinding(finding)}\n`)
  }
  return findings.some((finding) => finding.severity === "offence") ? 1 : 0
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

if (isMain()) process.exitCode = main(process.argv.slice(2))
