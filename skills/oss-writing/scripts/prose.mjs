#!/usr/bin/env node
// Reports the mechanically decidable half of this skill. Everything here is a
// rule references/linting.md lists under "What a checker can decide"; nothing
// under "What a checker cannot decide" is attempted, because a rule that fires
// on correct prose gets the whole linter turned off.
//
// Runs on Node 22 or later, and under Bun, with nothing installed. It reads
// files and imports node: built-ins only.

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

// R-DOC-05 names six promotional words. The house style bans more, in
// references/linting.md. The six are the default tier so an audit scoring
// R-DOC-05 gets that rule and no other opinion.
const RULE_WORDS = ["robust", "powerful", "seamless", "comprehensive", "blazing", "effortless"]

const HOUSE_WORDS = [
  "utilize", "leverage", "make use of", "in order to", "due to the fact that",
  "in the event that", "at this point in time", "a number of", "facilitate",
  "functionality", "delve", "obviate", "predicated on", "holistic", "elegant",
  "rich", "seamlessly", "blazingly fast", "streamline", "additionally",
  "furthermore", "ensuring", "enabling", "allowing", "it is important to note",
  "it's worth noting that", "please note", "best practices suggest",
  "studies show", "very", "simply", "just", "easily", "of course", "serves as",
  "acts as", "boasts", "currently", "presently", "at present", "as of this writing",
]

// A Title Case heading capitalizes proper nouns too, so the check needs to know
// which words carry a capital on their own. A false positive means a term is
// missing here; add it or pass --proper with a file of one term per line.
const PROPER = `
GitHub Actions|GitHub Copilot CLI|GitHub Copilot|GitLab CI|Keep a Changelog|
Semantic Versioning|Code Owners|Kimi Code CLI|Kimi Code|
Conventional Commits|Trusted Publishing|Maven Central|Rust|Ruby|Python|Node|
Claude|
Bundler|Cargo|Gradle|Composer|Dependabot|Renovate|CodeQL|OpenSSF|Scorecard|
GitHub|GitLab|RubyGems|PyPI|npm|NuGet|Hex|Packagist|Docker|Sigstore|OIDC|SPDX|
CycloneDX|SBOM|MIT|Apache|BSD|README|CI|CD|API|URL|SHA|YAML|JSON|Markdown|
Vale|MFA|SemVer|Unreleased|Added|Changed|Deprecated|Removed|Fixed|Security|
Claude Code|VS Code|Kimi Code CLI|Cursor|Codex|Agent Skills|Pages|Discussions
`.split("|").map((s) => s.trim()).filter(Boolean)

const STOPWORDS = new Set(["a", "an", "the", "of", "to", "in", "for", "and", "or",
  "with", "on", "at", "by", "from", "as", "is", "it", "that", "this", "its", "not"])

// Keep line and column positions honest: blank out fenced blocks and inline
// code rather than deleting them. This is the skill's own exception, that
// quoted code, output, and config are reproduced verbatim, and it is also why
// a rule may name the pattern it forbids inside backticks.
function proseOnly(text) {
  const lines = text.split("\n")
  let fenced = false
  return lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return "" }
    if (fenced) return ""
    return line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length))
  })
}

function headingFindings(line, lineNo, proper) {
  const m = /^(#{1,6})\s+(.*)$/.exec(line)
  if (!m) return []
  let text = m[2].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim()
  // A leading ordinal is not the heading's first word. Without this, "### 1.
  // Title" drops "1." and reads "Title" as a capitalized non-first word.
  text = text.replace(/^\d+[.)]\s+/, "")
  if (!text) return []
  for (const term of proper) text = text.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "")
  // A colon opens a new clause, whose first word may be capitalized in
  // sentence case. Drop the first word of every clause, not just of the
  // heading, or "Step 6: Report" reads as Title Case.
  const words = text.split(/:\s+/)
    .flatMap((clause) => clause.split(/\s+/).filter(Boolean).slice(1))
    .filter((w) => !STOPWORDS.has(w.toLowerCase()))
    .filter((w) => /[A-Za-z]/.test(w))
    .filter((w) => !/[./\\@]/.test(w))
    .filter((w) => !/^[A-Z0-9]+$/.test(w))
  if (words.length === 0) return []
  if (!words.every((w) => /^[A-Z]/.test(w))) return []
  return [{ line: lineNo, col: m[1].length + 2, code: "heading-case",
    msg: `heading is Title Case, not sentence case: ${JSON.stringify(m[2])}` }]
}

function wordRe(w) {
  return new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
}

function scan(file, opts) {
  const lines = proseOnly(readFileSync(file, "utf8"))
  const out = []
  const push = (i, col, code, msg) => out.push({ file, line: i + 1, col, code, msg })

  const patterns = [
    ["em-dash", /—/g, "em dash"],
    ["en-dash", /–/g, "en dash"],
    ["double-hyphen", / -- /g, '" -- "'],
    // Extended_Pictographic covers the copyright, registered, and trademark
    // signs, which are not emoji and appear in license text. Exclude them.
    ["emoji", /(?!©|®|™)\p{Extended_Pictographic}/gu, "emoji"],
  ]
  if (opts.house) patterns.push(
    ["curly-quote", /[‘’“”]/g, "curly quote"],
    ["inline-header-bullet", /^\s*[-*] \*\*[^*]+:\*\*\s/g, "inline-header bullet"],
    ["attribution", /Co-Authored-By:|Generated with/g, "tool attribution trailer"],
  )

  const words = opts.house ? [...RULE_WORDS, ...HOUSE_WORDS] : RULE_WORDS

  lines.forEach((line, i) => {
    for (const [code, re, label] of patterns) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(line)) !== null) {
        push(i, m.index + 1, code, label)
        if (m[0].length === 0) re.lastIndex++
      }
    }
    for (const w of words) {
      const re = wordRe(w)
      let m
      while ((m = re.exec(line)) !== null) push(i, m.index + 1, "banned-word", `banned word: ${m[0]}`)
    }
    for (const f of headingFindings(line, i + 1, opts.proper)) out.push({ file, ...f })
    if (opts.length && !/^\s*[-*|>#]/.test(line)) {
      for (const s of line.split(/(?<=[.!?])\s+/)) {
        const n = s.trim().split(/\s+/).filter(Boolean).length
        if (n > 25) push(i, 1, "sentence-length", `sentence runs ${n} words, cap is 25`)
      }
    }
  })
  return out
}

function walk(p) {
  if (statSync(p).isDirectory()) {
    return readdirSync(p).flatMap((e) => walk(join(p, e)))
  }
  return /\.(md|markdown)$/i.test(p) ? [p] : []
}

const argv = process.argv.slice(2)
const opts = { house: false, length: false, proper: PROPER, only: null }
const paths = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === "--house") opts.house = true
  else if (a === "--length") opts.length = true
  else if (a === "--only") opts.only = new Set(argv[++i].split(","))
  else if (a === "--proper") opts.proper = [...PROPER, ...readFileSync(argv[++i], "utf8").split("\n").map((s) => s.trim()).filter(Boolean)]
  else if (a === "--help" || a === "-h") {
    process.stdout.write(`usage: prose.mjs [--house] [--length] [--only a,b] [--proper FILE] PATH...

Default reports what R-DOC-05's Check names: em and en dashes, " -- ", emoji,
Title Case headings, and the six promotional words that rule lists.

  --house   add the rest of the house style in references/linting.md:
            curly quotes, inline-header bullets, attribution trailers, and the
            full banned-word table. Every hit needs a human decision.
  --length  add sentences over 25 words. Noisy by design; opt in.
  --only    report only the named checks, comma separated.
  --proper  add proper nouns, one per line, so a heading is not misread.

Exits 1 when anything is reported, 0 when nothing is.
`)
    process.exit(0)
  } else paths.push(a)
}
if (paths.length === 0) { process.stderr.write("prose.mjs: no path given, try --help\n"); process.exit(2) }

let findings = paths.flatMap(walk).flatMap((f) => scan(f, opts))
if (opts.only) findings = findings.filter((f) => opts.only.has(f.code))

for (const f of findings) process.stdout.write(`${f.file}:${f.line}:${f.col}  ${f.code}  ${f.msg}\n`)
const byCode = {}
for (const f of findings) byCode[f.code] = (byCode[f.code] ?? 0) + 1
const summary = Object.entries(byCode).map(([c, n]) => `${c}=${n}`).join(" ")
process.stdout.write(`${findings.length} finding(s)${summary ? ` (${summary})` : ""}\n`)
process.exit(findings.length > 0 ? 1 : 0)
