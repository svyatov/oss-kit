import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { leadClause, parseRules } from "../site/scripts/generate.mjs"

// The homepage quotes the standard in three places: the hero's example route,
// the workflow trace, and the rule-contract panel. Two of the three used to be
// transcribed by hand, and one of those transcriptions was wrong. Under the
// heading "Read the bar before you adopt it", the panel gave R-CI-01's Check as
// "The workflow declares both trigger paths." The real Check turns on a
// `pull_request` trigger carrying no `branches:` filter, and says outright that
// a configuration carrying one fails the rule rather than passing it. So the
// panel told a repository with `branches: [main]` that it passed. Nothing
// failed: the page's factual accuracy was the one thing in this repository no
// check covered, while the rest of it enforces R-DOC-04 against exactly this.
//
// These tests hold the page to deriving what it quotes. They do not compare
// rendered output, which would need a build; they hold the sources to the
// shape that makes rendered output correct by construction.
const standard = readFileSync("skills/oss-audit/STANDARD.md", "utf8")
const rules = parseRules(standard)

const HOMEPAGE = ["site/src/content/docs/index.mdx", "site/src/components/HomeHero.astro"]
const sources = HOMEPAGE.map((path) => ({ path, text: readFileSync(path, "utf8") }))

// Comment bodies are stripped first. They quote the wrong old wording on
// purpose, to record what went wrong, and a check that punished them would
// teach the next person to delete the explanation instead of the defect.
const withoutComments = (text: string) => text.replaceAll(/\{?\/\*[\s\S]*?\*\/\}?/g, "")

describe("rule claims on the homepage", () => {
  test("the standard supplies the two rules the homepage takes apart", () => {
    // A guard on the guard: if either ID is renamed, the tests below would
    // silently check an undefined rule and pass.
    expect(rules.map((rule) => rule.id)).toContain("R-SEC-01")
    expect(rules.map((rule) => rule.id)).toContain("R-CI-01")
  })

  for (const rule of rules) {
    test(`${rule.id}'s lead clause is a verbatim prefix of its Check`, () => {
      const lead = leadClause(rule.check)
      expect(rule.check.startsWith(lead)).toBe(true)
      expect(lead.length).toBeGreaterThan(0)
      // A prefix that runs to the whole Check quotes correctly but abridges
      // nothing, which is the failure the panels reach for it to avoid.
      // R-SEC-01 and R-CI-01 are the two the homepage renders.
      if (rule.id === "R-SEC-01" || rule.id === "R-CI-01") {
        expect(lead.length).toBeLessThan(rule.check.length)
      }
    })
  }

  // A label naming a rule field, as the three quoting blocks write it: a bare
  // Statement or Check, or one numbered by the workflow trace's step counter.
  const FIELD = /<(?:code|dt|span[^>]*)>\s*(?:\d+\s*·\s*)?(Check|Statement)\s*<\/(?:code|dt|span)>/g

  for (const { path, text } of sources) {
    test(`${path} writes out no rule field by hand`, () => {
      const body = withoutComments(text)
      const handwritten: string[] = []
      for (const label of body.matchAll(FIELD)) {
        const after = body.slice(label.index + label[0].length).slice(0, 400)
        const open = /<(p|dd)[^>]*>/.exec(after)
        if (!open) continue
        const value = after.slice(open.index + open[0].length).trimStart()
        // The field's value has to be an expression: either the rule property
        // directly, or a component handed one. A literal sentence here is the
        // defect, whatever it says, because nothing downstream can tell whether
        // it still matches the rule it claims to quote.
        const derived = value.startsWith("{") || /^<[A-Z][^>]*\{/.test(value)
        if (!derived) handwritten.push(`${label[1]}: ${value.slice(0, 72)}`)
      }
      expect(handwritten).toEqual([])
    })

    test(`${path} reads each rule field it renders from the rule`, () => {
      const body = withoutComments(text)
      // Rendering a rule means naming its fields as properties. A page that
      // stopped doing this would pass the check above by having nothing left
      // to check, so the derivation itself is asserted.
      const rendered = /\{(contractRule|sampleRule)[?.]/.test(body)
      if (!rendered) return
      expect(body).toMatch(/\{(contractRule|sampleRule)\??\.statement\}/)
      expect(body).toMatch(/leadClause\((contractRule|sampleRule)\.check\)/)
    })
  }

  test("the contract panel reads every field of its rule, including forge scope", () => {
    // The panel's Fixed by and forge scope were transcribed too, and they were
    // right. Being right by luck is what this stops: the rule that changes a
    // fixing skill changes nothing on the homepage today.
    const body = withoutComments(readFileSync("site/src/content/docs/index.mdx", "utf8"))
    expect(body).toMatch(/\{contractRule\.fixedBy\}/)
    expect(body).toMatch(/FORGE_LABEL\[contractRule\.forges\]/)
  })

  test("both quoting panels link to the full check", () => {
    // An abridgement is honest only where the whole clause is one click away.
    for (const { path, text } of sources) {
      const body = withoutComments(text)
      if (!/leadClause\(/.test(body)) continue
      expect({ path, linked: /#\$\{[a-zA-Z]+\.id\.toLowerCase\(\)\}-check/.test(body) }).toEqual({
        path,
        linked: true,
      })
    }
  })
})
