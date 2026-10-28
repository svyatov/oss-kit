import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const PIN = resolve("skills/oss-harden/scripts/resolve-pin.mjs")
const RULESET = resolve("skills/oss-harden/scripts/ruleset.mjs")
const SHA = "a".repeat(40)

function pin(args: string[], responses: Record<string, unknown>, input?: string) {
  const dir = mkdtempSync(join(tmpdir(), "pin-"))
  const preload = join(dir, "fetch.mjs")
  writeFileSync(preload, `const responses = ${JSON.stringify(responses)};
globalThis.fetch = async (url) => {
  const key = new URL(url).pathname;
  if (!(key in responses)) throw new Error('Unexpected request: ' + key);
  return new Response(JSON.stringify(responses[key]), { status: responses[key] === null ? 404 : 200 });
};`)
  try {
    return spawnSync("node", ["--import", preload, PIN, "--json", ...args], { encoding: "utf8", input })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test("dereferences every annotated tag layer and rejects non-commit targets", () => {
  const responses = {
    "/repos/a/b/git/ref/tags/v1": { object: { type: "tag", sha: "outer" } },
    "/repos/a/b/git/tags/outer": { object: { type: "tag", sha: "inner" } },
    "/repos/a/b/git/tags/inner": { object: { type: "commit", sha: SHA } },
  }
  const result = pin(["a/b@v1"], responses)
  expect(result.status).toBe(0)
  expect(JSON.parse(result.stdout)[0].sha).toBe(SHA)
  responses["/repos/a/b/git/tags/inner"].object.type = "tree"
  expect(pin(["a/b@v1"], responses).status).toBe(1)
})

test("preserves lightweight tags, branch fallback and explicit commit pins", () => {
  const responses = {
    "/repos/a/b/git/ref/tags/v1": { object: { type: "commit", sha: SHA } },
    "/repos/a/b/git/ref/tags/main": null,
    "/repos/a/b/git/ref/heads/main": { object: { type: "commit", sha: SHA } },
  }
  const result = pin(["a/b@v1", "a/b@main", `a/b@${SHA}`], responses)
  expect(result.status).toBe(0)
  expect(JSON.parse(result.stdout).map((item: { kind: string }) => item.kind)).toEqual(["tag", "branch", "already a sha"])
})

test("workflow extraction accepts quoted keys and fails closed on unsupported mappings", () => {
  const responses = { "/repos/a/b/git/ref/tags/v1": { object: { type: "commit", sha: SHA } } }
  const good = pin(["-"], responses, 'steps:\n  - "uses": a/b@v1\n  - uses: ./local\n  - run: |\n      echo "uses: fake/repo@v1"\n')
  expect(good.status).toBe(0)
  expect(JSON.parse(good.stdout)).toHaveLength(1)
  for (const input of ['steps:\n  - { uses: a/b@v1 }\n', 'steps: *shared\n', 'steps:\n  - uses: >-\n      a/b@v1\n']) {
    const bad = pin(["-"], responses, input)
    expect(bad.status).not.toBe(0)
    expect(bad.stderr).toContain("workflow")
  }
  expect(pin(["-"], {}, "steps:\n  - uses: ./local\n").status).toBe(0)
})

test("workflow extraction handles both block-indicator orders and aliases in sequences", () => {
  for (const indicator of ["|2-", "|-2", ">2-", ">-2"]) {
    const input = `steps:\n  - run: ${indicator}\n      uses: fake/repo@${SHA}\n  - uses: real/repo@${SHA}\n`
    const result = pin(["-"], {}, input)
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout).map((item: { owner: string }) => item.owner)).toEqual(["real"])
  }
  for (const input of ["steps: [*shared]\n", `steps:\n  - ? uses\n    : a/b@${SHA}\n`]) {
    const result = pin(["-"], {}, input)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("unsupported")
  }
})

test("ruleset list and lookup include later pages before a read or write", () => {
  const dir = mkdtempSync(join(tmpdir(), "ruleset-"))
  const log = join(dir, "calls.jsonl")
  const gh = join(dir, "gh")
  writeFileSync(gh, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + '\\n');
const current = { id: 31, name: 'target', target: 'branch', enforcement: 'active', rules: [{ type: 'deletion' }] };
if (args[1].endsWith('/rulesets/31')) console.log(JSON.stringify(current));
else if (args.includes('--paginate') && args.includes('--slurp')) console.log(JSON.stringify([[{id:1,name:'first'}],[current]]));
else console.log(JSON.stringify([{id:1,name:'first'}]));
`)
  chmodSync(gh, 0o755)
  const patch = join(dir, "patch.json")
  writeFileSync(patch, '{"enforcement":"active"}')
  const run = (args: string[]) => spawnSync("node", [RULESET, ...args], { encoding: "utf8", env: { ...process.env, PATH: `${dir}:${process.env.PATH}` } })
  try {
    expect(JSON.parse(run(["get", "a/b"]).stdout)).toHaveLength(2)
    expect(JSON.parse(run(["get", "a/b", "target"]).stdout).id).toBe(31)
    expect(JSON.parse(run(["get", "a/b", "31"]).stdout).id).toBe(31)
    expect(run(["put", "a/b", "target", patch]).status).toBe(0)
    expect(readFileSync(log, "utf8")).toContain('"PUT"')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
