import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    starlight({
      title: "Junction",
      description: "Developer-native event collection and routing for scaling teams.",
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
        { label: "What is Junction?", link: "/" },
        {
          label: "Getting Started",
          items: [{ label: "Quickstart", link: "/getting-started/quickstart/" }],
        },
        {
          label: "Guides",
          items: [
            { label: "Integration Guide", link: "/guides/integration/" },
          ],
        },
        {
          label: "Concepts",
          items: [
            { label: "Philosophy", link: "/concepts/philosophy/" },
            { label: "Events", link: "/concepts/events/" },
            { label: "Consent", link: "/concepts/consent/" },
            { label: "Validation", link: "/concepts/validation/" },
            { label: "Architecture", link: "/concepts/architecture/" },
          ],
        },
        {
          label: "Destinations",
          items: [
            { label: "Overview", link: "/destinations/overview/" },
            { label: "GA4", link: "/destinations/ga4/" },
            { label: "Amplitude", link: "/destinations/amplitude/" },
            { label: "Meta", link: "/destinations/meta/" },
            { label: "Plausible", link: "/destinations/plausible/" },
            { label: "HTTP", link: "/destinations/http/" },
          ],
        },
        {
          label: "Integrations",
          items: [
            { label: "Next.js", link: "/integrations/nextjs/" },
            { label: "Astro", link: "/integrations/astro/" },
          ],
        },
        {
          label: "Product",
          items: [
            { label: "Mission", link: "/product/mission/" },
            { label: "Roadmap", link: "/product/roadmap/" },
          ],
        },
      ],
    }),
  ],
});
