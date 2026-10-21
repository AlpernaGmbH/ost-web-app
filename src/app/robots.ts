import type { MetadataRoute } from "next";

// Closed beta: nothing is meant to be indexed (the pages also carry robots noindex).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
