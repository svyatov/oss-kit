import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { PATTERNS, maskProse, scan } from "../skills/oss-writing/scripts/check-tells.mjs"

const CHECKER = "skills/oss-writing/scripts/check-tells.mjs"

// Run from an empty directory, so a relative path a test writes cannot collide
// with a file of the same name in the repository.
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

test("a title-case heading reports the heading once", () => {
  expect(headings("## Setting Up The Cache\n")).toEqual(["Setting Up The Cache"])
})

test("a sentence-case heading reports nothing", () => {
  expect(headings("## setting up the cache\n")).toHaveLength(0)
})

test("a heading whose first word is capitalized reports nothing", () => {
  expect(headings("## Setting up the cache\n")).toHaveLength(0)
})

test("one lowercase word clears a heading of proper nouns", () => {
  expect(headings("## read the Actions log\n")).toHaveLength(0)
})

test("two capitalized words are a product name, not Title Case", () => {
  expect(headings("## configure GitHub Actions\n")).toHaveLength(0)
})

test("a rule heading needs no label rule to clear the check", () => {
  expect(headings("### R-DOC-01: The README opens with one sentence\n")).toHaveLength(0)
})

test("a step heading needs no label rule to clear the check", () => {
  expect(headings("## Step 1: Find STANDARD.md\n")).toHaveLength(0)
})

test("an all-caps acronym does not count toward the run", () => {
  expect(headings("## Read The CHANGELOG Now\n")).toHaveLength(0)
})

test("a path or a filename does not count toward the run", () => {
  expect(headings("## Generate site/src/content From AGENTS.md\n")).toHaveLength(0)
})

test("a heading ending in a period still counts its last word", () => {
  expect(headings("## Warm The Cache Now.\n")).toEqual(["Warm The Cache Now."])
})

test("a code span is not prose, so its words do not count", () => {
  expect(headings("## Read `the` Cache Now Today\n")).toEqual(["Read `the` Cache Now Today"])
})

test("a hash inside a fenced block is not a heading", () => {
  expect(headings("```\n# Not A Heading Here\n```\n")).toHaveLength(0)
})

test("a CRLF file quotes the heading, not the line after it", () => {
  expect(headings("intro line\r\n\r\n## Setting Up The Cache\r\n")).toEqual(["Setting Up The Cache"])
})

const COC = `# Code of conduct

## Our Pledge

We pledge to make participation a harassment-free experience.

## Enforcement Guidelines

## 3. Temporary Ban
`

// The check used to exempt a code of conduct that attributed a third-party
// document, because it reported every capitalized word. Deciding on the whole
// heading makes the exemption unnecessary: the Contributor Covenant's headings
// are one or two words long, so none of them reaches the run length.
test("a verbatim code of conduct clears the check with no exemption", () => {
  expect(scan(COC, "CODE_OF_CONDUCT.md")).toHaveLength(0)
})

test("a code of conduct is still checked for dashes and emoji", () => {
  expect(scan(`${COC}\nan em — dash \u{1F680}\n`, "CODE_OF_CONDUCT.md")).toHaveLength(2)
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
  const file = join(dir, "--rule=x.md")
  writeFileSync(file, "an em — dash\n")
  const result = run(["--", file])
  expect(result.exitCode).toBe(1)
  expect(result.stdout.toString()).toContain("--rule=x.md")
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
