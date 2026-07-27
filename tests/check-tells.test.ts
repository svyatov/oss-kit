import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { maskProse, scan } from "../skills/oss-writing/scripts/check-tells.mjs"

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
