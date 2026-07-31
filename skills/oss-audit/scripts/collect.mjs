#!/usr/bin/env node
// Collects the mechanically observable facts the Check lines in STANDARD.md
// reference, and prints them as JSON. The audit scores judgement on top of
// this rather than shelling out once per observation.
//
// Runs on Node 22 or later, and under Bun, with nothing installed. It reads
// files and imports node: built-ins only.
//
//   node collect.mjs [repo-root] > facts.json
//
// What it does NOT do: decide a rule. It reports what is there. Whether a
// sentence before a code block names that block's destination, or whether a
// differentiator carries evidence, is judgement and stays with the audit.
//
// Prose findings are oss-writing's, through its own scripts/prose.mjs. This
// script does not duplicate that skill's banned-word table.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import process from "node:process"

const root = process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : "."
const rel = (p) => relative(root, p) || "."
const read = (p) => readFileSync(p, "utf8")
const has = (p) => existsSync(join(root, p))

// ---------------------------------------------------------------- yaml subset
// Enough YAML for a workflow: nested maps, scalars, and sequences of maps.
// Written because R-SKL-05 forbids a dependency, and Bun's YAML global is a
// runtime-specific global the same rule forbids. Grep is what this replaces:
// counting jobs with a regex reads a top-level `env:` block's keys as jobs.
function parseYaml(text) {
  const lines = []
  let blockIndent = null
  for (const raw of text.split("\n")) {
    if (blockIndent !== null) {
      const ind = raw.search(/\S/)
      if (raw.trim() === "" || ind > blockIndent) continue
      blockIndent = null
    }
    const noComment = raw.replace(/(^|\s)#.*$/, "$1")
    if (noComment.trim() === "") continue
    const indent = noComment.search(/\S/)
    let body = noComment.trim()
    if (/[|>][+-]?$/.test(body)) { blockIndent = indent; body = body.replace(/\s*[|>][+-]?$/, ": ") }
    lines.push({ indent, body })
  }

  let i = 0
  const unquote = (s) => {
    const t = s.trim()
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1)
    return t
  }

  function block(indent) {
    // A sequence at this indent produces an array, a mapping produces an object.
    if (i < lines.length && lines[i].indent === indent && lines[i].body.startsWith("- ")) {
      const arr = []
      while (i < lines.length && lines[i].indent === indent && lines[i].body.startsWith("- ")) {
        const rest = lines[i].body.slice(2).trim()
        const kv = /^([^:\s][^:]*):\s*(.*)$/.exec(rest)
        if (kv) {
          // First key of a map item sits on the dash line; the rest are indented.
          const item = {}
          item[kv[1].trim()] = kv[2] === "" ? null : unquote(kv[2])
          i++
          const childIndent = i < lines.length ? lines[i].indent : -1
          if (childIndent > indent) Object.assign(item, block(childIndent))
          arr.push(item)
        } else {
          arr.push(unquote(rest))
          i++
        }
      }
      return arr
    }
    const map = {}
    while (i < lines.length && lines[i].indent === indent) {
      const kv = /^([^:\s][^:]*):\s*(.*)$/.exec(lines[i].body)
      if (!kv) { i++; continue }
      const key = kv[1].trim()
      const inline = kv[2]
      i++
      if (inline !== "") { map[key] = unquote(inline); continue }
      const childIndent = i < lines.length ? lines[i].indent : -1
      map[key] = childIndent > indent ? block(childIndent) : null
    }
    return map
  }
  return block(lines.length ? lines[0].indent : 0)
}

// ------------------------------------------------------------------ workflows
function collectWorkflows() {
  const dir = join(root, ".github/workflows")
  const out = []
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(name)) continue
    const path = join(dir, name)
    const text = read(path)
    let doc = {}
    try { doc = parseYaml(text) } catch { doc = {} }
    const jobs = doc.jobs && typeof doc.jobs === "object" && !Array.isArray(doc.jobs) ? doc.jobs : {}
    out.push({
      file: rel(path),
      // `on` is YAML 1.1's boolean true, so a reader may see either key.
      triggers: Object.keys(doc.on ?? doc.true ?? doc.On ?? {}),
      topLevelPermissions: doc.permissions ?? null,
      concurrency: doc.concurrency ?? null,
      jobs: Object.entries(jobs).map(([jobName, job]) => ({
        name: jobName,
        timeoutMinutes: job?.["timeout-minutes"] ?? null,
        permissions: job?.permissions ?? null,
        environment: job?.environment ?? null,
        uses: job?.uses ?? null,
        steps: Array.isArray(job?.steps) ? job.steps.length : 0,
      })),
      // Every uses: in the file, including inside steps, with how it is pinned.
      uses: [...text.matchAll(/^\s*(?:-\s*)?uses:\s*['"]?([^'"\s#]+)/gm)].map((m) => {
        const ref = m[1]
        const at = ref.lastIndexOf("@")
        const version = at === -1 ? null : ref.slice(at + 1)
        return {
          ref,
          local: ref.startsWith("./"),
          pinnedToSha: version !== null && /^[0-9a-f]{40}$/.test(version),
          version,
        }
      }),
    })
  }
  return out
}

// Composite actions take uses: too, so R-SEC-01 reaches every action.yml the
// repository ships and not only the workflows that call it.
function collectActions() {
  const out = []
  const walk = (dir, depth) => {
    if (depth > 4 || !existsSync(dir)) return
    for (const e of readdirSync(dir)) {
      if (e === "node_modules" || e === ".git") continue
      const p = join(dir, e)
      let s
      try { s = statSync(p) } catch { continue }
      if (s.isDirectory()) walk(p, depth + 1)
      else if (/^action\.ya?ml$/.test(e)) {
        const text = read(p)
        out.push({
          file: rel(p),
          uses: [...text.matchAll(/^\s*(?:-\s*)?uses:\s*['"]?([^'"\s#]+)/gm)].map((m) => ({
            ref: m[1],
            local: m[1].startsWith("./"),
            pinnedToSha: /@[0-9a-f]{40}$/.test(m[1]),
          })),
        })
      }
    }
  }
  walk(root, 0)
  return out
}

// -------------------------------------------------------------- markdown shape
function markdownFacts(path) {
  if (!has(path)) return null
  const text = read(join(root, path))
  const lines = text.split("\n")
  const fences = []
  const headings = []
  let fenced = false, opened = 0, lang = ""
  lines.forEach((line, idx) => {
    const f = /^\s*(```|~~~)\s*([A-Za-z0-9_+-]*)/.exec(line)
    if (f) {
      if (!fenced) { fenced = true; opened = idx + 1; lang = f[2] }
      else {
        fenced = false
        // R-DOC-07 asks whether a sentence names the block's destination. Give
        // the audit the preceding non-blank line; deciding is its job.
        let p = opened - 2
        while (p >= 0 && lines[p].trim() === "") p--
        fences.push({ startLine: opened, endLine: idx + 1, language: lang || null, precededBy: p >= 0 ? lines[p].trim() : null })
      }
      return
    }
    if (fenced) return
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) headings.push({ line: idx + 1, level: h[1].length, text: h[2].trim() })
  })
  const firstHeadingIdx = lines.findIndex((l) => /^#\s+/.test(l))
  let firstPara = null
  if (firstHeadingIdx !== -1) {
    for (let j = firstHeadingIdx + 1; j < lines.length; j++) {
      if (lines[j].trim() === "") continue
      if (/^#{1,6}\s/.test(lines[j])) break
      firstPara = { line: j + 1, text: lines[j].trim() }
      break
    }
  }
  return {
    path,
    lines: lines.length,
    headings,
    fences,
    firstParagraphAfterTitle: firstPara,
    links: [...text.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)].map((mm) => ({ text: mm[1], target: mm[2] })),
    linkDefinitions: [...text.matchAll(/^\[([^\]]+)\]:\s*(\S+)/gm)].map((mm) => ({ label: mm[1], target: mm[2] })),
  }
}

// ------------------------------------------------------------------- presence
// licensee, the detector GitHub runs, matches these basenames and extensions.
// Naming only LICENSE and LICENSE.md is what made one repository rename a file
// the forge already resolved.
const LICENSE_RE = /^((un)?licen[sc]e|copying)(\.(md|markdown|txt|html))?$/i
const COMMUNITY = ["CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md"]
const PR_TEMPLATES = [
  "pull_request_template.md", "docs/pull_request_template.md", ".github/pull_request_template.md",
  "PULL_REQUEST_TEMPLATE", "docs/PULL_REQUEST_TEMPLATE", ".github/PULL_REQUEST_TEMPLATE",
]

function presence() {
  const rootEntries = existsSync(root) ? readdirSync(root) : []
  const community = {}
  for (const f of COMMUNITY) {
    community[f] = [f, `.github/${f}`, `docs/${f}`].filter(has)
  }
  return {
    licenseFiles: rootEntries.filter((e) => LICENSE_RE.test(e)),
    community,
    prTemplates: PR_TEMPLATES.filter(has),
    issueTemplateDir: has(".github/ISSUE_TEMPLATE"),
    issueTemplates: has(".github/ISSUE_TEMPLATE")
      ? readdirSync(join(root, ".github/ISSUE_TEMPLATE")).filter((f) => f !== "config.yml")
      : [],
    issueChooser: has(".github/ISSUE_TEMPLATE/config.yml"),
    codeowners: [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"].filter(has),
    dependabot: has(".github/dependabot.yml") || has(".github/dependabot.yaml"),
    gitlabCi: has(".gitlab-ci.yml"),
    gitlabTemplates: [".gitlab/issue_templates", ".gitlab/merge_request_templates"].filter(has),
    lockfiles: rootEntries.filter((e) => /\.lock$|-lock\.json$|\.locked$|lock\.(json|yaml|toml)$/i.test(e)),
  }
}

const facts = {
  root: rel(join(root, ".")),
  presence: presence(),
  workflows: collectWorkflows(),
  actions: collectActions(),
  readme: markdownFacts("README.md"),
  changelog: markdownFacts("CHANGELOG.md"),
}

// R-CI-05 is the reason this script parses instead of grepping: a regex over
// job-shaped lines counts a top-level env: block's keys as jobs.
facts.summary = {
  jobsTotal: facts.workflows.reduce((s, w) => s + w.jobs.length, 0),
  jobsWithTimeout: facts.workflows.reduce((s, w) => s + w.jobs.filter((j) => j.timeoutMinutes !== null).length, 0),
  externalUses: [...facts.workflows, ...facts.actions].flatMap((w) => w.uses).filter((u) => !u.local).length,
  externalUsesUnpinned: [...facts.workflows, ...facts.actions]
    .flatMap((w) => w.uses).filter((u) => !u.local && !u.pinnedToSha).map((u) => u.ref),
  workflowsWithoutTopLevelPermissions: facts.workflows.filter((w) => w.topLevelPermissions === null).map((w) => w.file),
}

process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`)
