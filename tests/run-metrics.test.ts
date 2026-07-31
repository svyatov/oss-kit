import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const SCRIPT = "scripts/run-metrics.mjs"

const assistant = (input: number, read: number, write: number, out: number, content: unknown[] = []) =>
  JSON.stringify({
    type: "assistant",
    timestamp: "2026-07-31T13:00:00.000Z",
    message: {
      model: "claude-opus-5",
      content,
      usage: { input_tokens: input, cache_read_input_tokens: read, cache_creation_input_tokens: write, output_tokens: out },
    },
  })

const run = (lines: string[], args: string[] = []) => {
  const file = join(mkdtempSync(join(tmpdir(), "metrics-")), "s.jsonl")
  writeFileSync(file, lines.join("\n") + "\n")
  return execFileSync("bun", [SCRIPT, ...args, file], { encoding: "utf8" })
}

test("billed context sums input, cache read, and cache write across assistant turns", () => {
  const out = run([assistant(100, 900_000, 100_000, 50), assistant(100, 900_000, 100_000, 50)])
  // (100 + 900000 + 100000) * 2 = 2,000,200
  expect(out).toContain("billed context 2.0M")
  expect(out).toContain("output 100")
  expect(out).toContain("turns 2 assistant")
})

test("counts compaction boundaries and reports the pre-compaction size", () => {
  const out = run([
    assistant(1, 1000, 0, 1),
    JSON.stringify({ type: "system", subtype: "compact_boundary", compactMetadata: { trigger: "manual", preTokens: 202_810 } }),
    assistant(1, 1000, 0, 1),
  ])
  expect(out).toContain("compactions 1")
  expect(out).toContain("manual@203k")
})

test("splits phases at an explicit boundary and shares out the context", () => {
  const out = run(
    [assistant(0, 1_000_000, 0, 1), assistant(0, 3_000_000, 0, 1)],
    ["--phase", "audit:1", "--phase", "fix:2"],
  )
  expect(out).toMatch(/audit\s+turns\s+1\s+1\.0M \(25%\)/)
  expect(out).toMatch(/fix\s+turns\s+1\s+3\.0M \(75%\)/)
})

test("attributes tool result bytes to the tool that was called", () => {
  const call = assistant(1, 1000, 0, 1, [{ type: "tool_use", id: "t1", name: "Bash", input: { command: "ls" } }])
  const result = JSON.stringify({
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "x".repeat(500) }] },
  })
  const out = run([call, result])
  expect(out).toContain("Bash")
  expect(out).toMatch(/Bash\s+1 calls/)
})

test("reports cost per rule when told how many closed", () => {
  const out = run([assistant(0, 4_000_000, 0, 1)], ["--rules", "2"])
  expect(out).toContain("per rule closed (2): 2.0M context")
})

const toolCall = (id: string, name: string, input: unknown) =>
  assistant(1, 1000, 0, 1, [{ type: "tool_use", id, name, input }])

const toolResult = (id: string, content: string, isError = false) =>
  JSON.stringify({
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: id, content, ...(isError ? { is_error: true } : {}) }] },
  })

// A failed call costs the same context as a successful one. The split by cause
// is what says whether the fix is a script, a prompt, or a permission.
test("counts failed tool calls and splits them by cause", () => {
  const out = run([
    toolCall("a", "Bash", { command: "mix hex.user key generate --key-name x" }),
    toolResult("a", "--key-name : Unknown option", true),
    toolCall("b", "WebFetch", { url: "https://example.com/main/action.yml" }),
    toolResult("b", "404 Not Found", true),
    toolCall("c", "Bash", { command: "ls" }),
    toolResult("c", "ok"),
  ])
  expect(out).toContain("rework 2 of 3 calls failed (66.7%)")
  expect(out).toMatch(/flag or field\s+1/)
  expect(out).toMatch(/not found\s+1/)
})

// Reading the same file twice is billed twice and buys nothing. Keying on the
// target rather than on the tool is what makes the repeat visible.
test("counts a re-read of the same target as redundancy", () => {
  const out = run([
    toolCall("a", "Read", { file_path: "/repo/README.md" }),
    toolResult("a", "y".repeat(1000)),
    toolCall("b", "Read", { file_path: "/repo/README.md" }),
    toolResult("b", "y".repeat(1000)),
    toolCall("c", "Read", { file_path: "/repo/OTHER.md" }),
    toolResult("c", "z".repeat(10)),
  ])
  expect(out).toContain("redundancy 1 repeat reads")
  expect(out).toContain("/repo/README.md")
  expect(out).not.toContain("/repo/OTHER.md")
})

// The only metric here that measures the kit's correctness rather than its
// cost: a verdict that went pass to fail is a finding the run itself created.
test("diffs two audit reports and separates fixes from findings the run caused", () => {
  const dir = mkdtempSync(join(tmpdir(), "reports-"))
  const before = join(dir, "before.md")
  const after = join(dir, "after.md")
  writeFileSync(
    before,
    ["- R-COM-01 fail no LICENSE file", "- R-SEC-08 pass Gemfile.lock committed, bundle install frozen", "- R-DOC-01 pass README.md:3"].join("\n"),
  )
  writeFileSync(
    after,
    ["- R-COM-01 pass LICENSE added", "- R-SEC-08 fail .github/workflows/release.yml:30 runs bundle install unfrozen", "- R-DOC-01 pass README.md:3"].join("\n"),
  )
  const out = execFileSync("bun", [SCRIPT, "--reports", before, after], { encoding: "utf8" })
  expect(out).toContain("3 verdicts in the second report, 2 moved")
  expect(out).toContain("fixed  1: R-COM-01")
  expect(out).toContain("caused 1: R-SEC-08")
  expect(out).toContain("R-SEC-08 pass to fail, .github/workflows/release.yml:30")
})
