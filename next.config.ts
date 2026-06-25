import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disable the service worker in development to avoid stale caches.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
