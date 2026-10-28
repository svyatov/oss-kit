import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const SCRIPT = "skills/oss-writing/scripts/prose.mjs"

// Runs the script the way a reader would: node, no install, no config.
const run = (body: string, args: string[] = []) => {
  const file = join(mkdtempSync(join(tmpdir(), "prose-")), "t.md")
  writeFileSync(file, body)
  try {
    const stdout = execFileSync("node", [SCRIPT, ...args, file], { encoding: "utf8" })
    return { code: 0, stdout }
  } catch (error) {
    const e = error as { status: number; stdout: string }
    return { code: e.status, stdout: e.stdout }
  }
}

test("reports the three forbidden dashes in prose", () => {
  const { code, stdout } = run("A sentence — with an em dash.\nAnd – an en dash.\nAnd -- two hyphens.\n")
  expect(code).toBe(1)
  expect(stdout).toContain("em-dash")
  expect(stdout).toContain("en-dash")
  expect(stdout).toContain("double-hyphen")
})

// The skill reproduces quoted code, output, and config verbatim, so a dash
// inside a fence or backticks is not a finding. This is also what lets a rule
// name the pattern it forbids.
test("ignores dashes inside fenced blocks and inline code", () => {
  const { code, stdout } = run("Prose is clean here.\n\n```\nsome — output\n```\n\nAnd `a — span` too.\n")
  expect(stdout).toContain("0 finding(s)")
  expect(code).toBe(0)
})

test("keeps longer fences, mixed delimiters and multiline code spans masked", () => {
  const result = run("````md\n```js\ncode — here\n~~~\n```\n````\nAnd ``a ` — span``.\nA `multiline\n— span` too.\nReal — prose.\n")
  expect(result.stdout).toContain(":10:6  em-dash")
  expect(result.stdout).toContain("1 finding(s)")
  expect(run("~~~\ncode — here\n").code).toBe(0)
  expect(run("An unmatched ` leaves — prose.").stdout).toContain("em-dash")
  expect(run("An unmatched ` ends here.\n\nReal — prose with `code`.\n").stdout).toContain(":3:6  em-dash")
})

test("counts sentences across soft wraps, list continuations and block quotes", () => {
  const words = Array.from({ length: 30 }, (_, i) => `word${i}`)
  for (const body of [words.join(" ") + ".", words.slice(0, 15).join(" ") + "\n" + words.slice(15).join(" ") + ".", "- " + words.join(" ") + ".", "> " + words.join(" ") + "."]) {
    expect(run(body, ["--length"]).stdout).toContain("sentence runs 30 words")
  }
  expect(run(words.slice(0, 15).join(" ") + ".\n" + words.slice(15).join(" ") + ".", ["--length"]).code).toBe(0)
})

test("reports a Title Case heading and leaves sentence case alone", () => {
  const bad = run("# A Test Of Title Case\n")
  expect(bad.code).toBe(1)
  expect(bad.stdout).toContain("heading-case")

  const good = run("# A sentence case heading\n\n## Step 6: Report\n\n### 1. Title\n\n#### Using GitHub Actions\n")
  expect(good.stdout).toContain("0 finding(s)")
  expect(good.code).toBe(0)
})

test("reports the six promotional words R-DOC-05 names, and the rest only under --house", () => {
  const body = "This library is robust and comprehensive.\nIt will simply utilize the cache.\n"

  const dflt = run(body)
  expect(dflt.stdout).toContain("robust")
  expect(dflt.stdout).toContain("comprehensive")
  expect(dflt.stdout).not.toContain("utilize")

  const house = run(body, ["--house"])
  expect(house.stdout).toContain("utilize")
  expect(house.stdout).toContain("simply")
})

test("matches overlapping proper names without losing the heading's first word", () => {
  expect(run("# Use Claude Code\n# Use Claude\n").code).toBe(0)
  expect(run("# Claude Code, GitHub Copilot CLI, and VS Code\n").code).toBe(0)
  expect(run("# Claude Code Configuration Guide\n").stdout).toContain("heading-case")
  const file = join(mkdtempSync(join(tmpdir(), "proper-")), "terms.txt")
  writeFileSync(file, "Claude Code Extension\n")
  expect(run("# Use Claude Code Extension\n", ["--proper", file]).code).toBe(0)
})

test("--only narrows the report, and a clean file exits 0", () => {
  const { code, stdout } = run("# A Test Of Title Case\n\nThis is robust.\n", ["--only", "banned-word"])
  expect(stdout).not.toContain("heading-case")
  expect(stdout).toContain("banned-word")
  expect(code).toBe(1)

  expect(run("Plain prose with nothing wrong in it.\n").code).toBe(0)
})
