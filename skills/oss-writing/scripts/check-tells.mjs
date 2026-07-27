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
import { execFileSync } from "node:child_process"
import { readFileSync, realpathSync, statSync } from "node:fs"
import { basename, dirname, join, resolve, sep } from "node:path"
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
 * @property {RegExp} [match] Global, and safe to reuse: every scan resets lastIndex
 * @property {string} instead
 * @property {string[]} [rules] Rule IDs whose Check line names this pattern
 * @property {true} [heading] Checked by the heading reader rather than by match
 */

// A word after a heading's sentence start may be capitalized when it is one of
// these. Go and Actions are deliberately absent: both are ordinary English
// words, and allowlisting them buys a false negative on `## read the Actions
// log` to avoid a false positive a repository clears with one entry of its own.
export const DEFAULT_ALLOW = [
  "GitHub",
  "GitLab",
  "Node",
  "Bun",
  "Docker",
  "Markdown",
  "JavaScript",
  "TypeScript",
  "Python",
  "Ruby",
  "Rust",
  "Dependabot",
  "CodeQL",
]

// R-DOC-05 exempts a heading preserved from an attributed third-party code of
// conduct. Both signals are required: the filename alone would exempt a project
// that wrote its own, and the attribution alone would let any file in the audit
// set silence its heading check by naming the Contributor Covenant.
const CODE_OF_CONDUCT_SOURCES = [
  [/contributor covenant/i, /contributor-covenant\.org/i],
  [/citizen code of conduct/i, /stumptownsyndicate\.org|citizencodeofconduct\.org/i],
  [/django code of conduct/i, /djangoproject\.com/i],
]

// Setext headings, underlined with = or -, are out of scope. This repository
// and the Google style guide the skill cites both use ATX exclusively.
const ATX_RE = /^ {0,3}#{1,6}[ \t]+(.*)$/gm
const CLOSING_HASHES_RE = /[ \t]+#+[ \t]*$/
const WORD_RE = /\S+/g
const WRAPPING_RE = /^[[({"'*_]+|[\])}"'*_,.;:!?]+$/g
const CONFIG_FILE = ".oss-kit.json"

const LIST_RE = /^ {0,3}(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/
const QUOTE_RE = /^ {0,3}>/
const INDENT_RE = /^(?: {4}|\t)/

const BREAK_INSTEAD = "a period, a comma, a colon, or a pair of parentheses"

/**
 * A word with no legitimate use in technical prose. Every entry is an offence,
 * and every one is a row of references/tells.md.
 * @param {string} token
 * @param {RegExp} match
 * @param {string} instead
 * @returns {Pattern}
 */
function vocabulary(token, match, instead) {
  return { id: `word-${token.replace(/\W+/g, "-")}`, severity: "offence", token, match, instead }
}

/**
 * A word the token alone cannot decide: references/tells.md or SKILL.md
 * documents a legitimate use, or the same spelling has an ordinary technical
 * noun sense. Prints, and leaves the exit code alone.
 * @param {string} token
 * @param {RegExp} match
 * @param {string} instead
 * @param {string[]} [rules]
 * @returns {Pattern}
 */
function judgment(token, match, instead, rules) {
  const pattern = { id: `word-${token.replace(/\W+/g, "-")}`, severity: /** @type {Severity} */ ("suspicion"), token, match, instead }
  return rules ? { ...pattern, rules } : pattern
}

const PROMOTIONAL = "name the property the adjective is standing in for"
const R_DOC_05 = ["R-DOC-05"]

/** @type {Pattern[]} */
export const PATTERNS = [
  {
    id: "em-dash",
    severity: "offence",
    token: "em dash",
    match: /—/g,
    instead: BREAK_INSTEAD,
    rules: R_DOC_05,
  },
  {
    id: "en-dash",
    severity: "offence",
    token: "en dash",
    match: /–/g,
    instead: "a plain hyphen in a range, or a rewritten sentence",
    rules: R_DOC_05,
  },
  {
    id: "double-hyphen",
    severity: "offence",
    token: " -- ",
    match: / -- /g,
    instead: BREAK_INSTEAD,
  },
  {
    // \p{Emoji} matches the ASCII digits and #, which would report every
    // version number in a repository. Extended_Pictographic is the property
    // that means what a reader means by an emoji.
    id: "emoji",
    severity: "offence",
    token: "emoji",
    match: /\p{Extended_Pictographic}/gu,
    instead: "a word: their width and glyph vary by terminal and font",
    rules: R_DOC_05,
  },
  {
    id: "curly-quote",
    severity: "offence",
    token: "curly quotes",
    match: /[‘’“”]/g,
    instead: "a straight ASCII quote, which survives a copy-paste into a shell",
  },
  {
    // A colon inside or straight after the bold marks a label. A period marks a
    // claim, which SKILL.md allows, so `- **Fast.** 50% faster` does not match.
    //
    // `**Breaking:**` is exempt because R-CHG-01 requires it on every
    // incompatible changelog entry. Without the exemption the two rules
    // contradict each other and a correctly marked entry cannot be written.
    id: "inline-header-bullet",
    severity: "offence",
    token: "inline-header bullet",
    match: /^[ \t]*[-*+][ \t]+\*\*(?!Breaking:\*\*)[^*\n]*(?::\*\*|\*\*[ \t]*:)/gm,
    instead: "a sentence that makes the claim the label is standing in for",
  },
  {
    // Anchored to the start of a line, which is where a trailer sits. Mid
    // sentence the same words are ordinary prose: a site is generated with Astro.
    id: "generated-with",
    severity: "offence",
    token: "Generated with",
    match: /^[ \t]*\S{0,4}[ \t]*Generated with\b/gm,
    instead: "nothing: a trailer records who is accountable, and a tool cannot be",
  },
  {
    // The trailer key is matched without regard to case because git and GitHub
    // both write Co-authored-by, and the tell is the same one either way.
    id: "claude-trailer",
    severity: "offence",
    token: "Co-Authored-By: Claude",
    match: /co-authored-by:[^\n]*\bclaude\b/gi,
    instead: "nothing: a trailer records who is accountable, and a tool cannot be",
  },

  vocabulary("leverage", /\bleverag(?:e|es|ed|ing)\b/gi, "use"),
  vocabulary("utilize", /\butili[sz](?:e|es|ed|ing|ation)\b/gi, "use"),
  vocabulary("delve", /\bdelv(?:e|es|ed|ing)\b/gi, "look at, or read"),
  vocabulary("streamline", /\bstreamlin(?:e|es|ed|ing)\b/gi, "name what got shorter or faster"),
  vocabulary("facilitate", /\bfacilitat(?:e|es|ed|ing|ion)\b/gi, "the verb for what actually happens"),
  vocabulary("holistic", /\bholistic(?:ally)?\b/gi, "name the parts it covers"),
  vocabulary("obviate", /\bobviat(?:e|es|ed|ing)\b/gi, "removes the need for"),
  vocabulary("predicated on", /\bpredicated on\b/gi, "depends on, or assumes"),
  vocabulary("additionally", /\badditionally\b/gi, "and, or nothing"),
  vocabulary("furthermore", /\bfurthermore\b/gi, "and, or nothing"),
  vocabulary("pivotal", /\bpivotal\b/gi, "state the fact and stop"),
  vocabulary("testament to", /\btestament to\b/gi, "state the fact and stop"),
  vocabulary("boasts", /\bboast(?:s|ed|ing)?\b/gi, "is, has, or a precise verb"),
  vocabulary("best practices suggest", /\bbest practices suggest\b/gi, "name the source, or drop the claim"),
  vocabulary("it is widely believed", /\bit is widely believed\b/gi, "name the source, or drop the claim"),
  vocabulary("studies show", /\bstudies show\b/gi, "name the source, or drop the claim"),
  vocabulary("in order to", /\bin order to\b/gi, "to"),
  vocabulary("due to the fact that", /\bdue to the fact that\b/gi, "because"),
  vocabulary("has the ability to", /\bha(?:s|ve|d) the ability to\b/gi, "can"),
  vocabulary("it is important to note that", /\bit is important to note that\b/gi, "delete the phrase"),
  vocabulary("may potentially", /\bmay potentially\b/gi, "one modal, or none"),
  vocabulary("could possibly", /\bcould possibly\b/gi, "one modal, or none"),
  vocabulary("let's dive in", /\blet['’]s dive in\b/gi, "start with the content"),
  vocabulary("here's what you need to know", /\bhere['’]s what you need to know\b/gi, "start with the content"),
  vocabulary("this PR aims to", /\bthis (?:PR|MR|pull request|merge request) aims to\b/gi, "start with the content"),
  vocabulary("at its core", /\bat its core\b/gi, "just make the point"),
  vocabulary("fundamentally", /\bfundamentally\b/gi, "just make the point"),
  vocabulary("the real question is", /\bthe real question is\b/gi, "just make the point"),

  judgment("key", /\bkey\b/gi, "state the fact and stop, unless this is a cache key or an API key"),
  judgment("critical", /\bcritical\b/gi, "state the fact and stop, unless this is a critical section"),
  judgment("underscores", /\bunderscores\b/gi, "state the fact and stop"),
  judgment("serves as", /\bserves as\b/gi, "is, has, or a precise verb"),
  judgment("acts as", /\bacts as\b/gi, "is, has, or a precise verb"),
  judgment("features", /\bfeatures\b/gi, "is, has, or a precise verb"),
  judgment("ensuring", /,[ \t]*ensuring\b/gi, "split into a sentence, or cut"),
  judgment("enabling", /,[ \t]*enabling\b/gi, "split into a sentence, or cut"),
  judgment("allowing", /,[ \t]*allowing\b/gi, "split into a sentence, or cut"),
  judgment("robust", /\brobust\b/gi, PROMOTIONAL, R_DOC_05),
  judgment("powerful", /\bpowerful\b/gi, PROMOTIONAL, R_DOC_05),
  judgment("seamless", /\bseamless(?:ly)?\b/gi, PROMOTIONAL, R_DOC_05),
  judgment("comprehensive", /\bcomprehensive(?:ly)?\b/gi, PROMOTIONAL, R_DOC_05),
  judgment("blazing", /\bblazing(?:ly)?\b/gi, PROMOTIONAL, R_DOC_05),
  judgment("effortless", /\beffortless(?:ly)?\b/gi, PROMOTIONAL, R_DOC_05),
  judgment("elegant", /\belegant(?:ly)?\b/gi, PROMOTIONAL),
  judgment("rich", /\brich\b/gi, PROMOTIONAL),

  {
    id: "heading-case",
    severity: "offence",
    token: "sentence case",
    heading: true,
    instead: "lowercase the word, unless it is a proper noun the allowlist should carry",
    rules: R_DOC_05,
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
      const close = line.match(FENCE_CLOSE_RE)
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
  // split rather than spread. Spreading yields one element per code point, but
  // every offset here comes from `line.length` and from a regex `index`, which
  // count UTF-16 units. One emoji would put the two a slot apart, and from
  // there masking lands off its target: a fence stops being blanked and the
  // code inside it is scanned as prose.
  const chars = normalized.split("")
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
 * True when the file is a code of conduct that names a third-party document and
 * links its canonical home. Read from the source text rather than the masked
 * copy, because the attribution often carries its URL as a link reference.
 * @param {string} file
 * @param {string} text
 * @returns {boolean}
 */
function headingsPreserved(file, text) {
  if (basename(file) !== "CODE_OF_CONDUCT.md") return false
  return CODE_OF_CONDUCT_SOURCES.some(([name, url]) => name?.test(text) && url?.test(text))
}

/**
 * Every word of an ATX heading that is capitalized past the heading's sentence
 * start. The sentence start is the first word, or the word after a leading
 * label token: a first or second token ending in `:`, or a first token ending
 * in `.`. Without that rule the check reports this repository's own house
 * style, where a rule heading reads `### R-DOC-01: The README opens with one
 * sentence` and a procedural heading reads `## Step 1: Find STANDARD.md`.
 *
 * The label rule is a heuristic, so `## Note: See Appendix B` skips a word that
 * should have been checked. That direction of error is the right one: a missed
 * offence costs less than a checker somebody uninstalls.
 * @param {string} prose the masked text, so a hash inside a fence is not a heading
 * @param {Set<string>} allow
 * @returns {{index: number, word: string}[]}
 */
function headingOffences(prose, allow) {
  /** @type {{index: number, word: string}[]} */
  const out = []
  ATX_RE.lastIndex = 0
  for (const heading of prose.matchAll(ATX_RE)) {
    const raw = heading[1] ?? ""
    const content = raw.replace(CLOSING_HASHES_RE, "")
    const contentStart = heading.index + heading[0].length - raw.length
    const tokens = [...content.matchAll(WORD_RE)].map((token) => ({ text: token[0], index: contentStart + token.index }))

    let start = 0
    for (let i = 0; i < Math.min(2, tokens.length); i++) {
      const text = tokens[i]?.text ?? ""
      if (text.endsWith(":") || (i === 0 && text.endsWith("."))) {
        start = i + 1
        break
      }
    }

    for (let i = start + 1; i < tokens.length; i++) {
      const token = tokens[i]
      if (!token) continue
      const bare = token.text.replace(WRAPPING_RE, "")
      if (bare === "" || !/^[A-Z]/.test(bare)) continue
      if (/^[A-Z0-9]+$/.test(bare)) continue
      if (/[./]/.test(bare) || /\d/.test(bare)) continue
      if (allow.has(bare)) continue
      out.push({ index: token.index, word: bare })
    }
  }
  return out
}

/**
 * @typedef {object} ScanOptions
 * @property {Pattern[]} [patterns]
 * @property {boolean} [promote] Report every finding as an offence
 * @property {string[]} [allow] Proper nouns a heading may capitalize
 */

/**
 * @param {string} text
 * @param {string} file
 * @param {ScanOptions} [options]
 * @returns {Finding[]}
 */
export function scan(text, file, options = {}) {
  const patterns = options.patterns ?? PATTERNS
  const allow = new Set([...DEFAULT_ALLOW, ...(options.allow ?? [])])
  const prose = maskProse(text)
  const starts = lineStarts(prose)
  /** @type {Finding[]} */
  const findings = []
  /** @param {number} index @param {string} tell @param {Pattern} pattern */
  const add = (index, tell, pattern) => {
    const { line, col } = position(starts, index)
    findings.push({
      file,
      line,
      col,
      severity: options.promote ? "offence" : pattern.severity,
      tell,
      instead: pattern.instead,
    })
  }
  for (const pattern of patterns) {
    if (pattern.heading) {
      if (headingsPreserved(file, text)) continue
      for (const offence of headingOffences(prose, allow)) add(offence.index, offence.word, pattern)
      continue
    }
    if (!pattern.match) continue
    pattern.match.lastIndex = 0
    for (const hit of prose.matchAll(pattern.match)) {
      add(hit.index, hit[0].trim() === "" ? pattern.token : hit[0], pattern)
    }
  }
  return sortFindings(findings)
}

/**
 * The allowlist a repository declares in its own `.oss-kit.json`, under the
 * `oss-writing` key. Malformed JSON throws rather than falling back to the
 * defaults, because a silently ignored configuration file scores a repository
 * differently from the one its author was reading.
 * @param {string} path
 * @returns {string[]}
 */
export function readConfigAllow(path) {
  let text
  try {
    text = readFileSync(path, "utf8")
  } catch {
    return []
  }
  let config
  try {
    config = JSON.parse(text)
  } catch {
    throw new Error(`${path} is not valid JSON`)
  }
  const allow = config?.["oss-writing"]?.allow
  if (allow === undefined) return []
  if (!Array.isArray(allow) || allow.some((entry) => typeof entry !== "string")) {
    throw new Error(`${path}: oss-writing.allow must be an array of strings`)
  }
  return allow
}

/**
 * Walks up from dir looking for `.oss-kit.json`, so a hook running against one
 * file still finds the repository's own allowlist.
 *
 * The walk stops at the repository root, the directory holding `.git`. A
 * repository's allowlist decides what counts as an offence, so one lying above
 * the checkout would let a directory nobody in the repository can see change
 * how the repository scores.
 * @param {string} dir
 * @returns {string|null}
 */
export function findConfig(dir) {
  let current = resolve(dir)
  for (;;) {
    const candidate = join(current, CONFIG_FILE)
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      // Nothing at that path. Fall through to the parent.
    }
    try {
      if (statSync(join(current, ".git"))) return null
    } catch {
      // Not the repository root. Keep walking.
    }
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

/**
 * Ordered by code point rather than by locale, because an auditor scoring the
 * same repository twice has to get the same bytes both times.
 * @param {Finding[]} findings
 * @returns {Finding[]}
 */
export function sortFindings(findings) {
  const order = (/** @type {string} */ a, /** @type {string} */ b) => (a < b ? -1 : a > b ? 1 : 0)
  return findings.sort((a, b) => order(a.file, b.file) || a.line - b.line || a.col - b.col || order(a.tell, b.tell))
}

/**
 * @param {Finding} finding
 * @returns {string}
 */
export function formatFinding(finding) {
  return `${finding.file}:${finding.line}:${finding.col}  ${finding.severity}  ${finding.tell}  ->  ${finding.instead}`
}

// The file set of every rule this script can score, as repository-relative
// paths. R-DOC-05's pattern set is the entries of PATTERNS that carry its ID.
const RULES = {
  "R-DOC-05": /^(?:README\.md|CONTRIBUTING\.md|SECURITY\.md|CODE_OF_CONDUCT\.md|CHANGELOG\.md|docs\/.+\.md)$/,
}

/**
 * Markdown git tracks under root, or null outside a git checkout. Reading git
 * rather than the filesystem is what keeps the mode off ignored and untracked
 * paths, which is where a repository keeps material its own standard excludes.
 * @param {string} root
 * @returns {string[]|null}
 */
function trackedMarkdown(root) {
  try {
    const listed = execFileSync("git", ["-C", root, "ls-files", "-z", "--", "*.md"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    return listed.split("\0").filter((path) => path !== "")
  } catch {
    return null
  }
}

/**
 * The rule's file set under root, as repository-relative paths, sorted, or null
 * outside a git checkout. readdir order is not stable across platforms, and the
 * same audit run twice has to produce the same output.
 *
 * There is deliberately no filesystem fallback. Walking the tree would report a
 * file the repository ignores, so the same tree would score one way inside a
 * checkout and another way outside it, which is the disagreement this mode
 * exists to prevent. Without git the honest answer is that the rule is unknown.
 * @param {string} root
 * @param {keyof typeof RULES} rule
 * @returns {string[]|null}
 */
export function ruleFiles(root, rule) {
  const pattern = RULES[rule]
  const listed = trackedMarkdown(root)
  if (listed === null) return null
  return listed
    .map((path) => path.split(sep).join("/"))
    .filter((path) => pattern.test(path))
    .sort()
}

/**
 * A changelog with everything but its entry text blanked: the preamble above
 * the first `##` heading, every heading line, and the link reference
 * definitions at the foot. Blanking keeps each remaining offset equal to the
 * source, so a finding still names the line a reader sees.
 * @param {string} text
 * @returns {string}
 */
export function changelogEntries(text) {
  let started = false
  return text
    .split("\n")
    .map((line) => {
      const blanked = " ".repeat(line.length)
      if (/^#{1,6}[ \t]/.test(line)) {
        if (/^##[ \t]/.test(line)) started = true
        return blanked
      }
      if (!started || /^\[[^\]]+\]:[ \t]/.test(line)) return blanked
      return line
    })
    .join("\n")
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
  /** @type {string[]} */
  const paths = []
  /** @type {string[]} */
  const allow = []
  /** @type {string|null} */
  let ruleId = null
  let flags = true
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? ""
    if (arg === "") continue
    if (flags && arg === "--") {
      flags = false
      continue
    }
    if (flags && (arg === "--allow" || arg.startsWith("--allow="))) {
      const value = arg.startsWith("--allow=") ? arg.slice("--allow=".length) : argv[++i]
      if (value === undefined) {
        process.stderr.write("--allow needs a comma-separated list of words\n")
        return 2
      }
      allow.push(...value.split(",").filter((word) => word !== ""))
      continue
    }
    if (flags && (arg === "--rule" || arg.startsWith("--rule="))) {
      const value = arg.startsWith("--rule=") ? arg.slice("--rule=".length) : argv[++i]
      if (value === undefined) {
        process.stderr.write(`--rule needs a rule ID, one of ${Object.keys(RULES).join(", ")}\n`)
        return 2
      }
      ruleId = value
      continue
    }
    if (flags && arg !== "-" && arg.startsWith("-")) {
      process.stderr.write(`unknown option ${arg}\n`)
      return 2
    }
    paths.push(arg)
  }

  /** @type {Finding[]} */
  const findings = []

  if (ruleId !== null) {
    if (!(ruleId in RULES)) {
      process.stderr.write(`unknown rule ${ruleId}; this script implements ${Object.keys(RULES).join(", ")}\n`)
      return 2
    }
    if (allow.length > 0) {
      // Two auditors passing different flags would otherwise score the same
      // repository differently, which is the failure R-DOC-05 exists to prevent.
      process.stderr.write(`--allow is not accepted in --rule mode; declare the words in ${CONFIG_FILE} at the repository root\n`)
      return 2
    }
    if (paths.length > 1) {
      process.stderr.write("--rule takes at most one repository root\n")
      return 2
    }
    const root = paths[0] ?? "."
    let configured
    try {
      configured = readConfigAllow(join(root, CONFIG_FILE))
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      return 2
    }
    const rule = /** @type {keyof typeof RULES} */ (ruleId)
    const patterns = PATTERNS.filter((pattern) => pattern.rules?.includes(rule))
    const files = ruleFiles(root, rule)
    if (files === null) {
      process.stderr.write(`${root} is not a git checkout; ${rule} evidence comes from git ls-files, so the rule is unknown here\n`)
      return 2
    }
    if (files.length === 0) {
      // A silent exit 0 reads as a clean pass. It is not one: the rule found
      // nothing to check, and an auditor scoring on that would report a pass
      // with no evidence behind it.
      process.stderr.write(`no file in ${rule}'s set is tracked under ${root}; nothing was checked\n`)
    }
    for (const rel of files) {
      let text
      try {
        text = readFileSync(join(root, rel), "utf8")
      } catch {
        process.stderr.write(`could not read ${rel}\n`)
        return 2
      }
      if (rel === "CHANGELOG.md") text = changelogEntries(text)
      findings.push(...scan(text, rel, { patterns, promote: true, allow: configured }))
    }
    for (const finding of findings) {
      process.stdout.write(`${formatFinding(finding)}\n`)
    }
    return findings.length > 0 ? 1 : 0
  }

  if (paths.length === 0) {
    process.stderr.write("usage: check-tells.mjs [--allow Word,Word] <file>... | - | --rule R-DOC-05 [root]\n")
    return 2
  }

  let configured
  try {
    const config = findConfig(process.cwd())
    configured = config === null ? [] : readConfigAllow(config)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    return 2
  }

  for (const path of paths) {
    let text
    try {
      text = readInput(path)
    } catch {
      process.stderr.write(`could not read ${path}\n`)
      return 2
    }
    findings.push(...scan(text, path === "-" ? "<stdin>" : path, { allow: [...configured, ...allow] }))
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
