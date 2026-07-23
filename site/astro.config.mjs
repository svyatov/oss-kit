import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"

export default defineConfig({
  site: "https://oss-kit.svyatov.com",
  integrations: [
    starlight({
      title: "oss-kit",
      description: "One opinionated quality bar for open source repositories.",
      favicon: "/favicon.svg",
      sidebar: [
        { label: "Guides", items: [{ autogenerate: { directory: "guides" } }] },
        { label: "The standard", link: "/standard/" },
        { label: "Rules", items: [{ autogenerate: { directory: "rules" } }] },
        { label: "Skills", items: [{ autogenerate: { directory: "skills" } }] },
        { label: "Changelog", link: "/changelog/" },
      ],
    }),
  ],
})
