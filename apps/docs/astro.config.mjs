import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "Junction",
      description:
        "Developer-native event collection and routing for scaling teams.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/tyssejc/junction",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/tyssejc/junction/edit/main/apps/docs/",
      },
      sidebar: [
        { label: "What is Junction?", slug: "index" },
        {
          label: "Getting Started",
          items: [{ slug: "getting-started/quickstart" }],
        },
        {
          label: "Concepts",
          items: [
            { slug: "concepts/events" },
            { slug: "concepts/consent" },
            { slug: "concepts/validation" },
            { slug: "concepts/architecture" },
          ],
        },
        {
          label: "Destinations",
          items: [
            { slug: "destinations/overview" },
            { slug: "destinations/ga4" },
            { slug: "destinations/amplitude" },
            { slug: "destinations/meta" },
            { slug: "destinations/plausible" },
            { slug: "destinations/http" },
          ],
        },
        {
          label: "Integrations",
          items: [
            { slug: "integrations/nextjs" },
            { slug: "integrations/astro" },
          ],
        },
        {
          label: "Product",
          items: [
            { slug: "product/mission" },
            { slug: "product/roadmap" },
          ],
        },
      ],
    }),
  ],
});
