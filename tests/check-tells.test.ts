import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { PATTERNS, maskProse, scan } from "../skills/oss-writing/scripts/check-tells.mjs"

const CHECKER = "skills/oss-writing/scripts/check-tells.mjs"

const run = (args: string[], stdin?: string) =>
  Bun.spawnSync(["node", CHECKER, ...args], { stdin: stdin === undefined ? "ignore" : Buffer.from(stdin) })

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
    expect(pattern.match.global, pattern.id).toBe(true)
  }
  expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(PATTERNS.length)
})
