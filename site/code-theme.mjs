// Syntax themes for the site's code blocks.
//
// The bundled Shiki themes color tokens across the whole spectrum, which puts
// blue and orange next to a system that spends exactly one accent. These two
// carry the same information with the palette the rest of the site uses: body
// text for code, muted for comments, and diagnostic green for the tokens worth
// finding first. Keep them in step with the tokens in src/styles/custom.css.

/** @param {{name: string, type: "dark"|"light", bg: string, chrome: string, text: string, muted: string, signal: string}} palette */
const theme = ({ name, type, bg, chrome, text, muted, signal }) => ({
  name,
  type,
  colors: {
    "editor.background": bg,
    "editor.foreground": text,
    "editorGroupHeader.tabsBackground": chrome,
    "tab.activeBackground": bg,
    "tab.activeForeground": text,
    "titleBar.activeBackground": chrome,
    "titleBar.activeForeground": muted,
  },
  settings: [
    { settings: { foreground: text } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: muted, fontStyle: "italic" } },
    {
      scope: [
        "string",
        "constant.numeric",
        "constant.language",
        "entity.name.function",
        "entity.name.tag",
        "keyword",
        "storage",
        "support.function",
        "variable.function",
      ],
      settings: { foreground: signal },
    },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: muted } },
  ],
})

export const codeThemes = [
  theme({
    name: "kit-dark",
    type: "dark",
    bg: "#101512",
    chrome: "#0b0f0d",
    text: "#edf3ef",
    muted: "#94a09a",
    signal: "#56f27b",
  }),
  theme({
    name: "kit-light",
    type: "light",
    bg: "#ffffff",
    chrome: "#e9eeeb",
    text: "#111714",
    muted: "#4d5853",
    signal: "#147a35",
  }),
]
