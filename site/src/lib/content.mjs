// Vite resolves this at build time, so the read does not depend on the working
// directory. import.meta.url cannot serve here the way it does in
// astro.config.mjs: the config is not bundled, this module is, and the bundler
// rewrites the URL to the output location.
import standardText from "../../../skills/oss-audit/STANDARD.md?raw"
import { parseRules } from "../../scripts/generate.mjs"

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
