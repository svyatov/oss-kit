#!/usr/bin/env node
// Prints one version's section out of a Keep a Changelog file, for a release
// job's notes. Written because the alternative a release workflow reaches for
// is `gh release --generate-notes`, which lists merged pull requests rather
// than the document the project maintains, and the alternative to that is a
// regex somebody improvises in YAML at release time.
//
// Usage:
//   release-notes.mjs v1.2.3
//   release-notes.mjs CHANGELOG.md v1.2.3
//   release-notes.mjs --heading v1.2.3     (keep the version heading line)
//
// Exits 2 when the section is absent or empty, so a release job fails loudly
// rather than publishing a release with a blank body. That is the whole point:
// a release nobody can read is not noticed again.
//
// Runs on Node 22 or later, and under Bun, with nothing installed.

import { readFileSync } from "node:fs"
import process from "node:process"
import { pathToFileURL } from "node:url"

// Keep a Changelog writes `## [1.2.3] - 2026-01-01`. Plenty of real files write
// `## 1.2.3`, `## v1.2.3`, or add a suffix such as ` [YANKED]`, so match the
// version rather than the punctuation around it.
/**
 * @param {string} text
 * @param {string} version
 * @param {boolean} [keepHeading]
 * @returns {{heading: string, body: string} | null}
 */
export function findSection(text, version, keepHeading = false) {
  const wanted = version.replace(/^v/, "")
  const lines = text.split("\n")
  const isVersionHeading = (/** @type {string} */ line) => /^##\s+/.test(line)
  const headingVersion = (/** @type {string} */ line) => {
    const match = /^##\s+\[?v?([^\]\s]+)\]?/.exec(line)
    return match ? match[1] : null
  }

  let start = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ""
    if (isVersionHeading(line) && headingVersion(line) === wanted) {
      start = i
      break
    }
  }
  if (start === -1) return null

  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (isVersionHeading(lines[i] ?? "")) {
      end = i
      break
    }
  }

  // Definitions may live outside the selected section. Keep those referenced
  // by its text, including the heading only when the caller will print it.
  const definition = /^ {0,3}\[([^\]]+)\]:\s*\S/
  const body = lines.slice(start + 1, end).filter((line) => !definition.test(line)).join("\n").trim()
  const heading = lines[start] ?? ""
  const normalize = (/** @type {string} */ label) => label.trim().replace(/\s+/g, " ").toLowerCase()
  const used = new Set([...`${keepHeading ? heading : ""}\n${body}`.matchAll(/\[([^\]]+)\]/g)].map((m) => normalize(m[1] ?? "")))
  const seen = new Set()
  const definitions = lines.filter((line) => {
    const match = definition.exec(line)
    if (!match) return false
    const label = normalize(match[1] ?? "")
    if (!used.has(label) || seen.has(label)) return false
    seen.add(label)
    return true
  })
  return { heading, body: body === "" ? "" : [body, ...definitions].join("\n\n") }
}

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {

const args = process.argv.slice(2)
const keepHeading = args.includes("--heading")
const rest = args.filter((a) => a !== "--heading")

if (rest.length === 0 || rest.includes("--help") || rest.includes("-h")) {
  process.stdout.write("usage: release-notes.mjs [--heading] [CHANGELOG.md] <version>\n")
  process.exit(rest.length === 0 ? 2 : 0)
}

const file = rest.length >= 2 ? String(rest[0]) : "CHANGELOG.md"
const version = String(rest.length >= 2 ? rest[1] : rest[0])

let text = ""
try {
  text = readFileSync(file, "utf8")
} catch {
  process.stderr.write(`${file} is not readable\n`)
  process.exit(2)
}

const section = findSection(text, version, keepHeading)
if (!section) {
  process.stderr.write(`${file} has no section for ${version}\n`)
  process.exit(2)
}
if (section.body === "") {
  process.stderr.write(`${file} has a heading for ${version} with nothing under it\n`)
  process.exit(2)
}

process.stdout.write((keepHeading ? `${section.heading}\n\n${section.body}` : section.body) + "\n")

}
