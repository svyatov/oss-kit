// Vite resolves this at build time, so the read does not depend on the working
// directory. import.meta.url cannot serve here the way it does in
// astro.config.mjs: the config is not bundled, this module is, and the bundler
// rewrites the URL to the output location.
import readmeText from "../../../README.md?raw"
import standardText from "../../../skills/oss-audit/STANDARD.md?raw"
import { FORGE_LABEL, parseRules, skillSummaries } from "../../scripts/generate.mjs"

export const rules = parseRules(standardText)

export const domains = [...new Set(rules.map((rule) => rule.section))].map((section) => {
  const members = rules.filter((rule) => rule.section === section)
  return {
    area: members[0].area,
    section,
    rules: members,
    skills: [...new Set(members.map((rule) => rule.fixedBy))],
  }
})

export const sampleRule = rules.find((rule) => rule.id === "R-SEC-01")

/** @param {number} n */
const plural = (n) => `${n} ${n === 1 ? "rule" : "rules"}`

export const domainRackItems = domains.map((domain) => ({
  href: `/rules/${domain.area.toLowerCase()}/`,
  icon: domain.area.toLowerCase(),
  name: domain.section,
  meta: domain.skills.join(" + "),
  count: plural(domain.rules.length),
}))

// One entry per area, keyed by area code, so the generated area index page can
// name the one it wants. A rule carries its own ID as the number and no icon:
// see Rack.astro. The forge scope takes the count slot, because "which forge"
// is the one thing that decides whether a rule applies to the reader at all.
export const areaRackItems = Object.fromEntries(
  domains.map((domain) => [
    domain.area.toLowerCase(),
    domain.rules.map((rule) => ({
      href: `/rules/${rule.id.toLowerCase()}/`,
      number: rule.id,
      name: rule.statement,
      meta: rule.fixedBy,
      // The label the rule pages use. The raw token said "both", which names
      // nothing a reader of this page has been shown two of.
      count: FORGE_LABEL[rule.forges],
    })),
  ]),
)

// The skill pages open with the same summaries, so both read them the same way.
export const skills = [...skillSummaries(readmeText)].map(([name, summary]) => {
  const owned = rules.filter((rule) => rule.fixedBy === name)
  return { name, summary, rules: owned, area: owned[0]?.area.toLowerCase() ?? "audit" }
})

export const skillRackItems = skills.map((skill) => ({
  href: `/skills/${skill.name}/`,
  icon: skill.area,
  name: skill.name,
  meta: skill.summary,
  // oss-audit owns no rule by design: it reads across all of them.
  count: skill.rules.length === 0 ? `all ${rules.length} rules` : plural(skill.rules.length),
}))
