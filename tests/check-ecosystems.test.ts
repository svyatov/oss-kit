import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const CHECKER = resolve("scripts/check-ecosystems.mjs")

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/** The checker resolves every path from the working directory, so a fixture is a cwd. */
function run(cwd: string) {
  const result = spawnSync(process.execPath, [CHECKER], { cwd, encoding: "utf8" })
  return { status: result.status, stderr: result.stderr, stdout: result.stdout }
}

const SECTIONS = { demo: ["First section", "Second section"] }
const ECOSYSTEMS = { npm: { title: "npm" }, hex: { title: "Hex" } }

const GOOD = `# npm

## First section

Something true.

## Second section

Something else true.

Verified 2026-07-31, from https://example.invalid/docs.
`

/**
 * A whole matrix, written from one roster, so each test below changes exactly
 * one thing and the failure it asserts is the thing it changed.
 */
function fixture(options: { roster?: string; files?: Record<string, string | null> } = {}) {
  const root = mkdtempSync(join(tmpdir(), "oss-kit-eco-"))
  roots.push(root)
  const dir = join(root, "skills/demo/references/ecosystems")
  mkdirSync(dir, { recursive: true })
  mkdirSync(join(root, "skills/oss-audit"), { recursive: true })
  writeFileSync(
    join(root, "skills/oss-audit/ecosystems.json"),
    options.roster ?? JSON.stringify({ ecosystems: ECOSYSTEMS, sections: SECTIONS }),
  )
  const files: Record<string, string | null> = { npm: GOOD, hex: GOOD.replace("# npm", "# Hex"), ...options.files }
  for (const [name, body] of Object.entries(files)) {
    if (body === null) continue
    writeFileSync(join(dir, `${name}.md`), body)
  }
  return root
}

test("a whole matrix passes and says what it checked", () => {
  const result = run(fixture())
  expect(result.status).toBe(0)
  expect(result.stdout).toContain("2 ecosystems x 1 skills")
})

test("a missing file names the file and the roster entry behind it", () => {
  const result = run(fixture({ files: { hex: null } }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("skills/demo/references/ecosystems/hex.md does not exist")
  expect(result.stderr).toContain("remove 'hex' from the roster")
})

test("a stray file naming no roster entry fails", () => {
  const result = run(fixture({ files: { crates: GOOD } }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("crates.md names no roster ecosystem")
})

test("a missing declared heading names the heading and the file", () => {
  const result = run(fixture({ files: { npm: GOOD.replace("## Second section", "## Something else") } }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("is missing the declared section 'Second section'")
})

test("a declared heading demoted to level three is a hole, not a match", () => {
  const result = run(fixture({ files: { npm: GOOD.replace("## Second section", "### Second section") } }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("is missing the declared section 'Second section'")
})

// The two below are the only check standing between "every section is present"
// and a file of bare headings that satisfies every other rule at once.
test("a declared heading followed immediately by the next heading fails", () => {
  const body = "# npm\n\n## First section\n## Second section\n\nText.\n\nVerified 2026-07-31.\n"
  const result = run(fixture({ files: { npm: body } }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("declares 'First section' and leaves it empty")
})

test("a declared heading followed only by blank lines fails", () => {
  const body = "# npm\n\n## First section\n\n\n\n## Second section\n\nText.\n\nVerified 2026-07-31.\n"
  const result = run(fixture({ files: { npm: body } }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("declares 'First section' and leaves it empty")
})

test("the last declared heading is checked against the end of the file", () => {
  const body = "# npm\n\n## First section\n\nText.\n\n## Second section\n"
  const result = run(fixture({ files: { npm: body } }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("declares 'Second section' and leaves it empty")
})

test("a file that does not end with a Verified line fails", () => {
  const result = run(fixture({ files: { npm: GOOD.replace(/Verified .*/, "Checked recently.") } }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("does not end with a Verified line")
})

test("a malformed Verified date fails", () => {
  const result = run(fixture({ files: { npm: GOOD.replace("2026-07-31", "31 July 2026") } }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("does not end with a Verified line")
})

test("a Verified date in the future fails", () => {
  const result = run(fixture({ files: { npm: GOOD.replace("2026-07-31", "2099-01-01") } }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("verified as of 2099-01-01, which is in the future")
})

// An empty or unreadable roster must fail loudly. A checker that exits 0 on
// nothing checked reads exactly like one that looked and found no problem.
test("an empty roster fails rather than checking nothing", () => {
  const result = run(fixture({ roster: "{}" }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("lists no ecosystems")
})

test("a roster with ecosystems but no section sets fails", () => {
  const result = run(fixture({ roster: JSON.stringify({ ecosystems: ECOSYSTEMS }) }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("declares no section sets")
})

test("an unparseable roster fails naming the file", () => {
  const result = run(fixture({ roster: "{ not json" }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("skills/oss-audit/ecosystems.json is not valid JSON")
})

test("a roster naming a skill with no ecosystems directory fails", () => {
  const roster = JSON.stringify({ ecosystems: ECOSYSTEMS, sections: { ...SECTIONS, ghost: ["Only section"] } })
  const result = run(fixture({ roster }))
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("skills/ghost/references/ecosystems does not exist")
})

test("the real repository has one file per ecosystem per skill and passes", () => {
  const roster = JSON.parse(readFileSync("skills/oss-audit/ecosystems.json", "utf8"))
  const ecosystems: string[] = Object.keys(roster.ecosystems)
  const skills: string[] = Object.keys(roster.sections)

  // Arithmetic rather than a spot check: a skill silently dropped from the
  // roster would still leave every remaining file present and correct.
  let found = 0
  for (const skill of skills) {
    const dir = `skills/${skill}/references/ecosystems`
    found += readdirSync(dir).filter((entry) => entry.endsWith(".md")).length
  }
  expect(found).toBe(ecosystems.length * skills.length)
  expect(run(resolve(".")).status).toBe(0)
})
