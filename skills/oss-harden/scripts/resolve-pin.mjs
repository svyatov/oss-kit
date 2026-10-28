#!/usr/bin/env node
// Resolves an action reference to the commit SHA R-SEC-01 asks for, and says
// what kind of ref it was. Written because every measured run of this skill
// hand-rolled the same resolver and two of them got it wrong the same two ways:
// an annotated tag points at a tag object rather than at a commit, and a repo's
// default branch is not always `main`.
//
// Usage:
//   resolve-pin.mjs actions/checkout@v7 ruby/setup-ruby@v1
//   resolve-pin.mjs --json actions/checkout@v7
//   cat .github/workflows/ci.yml | resolve-pin.mjs -
//
// `-` reads block-style workflow YAML on stdin. Unsupported forms fail with
// a request to pass references directly, rather than silently omitting them.
//
// Runs on Node 22 or later, and under Bun, with nothing installed. It uses
// global fetch and node: built-ins only. Set GH_TOKEN or GITHUB_TOKEN to raise
// the anonymous rate limit; nothing here needs write access.

import process from "node:process"

const API = "https://api.github.com"
const TOKEN = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? ""

async function api(path) {
  const headers = { accept: "application/vnd.github+json", "user-agent": "oss-kit-resolve-pin" }
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`
  const response = await fetch(`${API}${path}`, { headers })
  if (response.status === 404) return null
  if (!response.ok) {
    const limit = response.headers.get("x-ratelimit-remaining")
    const hint = limit === "0" ? " (rate limit exhausted; set GH_TOKEN)" : ""
    throw new Error(`GET ${path} answered ${response.status}${hint}`)
  }
  return response.json()
}

// A lightweight tag's ref points straight at the commit. An annotated tag's
// points at a tag object, and pinning that SHA pins something no checkout can
// resolve. This is the dereference every hand-rolled version forgot.
async function resolveTag(owner, repo, ref) {
  const name = encodeURIComponent(ref)
  const found = await api(`/repos/${owner}/${repo}/git/ref/tags/${name}`)
  if (!found) return null
  let object = found.object
  const annotated = object.type === "tag"
  const seen = new Set()
  while (object.type === "tag") {
    if (seen.has(object.sha)) throw new Error(`${ref} has a cyclic tag chain`)
    seen.add(object.sha)
    const tag = await api(`/repos/${owner}/${repo}/git/tags/${object.sha}`)
    if (!tag) throw new Error(`${ref} points to an unavailable tag object`)
    object = tag.object
  }
  if (object.type !== "commit") throw new Error(`${ref} points to ${object.type}, not a commit`)
  return { sha: object.sha, kind: annotated ? "annotated tag" : "tag" }
}

// A moving ref is the finding, not a fallback. `ruby/setup-ruby@v1` is a branch,
// so a workflow naming it runs whatever was last pushed there.
async function resolveBranch(owner, repo, ref) {
  const name = encodeURIComponent(ref)
  const found = await api(`/repos/${owner}/${repo}/git/ref/heads/${name}`)
  return found ? { sha: found.object.sha, kind: "branch" } : null
}

async function resolveDefaultBranch(owner, repo) {
  const meta = await api(`/repos/${owner}/${repo}`)
  return meta?.default_branch ?? null
}

async function resolve(reference) {
  const at = reference.lastIndexOf("@")
  const slug = at === -1 ? reference : reference.slice(0, at)
  const [owner, repo, ...rest] = slug.split("/")
  if (!owner || !repo) throw new Error(`${reference} is not owner/repo@ref`)
  // A path inside a repository, as in `owner/repo/.github/workflows/x.yml@ref`,
  // is pinned by the repository's ref like any other.
  const subpath = rest.length ? "/" + rest.join("/") : ""

  let ref = at === -1 ? null : reference.slice(at + 1)
  let assumedDefault = false
  if (ref === null) {
    ref = await resolveDefaultBranch(owner, repo)
    assumedDefault = true
    if (!ref) throw new Error(`${slug} not found`)
  }

  if (/^[0-9a-f]{40}$/.test(ref)) return { reference, owner, repo, subpath, ref, sha: ref, kind: "already a sha" }

  const found = (await resolveTag(owner, repo, ref)) ?? (await resolveBranch(owner, repo, ref))
  if (!found) throw new Error(`${slug} has no tag or branch named ${ref}`)
  return { reference, owner, repo, subpath, ref, assumedDefault, ...found }
}

function line(r) {
  const { owner, repo, subpath, sha } = r
  const pinned = `${owner}/${repo}${subpath}@${sha}`
  if (r.kind === "already a sha") return `uses: ${pinned}`
  const warning =
    r.kind === "branch"
      ? `  # WARNING: ${r.ref} is a branch, not a tag; this runs whatever was last pushed to it`
      : ""
  const assumed = r.assumedDefault ? `  # no ref given; ${r.ref} is the default branch` : ""
  return `uses: ${pinned} # ${r.ref}${warning}${assumed}`
}

function workflowReferences(text) {
  const found = []
  let blockIndent = null
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(?:#.*)?$/.test(line)) continue
    const indent = line.match(/^\s*/)[0].length
    if (blockIndent !== null && indent > blockIndent) continue
    blockIndent = null
    const usesKey = /(?:^|[\s{,])(?:uses|"uses"|'uses')\s*:/.test(line)
    const scalar = /^\s*(?:-\s*)?[^:]+:\s*[|>](?:[+-][1-9]?|[1-9][+-]?)?\s*(?:#.*)?$/.test(line)
    if (scalar) {
      if (usesKey) throw new Error("multiline workflow uses values are unsupported; pass action references directly")
      blockIndent = indent
      continue
    }
    // Aliases and flow mappings can hide uses entries from a line reader.
    if (/(?:^|[\s:,\[])\s*[&*][\w-]+|(?:^|\s)<<\s*:/.test(line)) {
      throw new Error("workflow aliases are unsupported; pass action references directly")
    }
    if (/^\s*(?:-\s*)?(?:\?|"[^"\n]*\\[^"\n]*"\s*:)/.test(line)) {
      throw new Error("complex workflow keys are unsupported; pass action references directly")
    }
    const withoutExpressions = line.replace(/\$\{\{.*?\}\}/g, "")
    if (/[{}]/.test(withoutExpressions)) throw new Error("workflow flow mappings are unsupported; pass action references directly")
    if (!usesKey) continue
    const match = /^\s*(?:-\s*)?(?:uses|"uses"|'uses'):\s*(?:"([^"\n]+)"|'([^'\n]+)'|([^\s#{}]+))\s*(?:#.*)?$/.exec(line)
    if (!match) throw new Error("unsupported workflow uses mapping; pass action references directly")
    const ref = match[1] ?? match[2] ?? match[3]
    if (!ref.startsWith("./")) found.push(ref)
  }
  return found
}

const args = process.argv.slice(2)
const json = args.includes("--json")
let refs = args.filter((a) => a !== "--json")

if (refs.length === 0 || refs.includes("--help") || refs.includes("-h")) {
  process.stdout.write("usage: resolve-pin.mjs [--json] <owner/repo@ref>... | -\n")
  process.exit(refs.length === 0 ? 2 : 0)
}

if (refs.includes("-")) {
  const stdin = await new Promise((resolve) => {
    let text = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk) => (text += chunk))
    process.stdin.on("end", () => resolve(text))
  })
  try {
    refs = [...new Set([...refs.filter((r) => r !== "-"), ...workflowReferences(stdin)])]
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exit(1)
  }
}

const results = []
let failed = false
for (const reference of refs) {
  try {
    results.push(await resolve(reference))
  } catch (error) {
    failed = true
    if (json) results.push({ reference, error: String(error.message) })
    else process.stderr.write(`${reference}: ${error.message}\n`)
  }
}

if (json) process.stdout.write(JSON.stringify(results, null, 2) + "\n")
else for (const r of results) process.stdout.write(line(r) + "\n")

process.exit(failed ? 1 : 0)
