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

import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import process from "node:process"

const argv = process.argv.slice(2)
const opts = { rules: null, phases: [], files: [] }
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === "--rules") opts.rules = Number(argv[++i])
  else if (a === "--phase") {
    const [name, line] = argv[++i].split(":")
    opts.phases.push({ name, line: Number(line) })
  } else if (a === "--help" || a === "-h") {
    process.stdout.write(`usage: run-metrics.mjs [--rules N] [--phase NAME:LINE]... FILE...

  --rules   rules the run closed, so cost per rule can be reported
  --phase   force a phase boundary at a line, repeatable. Without any, phases
            are split at each Skill invocation and at ExitPlanMode.
`)
    process.exit(0)
  } else opts.files.push(a)
}
if (opts.files.length === 0) { process.stderr.write("run-metrics.mjs: no transcript given, try --help\n"); process.exit(2) }

const n = (x) => x.toLocaleString("en-US")
const m = (x) => `${(x / 1e6).toFixed(1)}M`
const k = (x) => `${Math.round(x / 1000)}k`

async function read(file) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
  const rows = []
  const tools = new Map()
  const resultBytes = new Map()
  const pending = new Map()
  const compactions = []
  const markers = []
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
        pending.set(c.id, c.name)
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
          const name = pending.get(c.tool_use_id) ?? "unknown"
          const size = JSON.stringify(c.content ?? "").length
          const prev = resultBytes.get(name) ?? { n: 0, bytes: 0 }
          prev.n++; prev.bytes += size
          resultBytes.set(name, prev)
        }
      }
    }
  }
  return { file, rows, tools, resultBytes, compactions, markers, userTurns, sidechain, first, last, models }
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
}
