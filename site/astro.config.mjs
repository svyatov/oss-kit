import { readFileSync } from "node:fs"
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import { parseRules } from "./scripts/generate.mjs"

const SITE = "https://oss-kit.svyatov.com"
const REPO = "https://github.com/svyatov/oss-kit"

// The sidebar is built from the standard rather than from filenames, so rules
// appear in the order the standard argues them, grouped under its own headings.
// Autogeneration would sort them alphabetically by ID and split every area.
const rules = parseRules(readFileSync(new URL("../skills/oss-audit/STANDARD.md", import.meta.url), "utf8"))
const areas = [...new Set(rules.map((rule) => rule.section))]

/** @param {string} property @param {string} content */
const meta = (property, content) => ({
  tag: /** @type {const} */ ("meta"),
  attrs: property.startsWith("og:") ? { property, content } : { name: property, content },
})

export default defineConfig({
  site: SITE,
  integrations: [
    starlight({
      title: "oss-kit",
      description: "One opinionated quality bar for open source repositories.",
      favicon: "/favicon.svg",
      social: [{ icon: "github", label: "GitHub", href: REPO }],
      editLink: { baseUrl: `${REPO}/edit/main/site/` },
      head: [
        meta("og:image", `${SITE}/og.png`),
        meta("og:image:width", "1200"),
        meta("og:image:height", "630"),
        meta("twitter:image", `${SITE}/og.png`),
      ],
      expressiveCode: {
        // Install commands run past 375px, and a docs reader on a phone should
        // not have to scroll a code block sideways to see what to paste.
        defaultProps: { wrap: true },
      },
      sidebar: [
        { label: "Guides", items: [{ autogenerate: { directory: "guides" } }] },
        { label: "The standard", link: "/standard/" },
        {
          label: "Rules",
          items: areas.map((section) => ({
            label: section,
            collapsed: true,
            items: rules.filter((rule) => rule.section === section).map((rule) => `rules/${rule.id.toLowerCase()}`),
          })),
        },
        { label: "Skills", items: [{ autogenerate: { directory: "skills" } }] },
        { label: "Changelog", link: "/changelog/" },
      ],
    }),
  ],
})
