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
