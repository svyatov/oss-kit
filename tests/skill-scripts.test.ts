import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { merge, stripNulls, writable } from "../skills/oss-harden/scripts/ruleset.mjs"
import { findSection } from "../skills/oss-changelog/scripts/release-notes.mjs"

// GitHub reads code_coverage back with max_coverage_drop: null and rejects that
// same null on write, which is the 422 every measured run hit. Nothing else in
// the round trip is wrong, so the strip is the whole fix.
test("strips the nulls a ruleset PUT rejects, at any depth", () => {
  const readBack = {
    id: 123,
    name: "main",
    source: "owner/repo",
    _links: { self: { href: "x" } },
    target: "branch",
    enforcement: "active",
    bypass_actors: [],
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    rules: [
      { type: "deletion" },
      { type: "code_coverage", parameters: { max_coverage_drop: null, tool: "codecov" } },
    ],
  }
  const body = writable(readBack)
  expect(body.id).toBeUndefined()
  expect(body.source).toBeUndefined()
  expect(body._links).toBeUndefined()
  expect(body.rules[1].parameters).toEqual({ tool: "codecov" })
  expect("max_coverage_drop" in body.rules[1].parameters).toBe(false)
})

test("keeps a false, a zero, and an empty array, which are values rather than absences", () => {
  expect(stripNulls({ a: false, b: 0, c: [], d: null })).toEqual({ a: false, b: 0, c: [] })
})

// A patch that replaced the rules wholesale is how a ruleset loses the rules
// nobody meant to touch, so the merge is deep for maps and total for arrays.
test("merges a patch over the current ruleset without dropping untouched keys", () => {
  const current = {
    name: "main",
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    rules: [{ type: "deletion" }],
  }
  const merged = merge(current, { conditions: { ref_name: { include: ["refs/heads/main"] } } })
  expect(merged.name).toBe("main")
  expect(merged.conditions.ref_name.include).toEqual(["refs/heads/main"])
  expect(merged.conditions.ref_name.exclude).toEqual([])
  expect(merged.rules).toEqual([{ type: "deletion" }])
})

test("patches rules by type while preserving other protections and replacing nested lists", () => {
  const current = { rules: [
    { type: "deletion" },
    { type: "pull_request", parameters: { required_approving_review_count: 1 } },
    { type: "required_status_checks", parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: "old" }] } },
  ] }
  const result = merge(current, { rules: [
    { type: "code_scanning", parameters: { code_scanning_tools: [{ tool: "CodeQL" }] } },
    { type: "required_status_checks", parameters: { required_status_checks: [{ context: "new" }] } },
  ] })
  expect(result.rules).toEqual([
    current.rules[0], current.rules[1],
    { type: "required_status_checks", parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: "new" }] } },
    { type: "code_scanning", parameters: { code_scanning_tools: [{ tool: "CodeQL" }] } },
  ])
  expect(merge(current, { rules: [] }).rules).toEqual(current.rules)
  expect(() => merge(current, { rules: [null] })).toThrow()
  expect(() => merge(current, { rules: [{ type: "deletion" }, { type: "deletion" }] })).toThrow()
})

const CHANGELOG = `# Changelog

## [Unreleased]

### Added

- something unreleased

## [1.2.0] - 2026-07-31

### Added

- a thing

### Fixed

- another thing

## [1.1.0] - 2026-06-01

### Fixed

- older thing

[1.2.0]: https://example.com/compare/v1.1.0...v1.2.0
`

test("extracts one version's section and stops at the next heading", () => {
  const section = findSection(CHANGELOG, "v1.2.0")
  expect(section?.heading).toBe("## [1.2.0] - 2026-07-31")
  expect(section?.body).toContain("- a thing")
  expect(section?.body).toContain("- another thing")
  expect(section?.body).not.toContain("older thing")
  expect(section?.body).not.toContain("unreleased")
})

test("drops reference definitions unused by the selected release", () => {
  expect(findSection(CHANGELOG, "1.1.0")?.body).toBe("### Fixed\n\n- older thing")
})

test("keeps document-level reference destinations used by release notes", () => {
  const text = CHANGELOG.replace("- a thing", "- See [migration guide][Migration] and [#123].") + `
[migration]: https://example.com/migrate "Migration guide"
[#123]: https://example.com/issues/123
[unused]: https://example.com/unused
`
  const body = findSection(text, "1.2.0")?.body
  expect(body).toContain('[migration]: https://example.com/migrate "Migration guide"')
  expect(body).toContain("[#123]: https://example.com/issues/123")
  expect(body).not.toContain("[unused]:")
  expect(body).not.toContain("[1.2.0]:")
  expect(findSection(text, "1.2.0", true)?.body).toContain("[1.2.0]: https://example.com/compare/")
})

test("returns nothing for a version the file does not carry", () => {
  expect(findSection(CHANGELOG, "v9.9.9")).toBeNull()
})

test("ignores fenced headings and retains complete multiline reference definitions", () => {
  for (const fence of ["````", "~~~~"]) {
    const text = `${fence}\n## [1.2.0]\n${fence}\n\n## [1.2.0]\n\nSee [guide].\n\n${fence}\n## fake heading\n[guide]: fake\n\x60\x60\x60\n${fence}\n\nAfter the example.\n\n## [1.1.0]\n\nOld.\n\n[guide]:\n  https://example.com/guide\n  "Guide title\n  on two lines"\n`
    const section = findSection(text, "1.2.0")
    expect(section?.body).toContain("After the example.")
    expect(section?.body).toContain('[guide]:\n  https://example.com/guide\n  "Guide title\n  on two lines"')
    expect(section?.body).not.toContain("Old.")
  }
})

test("retains unindented multiline reference destinations and titles", () => {
  const definition = '[guide]:\nhttps://example.com/guide\n"A title\non two lines"'
  expect(findSection(`## [1.2.0]\n\nRead [guide].\n\n${definition}`, "1.2.0")?.body).toContain(definition)
})

// The exit code is the load-bearing half: a release job has to fail rather than
// publish a release whose body is empty.
test("exits 2 on a missing section and 0 on a present one", () => {
  const dir = mkdtempSync(join(tmpdir(), "notes-"))
  const file = join(dir, "CHANGELOG.md")
  writeFileSync(file, CHANGELOG)
  const script = "skills/oss-changelog/scripts/release-notes.mjs"

  expect(execFileSync("node", [script, file, "v1.2.0"], { encoding: "utf8" })).toContain("- a thing")

  let code = 0
  try {
    execFileSync("node", [script, file, "v9.9.9"], { encoding: "utf8", stdio: "pipe" })
  } catch (error) {
    code = (error as { status: number }).status
  }
  expect(code).toBe(2)
})

test("exits 2 on a heading with nothing under it", () => {
  const dir = mkdtempSync(join(tmpdir(), "notes-"))
  const file = join(dir, "CHANGELOG.md")
  writeFileSync(file, "# Changelog\n\n## [2.0.0] - 2026-08-01\n\n## [1.0.0] - 2026-01-01\n\n- a thing\n")
  let code = 0
  try {
    execFileSync("node", ["skills/oss-changelog/scripts/release-notes.mjs", file, "2.0.0"], { encoding: "utf8", stdio: "pipe" })
  } catch (error) {
    code = (error as { status: number }).status
  }
  expect(code).toBe(2)
})
