#!/usr/bin/env node
// Reports what a kit run cost, from a Claude Code session transcript.
//
// Maintenance code: it runs here, not on a reader's machine, so R-SKL-05 does
// not reach it. Node or Bun.
//
//   bun scripts/run-metrics.mjs ~/.claude/projects/<slug>/<session>.jsonl
//   bun scripts/run-metrics.mjs --rules 22 --phase audit:1 --phase fix:186 FILE
//
// The headline number is billed context: input plus cache read plus cache
// write, summed over every assistant turn. It is the number that grows with
// the square of a long session, because each turn re-reads the whole window,
// and it is where a fix phase spends its budget.

import { createReadStream, readFileSync } from "node:fs"
import { createInterface } from "node:readline"
import process from "node:process"

const argv = process.argv.slice(2)
const opts = { rules: null, phases: [], files: [], reports: null }
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === "--rules") opts.rules = Number(argv[++i])
  else if (a === "--reports") opts.reports = [argv[++i], argv[++i]]
  else if (a === "--phase") {
    const [name, line] = argv[++i].split(":")
    opts.phases.push({ name, line: Number(line) })
  } else if (a === "--help" || a === "-h") {
    process.stdout.write(`usage: run-metrics.mjs [--rules N] [--phase NAME:LINE]... FILE...
       run-metrics.mjs --reports BEFORE.md AFTER.md

  --rules     rules the run closed, so cost per rule can be reported
  --phase     force a phase boundary at a line, repeatable. Without any, phases
              are split at each Skill invocation and at ExitPlanMode.
  --reports   two oss-audit-report.md files, the first run's and the eighth
              step's. Reports verdicts that moved, and specifically the ones
              that went pass to fail, which are findings the run itself caused.
`)
    process.exit(0)
  } else opts.files.push(a)
}
if (opts.files.length === 0 && !opts.reports) {
  process.stderr.write("run-metrics.mjs: no transcript given, try --help\n")
  process.exit(2)
}

const n = (x) => x.toLocaleString("en-US")
const m = (x) => `${(x / 1e6).toFixed(1)}M`
const k = (x) => `${Math.round(x / 1000)}k`

// What a call was aimed at, so two calls aimed at the same thing collapse to
// one key. A repeat is only interesting when it is the same target, not the
// same tool.
function targetOf(name, input) {
  if (!input || typeof input !== "object") return name
  if (input.file_path) return `${name} ${input.file_path}`
  if (input.url) return `${name} ${input.url}`
  if (input.command) return `${name} ${String(input.command).trim().replace(/\s+/g, " ")}`
  if (input.pattern) return `${name} ${input.pattern} ${input.path ?? ""}`.trim()
  if (input.query) return `${name} ${input.query}`
  return `${name} ${JSON.stringify(input).slice(0, 200)}`
}

// A failed call costs the same context as a successful one and buys nothing, so
// the split by cause is what says whether the fix is a script, a prompt, or a
// permission. Matched against the result text, which is what the model read.
const CAUSES = [
  ["refused", /requested permissions|user doesn't want|has been rejected|declined|not allowed to use/i],
  ["flag or field", /unknown option|unrecognized|invalid (?:option|flag|property|argument)|no such option|unexpected argument|missing required/i],
  ["not found", /\b404\b|not found|could not resolve host|no such file|does not exist/i],
  ["non-zero exit", /exit code|command failed|error:/i],
]

function causeOf(text) {
  for (const [label, pattern] of CAUSES) if (pattern.test(text)) return label
  return "other"
}

async function read(file) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
  const rows = []
  const tools = new Map()
  const resultBytes = new Map()
  const pending = new Map()
  const compactions = []
  const markers = []
  const errors = new Map()
  const seen = new Map()
  let calls = 0, failed = 0, repeats = 0, repeatBytes = 0, postCompactRepeats = 0
  let line = 0, userTurns = 0, sidechain = 0, first = null, last = null
  const models = new Map()

  for await (const raw of rl) {
    line++
    if (!raw.trim()) continue
    let o
    try { o = JSON.parse(raw) } catch { continue }
    if (o.timestamp) { first ??= o.timestamp; last = o.timestamp }
    if (o.isSidechain) sidechain++
    if (o.subtype === "compact_boundary") {
      compactions.push({ line, trigger: o.compactMetadata?.trigger ?? "?", pre: o.compactMetadata?.preTokens ?? 0 })
    }
    const msg = o.message
    if (!msg) continue

    if (o.type === "assistant") {
      const u = msg.usage
      if (u) {
        rows.push({
          line,
          ctx: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
          out: u.output_tokens ?? 0,
        })
        if (msg.model) models.set(msg.model, (models.get(msg.model) ?? 0) + 1)
      }
      for (const c of msg.content ?? []) {
        if (c.type !== "tool_use") continue
        tools.set(c.name, (tools.get(c.name) ?? 0) + 1)
        pending.set(c.id, { name: c.name, target: targetOf(c.name, c.input), line })
        if (c.name === "Skill") markers.push({ line, label: `skill:${c.input?.skill ?? "?"}` })
        if (c.name === "ExitPlanMode") markers.push({ line, label: "plan-approved" })
        if (c.name === "Write" && /oss-audit-report\.md$/.test(c.input?.file_path ?? "")) {
          markers.push({ line, label: "audit-report-written" })
        }
      }
    }

    if (o.type === "user") {
      const content = msg.content
      // A human turn is plain text. A tool result or a system reminder is not.
      if (typeof content === "string") {
        if (!content.startsWith("<") && !content.startsWith("Caveat:")) userTurns++
      } else {
        for (const c of content ?? []) {
          if (c.type === "text" && !c.text.startsWith("<") && c.text.trim()) userTurns++
          if (c.type !== "tool_result") continue
          const call = pending.get(c.tool_use_id) ?? { name: "unknown", target: "unknown", line }
          const name = call.name
          const body = JSON.stringify(c.content ?? "")
          const size = body.length
          const prev = resultBytes.get(name) ?? { n: 0, bytes: 0 }
          prev.n++; prev.bytes += size
          resultBytes.set(name, prev)

          calls++
          if (c.is_error) {
            failed++
            const cause = causeOf(body)
            const bucket = errors.get(cause) ?? { n: 0, tools: new Map() }
            bucket.n++
            bucket.tools.set(name, (bucket.tools.get(name) ?? 0) + 1)
            errors.set(cause, bucket)
          }

          // Bytes re-read: a call whose target was already answered once. Only
          // read-shaped tools count, because issuing the same edit twice is a
          // different thing from reading the same file twice.
          if (/^(Read|Grep|Glob|WebFetch|WebSearch|Bash|NotebookRead)$/.test(name)) {
            const before = seen.get(call.target)
            if (before) {
              repeats++
              repeatBytes += size
              before.n++
              before.bytes += size
              if (compactions.some((cp) => cp.line < call.line && call.line - cp.line <= 40)) postCompactRepeats++
            } else {
              seen.set(call.target, { n: 1, bytes: size, line: call.line })
            }
          }
        }
      }
    }
  }
  return {
    file, rows, tools, resultBytes, compactions, markers, userTurns, sidechain, first, last, models,
    calls, failed, errors, seen, repeats, repeatBytes, postCompactRepeats,
  }
}

// Step 8 of oss-audit diffs two reports. A verdict that went pass to fail is a
// finding the run itself created, which is the only metric here that measures
// the kit's correctness rather than its cost.
export function verdicts(text) {
  const out = new Map()
  for (const line of text.split("\n")) {
    const match = /^-\s+(R-[A-Z]+-\d{2})\s+(pass|fail|unknown|n\/a)\b\s*(.*)$/.exec(line.trim())
    if (match) out.set(match[1], { status: match[2], evidence: match[3].trim() })
  }
  return out
}

export function diffReports(beforeText, afterText) {
  const before = verdicts(beforeText)
  const after = verdicts(afterText)
  const moved = []
  for (const [id, a] of after) {
    const b = before.get(id)
    if (!b || b.status === a.status) continue
    moved.push({ id, from: b.status, to: a.status, evidence: a.evidence })
  }
  return {
    scored: after.size,
    moved,
    fixed: moved.filter((x) => x.from === "fail" && x.to === "pass"),
    caused: moved.filter((x) => x.from === "pass" && x.to === "fail"),
  }
}

function phasesFor(r) {
  if (opts.phases.length > 0) return [...opts.phases].sort((a, b) => a.line - b.line)
  const out = [{ name: "start", line: 1 }]
  for (const mk of r.markers) out.push({ name: mk.label, line: mk.line })
  return out
}

for (const file of opts.files) {
  const r = await read(file)
  const total = r.rows.reduce((s, x) => s + x.ctx, 0)
  const out = r.rows.reduce((s, x) => s + x.out, 0)
  const peak = r.rows.reduce((s, x) => Math.max(s, x.ctx), 0)
  const mins = r.first && r.last ? Math.round((Date.parse(r.last) - Date.parse(r.first)) / 60000) : 0

  process.stdout.write(`\n${file}\n${"=".repeat(Math.min(file.length, 78))}\n`)
  process.stdout.write(`turns ${r.rows.length} assistant, ${r.userTurns} human, ${r.sidechain} sidechain\n`)
  process.stdout.write(`wall  ${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, "0")}m\n`)
  process.stdout.write(`billed context ${m(total)}  output ${n(out)}  mean ${k(total / (r.rows.length || 1))}  peak ${k(peak)}\n`)
  process.stdout.write(`models ${[...r.models].map(([a, b]) => `${a} x${b}`).join(", ")}\n`)

  if (r.compactions.length) {
    process.stdout.write(`compactions ${r.compactions.length}: ${r.compactions.map((c) => `${c.trigger}@${k(c.pre)}`).join(", ")}\n`)
  } else {
    process.stdout.write("compactions 0\n")
  }

  if (opts.rules) {
    process.stdout.write(`per rule closed (${opts.rules}): ${m(total / opts.rules)} context, ${Math.round(r.rows.length / opts.rules)} turns\n`)
  }

  const phases = phasesFor(r)
  process.stdout.write("\nphases\n")
  for (let i = 0; i < phases.length; i++) {
    const from = phases[i].line
    const to = phases[i + 1]?.line ?? Infinity
    const seg = r.rows.filter((x) => x.line >= from && x.line < to)
    if (seg.length === 0) continue
    const c = seg.reduce((s, x) => s + x.ctx, 0)
    process.stdout.write(
      `  ${phases[i].name.padEnd(28)} turns ${String(seg.length).padStart(4)}  ${m(c).padStart(6)} ` +
      `(${String(Math.round((100 * c) / total)).padStart(2)}%)  mean ${k(c / seg.length)}\n`,
    )
  }

  const byBytes = [...r.resultBytes].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 8)
  process.stdout.write("\ntool calls, by result bytes\n")
  for (const [name, v] of byBytes) {
    process.stdout.write(`  ${name.padEnd(38)} ${String(r.tools.get(name) ?? v.n).padStart(4)} calls  ${n(v.bytes).padStart(11)} chars\n`)
  }

  const browser = [...r.resultBytes].filter(([name]) => name.includes("chrome") || name.includes("browser"))
  if (browser.length) {
    const calls = browser.reduce((s, [, v]) => s + v.n, 0)
    const bytes = browser.reduce((s, [, v]) => s + v.bytes, 0)
    process.stdout.write(`\nbrowser ${calls} calls, ${n(bytes)} chars of result, roughly ${k(bytes / 4)} tokens\n`)
  }

  const rate = r.calls ? (100 * r.failed) / r.calls : 0
  process.stdout.write(`\nrework ${r.failed} of ${r.calls} calls failed (${rate.toFixed(1)}%)\n`)
  for (const [cause, v] of [...r.errors].sort((a, b) => b[1].n - a[1].n)) {
    const top = [...v.tools].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, c]) => `${t} x${c}`).join(", ")
    process.stdout.write(`  ${cause.padEnd(16)} ${String(v.n).padStart(4)}  ${top}\n`)
  }

  const worst = [...r.seen].filter(([, v]) => v.n > 1).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 6)
  process.stdout.write(
    `\nredundancy ${r.repeats} repeat reads, ${n(r.repeatBytes)} chars re-read, ` +
    `roughly ${k(r.repeatBytes / 4)} tokens; ${r.postCompactRepeats} within 40 lines of a compaction\n`,
  )
  for (const [target, v] of worst) {
    // n is every read of this target and bytes is their sum, so the waste is
    // everything after the first.
    process.stdout.write(`  x${String(v.n).padStart(3)}  ${n(Math.round(v.bytes - v.bytes / v.n)).padStart(9)} chars wasted  ${target.slice(0, 84)}\n`)
  }
}

if (opts.reports) {
  const [beforePath, afterPath] = opts.reports
  const d = diffReports(readFileSync(beforePath, "utf8"), readFileSync(afterPath, "utf8"))
  process.stdout.write(`\n${beforePath} to ${afterPath}\n`)
  process.stdout.write(`${d.scored} verdicts in the second report, ${d.moved.length} moved\n`)
  process.stdout.write(`fixed  ${d.fixed.length}: ${d.fixed.map((x) => x.id).join(", ") || "none"}\n`)
  process.stdout.write(`caused ${d.caused.length}: ${d.caused.map((x) => x.id).join(", ") || "none"}\n`)
  for (const x of d.caused) process.stdout.write(`  ${x.id} pass to fail, ${x.evidence}\n`)
  for (const x of d.moved.filter((y) => !d.fixed.includes(y) && !d.caused.includes(y))) {
    process.stdout.write(`  ${x.id} ${x.from} to ${x.to}, ${x.evidence}\n`)
  }
}
