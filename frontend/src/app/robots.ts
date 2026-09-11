import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

const privatePaths = ["/api/", "/dashboard/", "/login", "/register"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: ["/", "/docs", "/llms.txt"],
        disallow: privatePaths,
      },
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
