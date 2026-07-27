import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { PATTERNS, maskProse, scan } from "../skills/oss-writing/scripts/check-tells.mjs"

const CHECKER = "skills/oss-writing/scripts/check-tells.mjs"

// Run from a directory with no .oss-kit.json above it. With the repository root
// as the working directory the checker would find this repository's own
// allowlist, and a heading test would pass on a word it never declared.
const SANDBOX = mkdtempSync(join(tmpdir(), "check-tells-cwd-"))

const run = (args: string[], stdin?: string) =>
  Bun.spawnSync(["node", join(process.cwd(), CHECKER), ...args], {
    cwd: SANDBOX,
    stdin: stdin === undefined ? "ignore" : Buffer.from(stdin),
  })

const out = (result: ReturnType<typeof run>) => result.stdout.toString() + result.stderr.toString()

const tell = (text: string, file = "t.md") => scan(text, file)

test("an em dash in a paragraph is reported at its line and column", () => {
  const findings = tell("first line\nan em — dash here\n")
  expect(findings).toHaveLength(1)
  expect(findings[0]?.line).toBe(2)
  expect(findings[0]?.col).toBe(7)
  expect(findings[0]?.severity).toBe("offence")
})

test("an em dash inside a fenced block is not reported", () => {
  expect(tell("text\n\n```\nan em — dash\n```\n")).toHaveLength(0)
})

test("an em dash inside a tilde-fenced block is not reported", () => {
  expect(tell("text\n\n~~~\nan em — dash\n~~~\n")).toHaveLength(0)
})

test("an em dash inside an inline code span is not reported", () => {
  expect(tell("the `an em — dash` token\n")).toHaveLength(0)
})

test("an em dash inside a code span wrapped across two lines is not reported", () => {
  expect(tell("the `an em\n— dash` token\n")).toHaveLength(0)
})

test("an em dash inside a four-space indented block is not reported", () => {
  expect(tell("a paragraph\n\n    an em — dash\n")).toHaveLength(0)
})

test("an em dash in an indented continuation paragraph under a list item is reported", () => {
  expect(tell("- an item\n\n    an em — dash\n")).toHaveLength(1)
})

test("an em dash inside a block quote is not reported", () => {
  expect(tell("> an em — dash\n")).toHaveLength(0)
})

test("a fence opened and never closed masks to end of file", () => {
  expect(tell("text\n\n```\nan em — dash\nmore — text\n")).toHaveLength(0)
})

test("line numbers after a stripped fence match the source file", () => {
  const findings = tell("```\ncode\ncode\n```\n\nan em — dash\n")
  expect(findings).toHaveLength(1)
  expect(findings[0]?.line).toBe(6)
})

test("masking preserves the length and the line structure of the source", () => {
  const text = "a\n\n```\nfenced\n```\n> quoted\n`span`\n"
  const masked = maskProse(text)
  expect(masked).toHaveLength(text.length)
  expect(masked.split("\n")).toHaveLength(text.split("\n").length)
})

test("a closing fence shorter than its opening fence does not close it", () => {
  expect(tell("````\n```\nan em — dash\n````\n")).toHaveLength(0)
})

test("reading from - reports the same findings against <stdin>", () => {
  const result = run(["-"], "an em — dash\n")
  expect(result.exitCode).toBe(1)
  expect(out(result)).toContain("<stdin>:1:7")
})

test("a file argument and stdin agree on the same bytes", () => {
  const dir = mkdtempSync(join(tmpdir(), "tells-"))
  const file = join(dir, "a.md")
  writeFileSync(file, "an em — dash\n")
  const fromFile = run([file])
  const fromStdin = run(["-"], "an em — dash\n")
  expect(fromFile.exitCode).toBe(1)
  expect(out(fromFile).replace(file, "<stdin>")).toBe(out(fromStdin))
})

test("a path that does not exist exits non-zero and names the path", () => {
  const result = run(["no/such/file.md"])
  expect(result.exitCode).not.toBe(0)
  expect(out(result)).toContain("no/such/file.md")
})

test("a clean file exits 0 and reports nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), "tells-"))
  const file = join(dir, "a.md")
  writeFileSync(file, "# a clean heading\n\nordinary prose.\n")
  const result = run([file])
  expect(out(result)).toBe("")
  expect(result.exitCode).toBe(0)
})

const severities = (text: string) => tell(text).map((f) => f.severity)

test("a vocabulary word with no legitimate use is an offence", () => {
  expect(severities("We leverage a stale cache.\n")).toEqual(["offence"])
})

test("an inflected form of the same word fires", () => {
  expect(severities("The team leveraged it.\n")).toEqual(["offence"])
})

test("an identifier inside a code span does not fire the same word", () => {
  expect(tell("The `leverages_ratio` column.\n")).toHaveLength(0)
})

test("a promotional adjective is a suspicion", () => {
  expect(severities("We use a robust cache.\n")).toEqual(["suspicion"])
})

test("a word with an ordinary technical noun sense is still a suspicion", () => {
  expect(severities("the cache key is critical to the lookup\n")).toEqual(["suspicion", "suspicion"])
})

test("a file of suspicions alone exits 0", () => {
  const dir = mkdtempSync(join(tmpdir(), "tells-"))
  const file = join(dir, "a.md")
  writeFileSync(file, "a robust and powerful and seamless design\n")
  const result = run([file])
  expect(out(result)).toContain("suspicion")
  expect(result.exitCode).toBe(0)
})

test("one offence among ten suspicions exits 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "tells-"))
  const file = join(dir, "a.md")
  const suspicions = "robust powerful seamless comprehensive blazing effortless elegant rich key critical\n"
  writeFileSync(file, `${suspicions}We utilize it.\n`)
  const result = run([file])
  expect(result.exitCode).toBe(1)
  expect(out(result).split("\n").filter((l) => l.includes("suspicion"))).toHaveLength(10)
})

test("an inline-header bullet is an offence", () => {
  expect(severities("- **Performance:** it is faster\n")).toEqual(["offence"])
})

test("a bolded claim closed with a period is not", () => {
  expect(tell("- **Fast.** 50% faster than the native call.\n")).toHaveLength(0)
})

test("a label whose colon sits outside the bold is still an offence", () => {
  expect(severities("- **Performance**: it is faster\n")).toEqual(["offence"])
})

test("a version string does not fire the emoji pattern", () => {
  expect(tell("Release 1.2.3-rc.4 ships today.\n")).toHaveLength(0)
})

test("a hash character and an ASCII digit do not fire the emoji pattern", () => {
  expect(tell("Issue #42 has 7 comments.\n")).toHaveLength(0)
})

test("a real emoji in a heading fires", () => {
  expect(severities("# a heading \u{1F680}\n")).toEqual(["offence"])
})

test("a curly quote is an offence", () => {
  expect(severities("the parser’s input\n")).toEqual(["offence"])
})

test("a tool attribution footer is an offence", () => {
  expect(severities("fix the parser\n\nGenerated with a tool\n")).toEqual(["offence"])
})

test("a Claude co-author trailer is an offence whatever its capitalization", () => {
  expect(severities("Co-authored-by: Claude <noreply@anthropic.com>\n")).toEqual(["offence"])
})

test("every catalog entry carries a token, a global pattern, and a replacement", () => {
  expect(PATTERNS.length).toBeGreaterThan(30)
  for (const pattern of PATTERNS) {
    expect(pattern.token, pattern.id).not.toBe("")
    expect(pattern.instead, pattern.id).not.toBe("")
    expect(pattern.match?.global ?? pattern.heading, pattern.id).toBe(true)
  }
  expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(PATTERNS.length)
})

const headings = (text: string, file = "t.md") => scan(text, file).map((f) => f.tell)

test("a title-case heading reports one offence per offending word", () => {
  expect(headings("## Setting Up The Cache\n")).toEqual(["Up", "The", "Cache"])
})

test("a sentence-case heading reports nothing", () => {
  expect(headings("## setting up the cache\n")).toHaveLength(0)
})

test("a heading whose first word is capitalized reports nothing", () => {
  expect(headings("## Setting up the cache\n")).toHaveLength(0)
})

test("a rule heading label is not the sentence start", () => {
  expect(headings("### R-DOC-01: The README opens with one sentence\n")).toHaveLength(0)
})

test("a two-token step label is not the sentence start", () => {
  expect(headings("## Step 1: Find STANDARD.md\n")).toHaveLength(0)
})

test("a unit label closed with a period is not the sentence start", () => {
  expect(headings("## U1. Prose extraction and the pipeline\n")).toHaveLength(0)
})

test("a colon past the second token does not create a label", () => {
  expect(headings("## use the cache well: Only In Production\n")).toEqual(["Only", "In", "Production"])
})

test("an allowlisted proper noun is not an offence", () => {
  expect(headings("## use GitHub Actions\n")).toEqual(["Actions"])
})

test("an all-caps acronym is not an offence", () => {
  expect(headings("## read the CHANGELOG\n")).toHaveLength(0)
})

test("a path or a filename is not an offence", () => {
  expect(headings("## generate site/src/content from AGENTS.md\n")).toHaveLength(0)
})

test("a heading ending in a period still checks its last word", () => {
  expect(headings("## warm the Cache.\n")).toEqual(["Cache"])
})

test("a capitalized word inside a code span is not an offence", () => {
  expect(headings("## read the `Foo` table\n")).toHaveLength(0)
})

test("a hash inside a fenced block is not a heading", () => {
  expect(headings("```\n# Not A Heading\n```\n")).toHaveLength(0)
})

test("a per-invocation allowlist clears a heading that otherwise fails", () => {
  expect(scan("## build with Astro and Starlight\n", "t.md", { allow: ["Astro", "Starlight"] })).toHaveLength(0)
})

test("--allow clears the same heading from the command line", () => {
  const dir = mkdtempSync(join(tmpdir(), "tells-"))
  const file = join(dir, "a.md")
  writeFileSync(file, "## build with Astro and Starlight\n")
  expect(run([file]).exitCode).toBe(1)
  expect(run(["--allow", "Astro,Starlight", file]).exitCode).toBe(0)
})

test("an .oss-kit.json above the file supplies the allowlist", () => {
  const dir = mkdtempSync(join(tmpdir(), "tells-"))
  writeFileSync(join(dir, ".oss-kit.json"), JSON.stringify({ "oss-writing": { allow: ["Astro"] } }))
  const file = join(dir, "a.md")
  writeFileSync(file, "## build with Astro\n")
  expect(Bun.spawnSync(["node", join(process.cwd(), CHECKER), "a.md"], { cwd: dir }).exitCode).toBe(0)
})

test("a malformed .oss-kit.json exits non-zero rather than scoring on defaults", () => {
  const dir = mkdtempSync(join(tmpdir(), "tells-"))
  writeFileSync(join(dir, ".oss-kit.json"), "{ not json")
  writeFileSync(join(dir, "a.md"), "clean prose.\n")
  const result = Bun.spawnSync(["node", join(process.cwd(), CHECKER), "a.md"], { cwd: dir })
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr.toString()).toContain(".oss-kit.json")
})

const COC = `# Code of conduct

## Our Pledge

We pledge to make participation a harassment-free experience.

## Attribution

This code of conduct is adapted from the Contributor Covenant, version 2.1,
available at https://www.contributor-covenant.org/version/2/1/code_of_conduct.html.
`

test("an attributed code of conduct keeps its preserved headings", () => {
  expect(scan(COC, "CODE_OF_CONDUCT.md")).toHaveLength(0)
})

test("an attributed code of conduct is still checked for dashes and emoji", () => {
  expect(scan(`${COC}\nan em — dash \u{1F680}\n`, "CODE_OF_CONDUCT.md")).toHaveLength(2)
})

test("a code of conduct with no attribution has its headings checked", () => {
  expect(scan(COC.replace(/Contributor Covenant/, "nothing"), "CODE_OF_CONDUCT.md").map((f) => f.tell)).toEqual(["Pledge"])
})

test("another file mentioning the Contributor Covenant still has its headings checked", () => {
  expect(scan(COC, "CONTRIBUTING.md").map((f) => f.tell)).toEqual(["Pledge"])
})

const fixture = (files: Record<string, string>, init = true) => {
  const dir = mkdtempSync(join(tmpdir(), "tells-repo-"))
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true })
    writeFileSync(join(dir, name), body)
  }
  if (init) {
    Bun.spawnSync(["git", "init", "-q"], { cwd: dir })
    Bun.spawnSync(["git", "add", "-A"], { cwd: dir })
  }
  return dir
}

const rule = (dir: string, args: string[] = ["R-DOC-05"], cwd = process.cwd()) =>
  Bun.spawnSync(["node", join(process.cwd(), CHECKER), "--rule", ...args, dir], { cwd })

test("--rule reports only the locations R-DOC-05 names", () => {
  const dir = fixture({
    "README.md": "an em — dash\n",
    "docs/guide.md": "an em — dash\n",
    "CONTRIBUTING.md": "an em — dash\n",
    "SECURITY.md": "an em — dash\n",
    "CODE_OF_CONDUCT.md": "an em — dash\n",
    "skills/oss-thing/SKILL.md": "an em — dash\n",
    "src/notes.md": "an em — dash\n",
  })
  const lines = rule(dir).stdout.toString().trim().split("\n")
  expect(lines).toHaveLength(5)
  expect(lines.join("\n")).not.toContain("SKILL.md")
  expect(lines.join("\n")).not.toContain("notes.md")
})

test("--rule reports only the patterns R-DOC-05 names", () => {
  const dir = fixture({ "README.md": "a -- break and a robust design\n" })
  const result = rule(dir)
  expect(result.stdout.toString()).toContain("robust")
  expect(result.stdout.toString()).not.toContain(" -- ")
  expect(run([join(dir, "README.md")]).stdout.toString()).toContain(" -- ")
})

test("--rule promotes every finding to an offence", () => {
  const dir = fixture({ "README.md": "a robust design\n" })
  const result = rule(dir)
  expect(result.stdout.toString()).toContain("offence")
  expect(result.stdout.toString()).not.toContain("suspicion")
  expect(result.exitCode).toBe(1)
})

test("--rule ignores a suspicion outside R-DOC-05's pattern set", () => {
  const dir = fixture({ "README.md": "the cache key is critical\n" })
  expect(rule(dir).stdout.toString()).toBe("")
  expect(rule(dir).exitCode).toBe(0)
})

test("--rule skips a gitignored file and a non-Markdown file under docs/", () => {
  const dir = fixture({
    ".gitignore": "docs/ignored.md\n",
    "docs/ignored.md": "an em — dash\n",
    "docs/page.html": "an em — dash\n",
    "README.md": "clean.\n",
  })
  expect(rule(dir).stdout.toString()).toBe("")
  expect(rule(dir).exitCode).toBe(0)
})

const CHANGELOG = `# Changelog

An em — dash in the preamble is outside the entry text.

## [Unreleased]

- an em — dash in an entry

## [1.2.0 – 1.2.1] - 2026-01-01

- a clean entry

[Unreleased]: https://example.com/compare/v1.2.0–HEAD
`

test("--rule reads the entry text of a changelog and nothing else", () => {
  const dir = fixture({ "CHANGELOG.md": CHANGELOG, "README.md": "clean.\n" })
  const lines = rule(dir).stdout.toString().trim().split("\n")
  expect(lines).toHaveLength(1)
  expect(lines[0]).toContain("CHANGELOG.md:7:")
})

test("--rule runs clean on a repository with no docs directory", () => {
  const dir = fixture({ "README.md": "clean prose.\n" })
  expect(rule(dir).exitCode).toBe(0)
})

test("--rule gives the same answer from any working directory", () => {
  const dir = fixture({ "README.md": "an em — dash\n", "docs/a.md": "an em — dash\n" })
  const here = rule(dir).stdout.toString()
  const there = rule(dir, ["R-DOC-05"], tmpdir()).stdout.toString()
  expect(there).toBe(here)
  expect(rule(dir).stdout.toString()).toBe(here)
})

test("--rule reads a root-level allowlist rather than a flag", () => {
  const dir = fixture({
    "README.md": "## build with Astro\n",
    ".oss-kit.json": JSON.stringify({ "oss-writing": { allow: ["Astro"] } }),
  })
  expect(rule(dir).exitCode).toBe(0)
  const rejected = rule(dir, ["R-DOC-05", "--allow", "Astro"])
  expect(rejected.exitCode).toBe(2)
  expect(rejected.stderr.toString()).toContain("--allow")
})

test("--rule takes at most one root", () => {
  const dir = fixture({ "README.md": "clean.\n" })
  const result = Bun.spawnSync(["node", join(process.cwd(), CHECKER), "--rule", "R-DOC-05", dir, dir])
  expect(result.exitCode).toBe(2)
})

test("--rule names the rules it implements when given one it does not", () => {
  const dir = fixture({ "README.md": "clean.\n" })
  const result = rule(dir, ["R-DOC-99"])
  expect(result.exitCode).toBe(2)
  expect(result.stderr.toString()).toContain("R-DOC-05")
})

test("--rule reports the rule unknown outside a git checkout", () => {
  const dir = fixture({ "README.md": "an em — dash\n", "docs/a.md": "an em — dash\n" }, false)
  const result = rule(dir)
  expect(result.exitCode).toBe(2)
  expect(result.stdout.toString()).toBe("")
  expect(result.stderr.toString()).toContain("git ls-files")
})

test("--rule says so when the rule's file set is empty", () => {
  const dir = fixture({ "src/notes.md": "an em — dash\n" })
  const result = rule(dir)
  expect(result.exitCode).toBe(0)
  expect(result.stdout.toString()).toBe("")
  expect(result.stderr.toString()).toContain("nothing was checked")
})

test("a file named like an option is checked, not swallowed", () => {
  const dir = mkdtempSync(join(tmpdir(), "check-tells-"))
  const file = join(dir, "--allow=x.md")
  writeFileSync(file, "an em — dash\n")
  const result = run(["--", file])
  expect(result.exitCode).toBe(1)
  expect(result.stdout.toString()).toContain("--allow=x.md")
})

test("an astral character does not shift the mask off its target", () => {
  const withEmoji = "\u{1F600}\u{1F600}\u{1F600} hi\n\n```sh\nleverage the robust thing\n```\n"
  expect(maskProse(withEmoji)).toHaveLength(withEmoji.length)
  // Only the three emoji, nothing out of the fence.
  expect(tell(withEmoji).map((finding) => finding.tell)).toEqual(["\u{1F600}", "\u{1F600}", "\u{1F600}"])
})

test("the Breaking marker R-CHG-01 requires is not an inline-header bullet", () => {
  expect(tell("- **Breaking:** dropped X. Use Y.\n")).toHaveLength(0)
  expect(tell("- **Note:** dropped X.\n")).toHaveLength(1)
})
