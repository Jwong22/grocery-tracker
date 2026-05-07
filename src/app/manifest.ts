import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grocery Tracker",
    short_name: "Grocer",
    description:
      "Track grocery prices and purchases across stores in Malaysia, with travel-cost-adjusted cheapest search.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    icons: [
      { src: "/icon", sizes: "256x256", type: "image/png" },
    ],
  };
}
