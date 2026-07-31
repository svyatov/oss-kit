import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const SCRIPT = "skills/oss-audit/scripts/collect.mjs"

const repo = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "collect-"))
  for (const [path, body] of Object.entries(files)) {
    const full = join(dir, path)
    mkdirSync(join(full, ".."), { recursive: true })
    writeFileSync(full, body)
  }
  return JSON.parse(execFileSync("node", [SCRIPT, dir], { encoding: "utf8" }))
}

// The R-CI-05 false fail in a real run came from counting job-shaped lines with
// a regex: a top-level env: block's keys look exactly like job keys.
test("counts jobs structurally, so a top-level env block is not read as jobs", () => {
  const facts = repo({
    ".github/workflows/ci.yml": `name: CI
on:
  push:
    branches: [main]
permissions:
  contents: read
env:
  RAILS_ENV: test
  COVERAGE: "1"
  NOT_A_JOB: yes
jobs:
  test:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
  lint:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
`,
  })
  expect(facts.summary.jobsTotal).toBe(2)
  expect(facts.workflows[0].jobs.map((j: { name: string }) => j.name).sort()).toEqual(["lint", "test"])
  expect(facts.summary.jobsWithTimeout).toBe(1)
})

// A branches: filter under pull_request keys on the base branch, so one naming
// the default branch runs nothing for a stacked change request. R-CI-01 cannot
// be scored from the event name alone.
test("reports each trigger's branch filter, so a filtered pull_request is visible", () => {
  const filtered = repo({
    ".github/workflows/ci.yml": `on:
  push:
    branches: [main]
  pull_request:
    branches: ["main"]
jobs:
  a:
    steps:
      - run: true
`,
  })
  expect(filtered.workflows[0].triggers).toEqual(["push", "pull_request"])
  expect(filtered.workflows[0].triggerFilters.pull_request).toBeDefined()

  const unfiltered = repo({
    ".github/workflows/ci.yml": `on:
  push:
    branches: [main]
  pull_request:
jobs:
  a:
    steps:
      - run: true
`,
  })
  expect(unfiltered.workflows[0].triggerFilters.pull_request).toBeUndefined()
})

// on: takes three shapes and only one of them is a map, so Object.keys over the
// other two reports array indices or nothing where the events should be.
test("lists the events for every shape on: takes", () => {
  const list = repo({ ".github/workflows/a.yml": "on: [push, pull_request]\njobs:\n  a:\n    steps:\n      - run: true\n" })
  expect(list.workflows[0].triggers).toEqual(["push", "pull_request"])
  expect(list.workflows[0].triggerFilters).toEqual({})

  const scalar = repo({ ".github/workflows/a.yml": "on: push\njobs:\n  a:\n    steps:\n      - run: true\n" })
  expect(scalar.workflows[0].triggers).toEqual(["push"])
})

test("reports a uses: as pinned only for a 40 character sha", () => {
  const facts = repo({
    ".github/workflows/ci.yml": `on: [push]
jobs:
  a:
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: ruby/setup-ruby@v1
      - uses: ./.github/actions/local
`,
  })
  expect(facts.summary.externalUses).toBe(2)
  expect(facts.summary.externalUsesUnpinned).toEqual(["ruby/setup-ruby@v1"])
})

// A composite action takes uses: too, so an unpinned action there is invisible
// to any scan that reads only .github/workflows.
test("reads uses: out of a composite action, not only out of workflows", () => {
  const facts = repo({
    ".github/actions/setup/action.yml": `name: Setup
runs:
  using: composite
  steps:
    - uses: actions/cache@v4
`,
  })
  expect(facts.actions).toHaveLength(1)
  expect(facts.summary.externalUsesUnpinned).toEqual(["actions/cache@v4"])
})

test("accepts every license filename the forge detector resolves", () => {
  expect(repo({ "LICENSE.txt": "MIT" }).presence.licenseFiles).toEqual(["LICENSE.txt"])
  expect(repo({ "COPYING": "GPL" }).presence.licenseFiles).toEqual(["COPYING"])
  expect(repo({ "LICENCE.md": "MIT" }).presence.licenseFiles).toEqual(["LICENCE.md"])
  expect(repo({ "README.md": "hi" }).presence.licenseFiles).toEqual([])
})

test("finds a community file at any path its rule accepts", () => {
  const facts = repo({ ".github/CONTRIBUTING.md": "how to help", "docs/SECURITY.md": "report here" })
  expect(facts.presence.community["CONTRIBUTING.md"]).toEqual([".github/CONTRIBUTING.md"])
  expect(facts.presence.community["SECURITY.md"]).toEqual(["docs/SECURITY.md"])
  expect(facts.presence.community["CODE_OF_CONDUCT.md"]).toEqual([])
})

test("gives each README fence its language and the line before it", () => {
  const facts = repo({
    "README.md": `# Thing

One sentence about the thing.

Install it:

\`\`\`sh
npm i thing
\`\`\`

\`\`\`
no language here
\`\`\`
`,
  })
  expect(facts.readme.firstParagraphAfterTitle.text).toBe("One sentence about the thing.")
  expect(facts.readme.fences).toHaveLength(2)
  expect(facts.readme.fences[0].language).toBe("sh")
  expect(facts.readme.fences[0].precededBy).toBe("Install it:")
  expect(facts.readme.fences[1].language).toBeNull()
})
