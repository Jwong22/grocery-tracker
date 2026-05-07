import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HooYe — Grocery Tracker",
    short_name: "HooYe",
    description:
      "Track grocery prices and purchases across stores in Malaysia, with travel-cost-adjusted cheapest search.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2f6f5a",
    icons: [
      {
        src: "/hooye-icon.png",
        sizes: "952x876",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/hooye-icon.png",
        sizes: "952x876",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
