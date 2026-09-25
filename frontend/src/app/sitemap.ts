import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://shega.com";
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/features`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/pricing`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/download`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/auth/register`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/auth/login`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}