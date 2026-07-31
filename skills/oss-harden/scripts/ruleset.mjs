#!/usr/bin/env node
// Reads and writes a GitHub repository ruleset for R-SEC-04, R-SEC-12, and
// R-SEC-13. Written because a ruleset round-trip is not a round-trip: GitHub
// reads several rules back with null-valued parameters and rejects those same
// nulls on write, so a fetch, edit, and PUT answers
// `422 Invalid property /rules/N: data matches no possible input`. Every
// measured run hit it.
//
// Usage:
//   ruleset.mjs get <owner>/<repo> [name-or-id]
//   ruleset.mjs put <owner>/<repo> <name-or-id> <patch.json>
//   ruleset.mjs actor <login>
//
// `put` reads the ruleset, deep-merges the patch over it, strips the nulls
// GitHub will not accept, PUTs the result, and prints what the API reports
// afterwards rather than what was sent. Read the result back; do not infer it
// from a 200.
//
// Runs on Node 22 or later, and under Bun, with nothing installed. It shells
// out to `gh`, which is what the reference files already assume and what holds
// the admin credential these endpoints need.

import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import process from "node:process"
import { pathToFileURL } from "node:url"

/** @param {string[]} args @param {string} [body] @returns {string} */
function gh(args, body) {
  try {
    return execFileSync("gh", args, { encoding: "utf8", input: body, stdio: ["pipe", "pipe", "pipe"] })
  } catch (/** @type {any} */ error) {
    const stderr = error.stderr ? String(error.stderr).trim() : ""
    if (error.code === "ENOENT") fail("gh is not installed; these endpoints need an authenticated admin token")
    fail(`gh ${args.join(" ")} failed\n${stderr}`)
  }
}

/** @param {string} message @returns {never} */
function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

// GitHub reads some rule parameters back as null and rejects null on write.
// `code_coverage` with `max_coverage_drop: null` is the one every run met, but
// the fix has to be general: an unset optional parameter is absent on write,
// never null.
/** @param {any} value @returns {any} */
export function stripNulls(value) {
  if (Array.isArray(value)) return value.map(stripNulls)
  if (value && typeof value === "object") {
    /** @type {Record<string, any>} */
    const out = {}
    for (const [key, inner] of Object.entries(value)) {
      if (inner === null) continue
      out[key] = stripNulls(inner)
    }
    return out
  }
  return value
}

/** @param {any} base @param {any} patch @returns {any} */
export function merge(base, patch) {
  if (Array.isArray(patch) || patch === null || typeof patch !== "object") return patch
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    out[key] = key in base && base[key] && typeof base[key] === "object" && !Array.isArray(base[key])
      ? merge(base[key], value)
      : value
  }
  return out
}

// A ruleset PUT takes the writable fields only. `id`, `source`, timestamps, and
// the `_links` block come back on read and are rejected on write.
const WRITABLE = ["name", "target", "enforcement", "bypass_actors", "conditions", "rules"]

/** @param {Record<string, any>} ruleset @returns {Record<string, any>} */
export function writable(ruleset) {
  /** @type {Record<string, any>} */
  const out = {}
  for (const key of WRITABLE) if (key in ruleset) out[key] = ruleset[key]
  return stripNulls(out)
}

/** @param {string} slug @returns {any[]} */
function list(slug) {
  return JSON.parse(gh(["api", `repos/${slug}/rulesets`]))
}

/** @param {string} slug @param {string} nameOrId @returns {any} */
function find(slug, nameOrId) {
  const all = list(slug)
  const match = all.find((/** @type {any} */ r) => String(r.id) === String(nameOrId) || r.name === nameOrId)
  if (!match) fail(`${slug} has no ruleset named or numbered ${nameOrId}; found ${all.map((/** @type {any} */ r) => r.name).join(", ") || "none"}`)
  // The list endpoint answers with a summary. The full rule and bypass list
  // only comes from the by-id endpoint, and merging over the summary would
  // silently drop every rule the summary omits.
  return JSON.parse(gh(["api", `repos/${slug}/rulesets/${match.id}`]))
}

// The merge and the null strip are exported so a test can exercise them
// without a live repository, which means this file gets imported and the CLI
// below must not run when it is. `import.meta.main` needs Node 24 and this has
// to run on 22, so compare the entry path instead.
if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {

const [command, slug, nameOrId, patchPath] = process.argv.slice(2)

if (command === "actor") {
  // A bypass entry takes a numeric id, never a login, and RepositoryRole ids
  // are undocumented magic numbers. This prints the User form, which is the one
  // that can be checked against a name.
  if (!slug) fail("usage: ruleset.mjs actor <login>")
  const user = JSON.parse(gh(["api", `users/${slug}`]))
  process.stdout.write(JSON.stringify({ actor_type: "User", actor_id: user.id, bypass_mode: "always" }, null, 2) + "\n")
  process.exit(0)
}

if (!slug || !/^[^/]+\/[^/]+$/.test(slug)) fail("usage: ruleset.mjs get|put <owner>/<repo> [name-or-id] [patch.json]")

if (command === "get") {
  process.stdout.write(JSON.stringify(nameOrId ? find(slug, nameOrId) : list(slug), null, 2) + "\n")
  process.exit(0)
}

if (command === "put") {
  if (!nameOrId || !patchPath) fail("usage: ruleset.mjs put <owner>/<repo> <name-or-id> <patch.json>")
  const current = find(slug, nameOrId)
  const patch = JSON.parse(readFileSync(patchPath, "utf8"))
  const body = writable(merge(writable(current), patch))
  gh(["api", "-X", "PUT", `repos/${slug}/rulesets/${current.id}`, "--input", "-"], JSON.stringify(body))
  // Print what the API reports now, not what was sent. A ruleset that accepted
  // a write and stored something else is the case this exists to surface.
  process.stdout.write(JSON.stringify(JSON.parse(gh(["api", `repos/${slug}/rulesets/${current.id}`])), null, 2) + "\n")
  process.exit(0)
}

fail("usage: ruleset.mjs get|put <owner>/<repo> [name-or-id] [patch.json]\n       ruleset.mjs actor <login>")

}
