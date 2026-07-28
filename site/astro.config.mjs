import { readFileSync } from "node:fs"
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import { codeThemes } from "./code-theme.mjs"
import { parseRules } from "./scripts/generate.mjs"

const SITE = "https://oss-kit.svyatov.com"
const REPO = "https://github.com/svyatov/oss-kit"

// The sidebar is built from the standard rather than from filenames, so rules
// appear in the order the standard argues them, grouped under its own headings.
// Autogeneration would sort them alphabetically by ID and split every area.
const rules = parseRules(readFileSync(new URL("../skills/oss-audit/STANDARD.md", import.meta.url), "utf8"))
const areas = [...new Set(rules.map((rule) => rule.section))]
const areaCode = (section) => rules.find((rule) => rule.section === section)?.area.toLowerCase()

// A rule heading in the standard is a full sentence, so the default slug runs
// to 100 characters. The product asks people to cite R-SEC-01, so that is the
// anchor a reader guesses and the one a pull request comment carries.
//
// This claims the id before Astro's own pass, which keeps an id a heading
// already has and records it as the slug, so the anchor link and the contents
// list follow without a second rewrite. Claiming it afterwards is not an
// option: user rehype plugins run first. Nor is emitting the heading as raw
// HTML, which passes through unparsed and would drop the rule from the
// contents list entirely.
const RULE_HEADING = /^(R-[A-Z]{2,3}-\d{2}):/

/** @param {any} node @returns {string} */
const textOf = (node) =>
  node.value ?? (node.children ?? []).map(textOf).join("")

const ruleAnchors = () => (/** @type {any} */ tree) => {
  /** @param {any} node */
  const walk = (node) => {
    if (/^h[1-6]$/.test(node.tagName ?? "")) {
      const match = RULE_HEADING.exec(textOf(node))
      if (match) (node.properties ??= {}).id = (match[1] ?? "").toLowerCase()
    }
    for (const child of node.children ?? []) walk(child)
  }
  walk(tree)
}

/** @param {string} property @param {string} content */
const meta = (property, content) => ({
  tag: /** @type {const} */ ("meta"),
  attrs: property.startsWith("og:") ? { property, content } : { name: property, content },
})

export default defineConfig({
  site: SITE,
  markdown: { rehypePlugins: [ruleAnchors] },
  integrations: [
    starlight({
      title: "oss-kit",
      description: "Curated agent skills for open source maintainers.",
      disable404Route: true,
      favicon: "/icon.svg",
      customCss: ["./src/styles/custom.css"],
      components: {
        Header: "./src/components/Header.astro",
        Hero: "./src/components/HomeHero.astro",
        Footer: "./src/components/Footer.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
      },
      social: [{ icon: "github", label: "GitHub", href: REPO }],
      editLink: { baseUrl: `${REPO}/edit/main/site/` },
      credits: false,
      head: [
        { tag: "link", attrs: { rel: "icon", href: "/favicon.ico", sizes: "32x32" } },
        { tag: "link", attrs: { rel: "apple-touch-icon", href: "/apple-touch-icon.png" } },
        { tag: "link", attrs: { rel: "manifest", href: "/manifest.webmanifest" } },
        meta("og:image", `${SITE}/og.png`),
        meta("og:image:width", "1200"),
        meta("og:image:height", "630"),
        meta("twitter:image", `${SITE}/og.png`),
      ],
      expressiveCode: {
        // Install commands run past 375px, and a docs reader on a phone should
        // not have to scroll a code block sideways to see what to paste.
        // A shell block was drawn as a macOS window, three traffic lights and
        // all, around text nobody is running in macOS. No block in this
        // repository carries a title, so the chrome has nothing left to hold.
        defaultProps: { wrap: true, frame: "none" },
        themes: codeThemes,
        useStarlightUiThemeColors: false,
        styleOverrides: {
          borderColor: "var(--kit-line)",
          borderRadius: "0.5rem",
          frames: { frameBoxShadowCssValue: "none" },
        },
      },
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Getting started", link: "/guides/getting-started/" },
            { label: "Install", link: "/guides/install/" },
            { label: "Adoption guide", link: "/guides/adoption-guide/" },
          ],
        },
        { label: "Standard", link: "/standard/" },
        {
          label: "Skills",
          // Nine skills each expanding their references ran the sidebar past 70
          // links and pushed Rules off the bottom of every viewport.
          collapsed: true,
          items: [{ autogenerate: { directory: "skills" } }],
        },
        {
          label: "Rules",
          // Slug entries rather than link entries, so each page supplies its own
          // sidebar label. Hardcoding one here labelled all seven "Overview",
          // which pagination then repeated as "Next: Overview".
          items: [{ slug: "rules" }, ...areas.map((section) => ({
            label: section,
            collapsed: true,
            items: [
              { slug: `rules/${areaCode(section)}` },
              ...rules.filter((rule) => rule.section === section).map((rule) => `rules/${rule.id.toLowerCase()}`),
            ],
          }))],
        },
        { label: "Changelog", link: "/changelog/" },
      ],
    }),
  ],
})
