import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ACL Rehab Tracker",
    short_name: "ACL Rehab",
    description: "Personal ACL reconstruction rehab tracker",
    start_url: "/today",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0d9488",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
