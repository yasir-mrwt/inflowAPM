const localSiteUrl = "http://localhost:3000";

function resolveSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    localSiteUrl;
  const normalizedUrl = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;

  try {
    return new URL(normalizedUrl);
  } catch {
    return new URL(localSiteUrl);
  }
}

export const siteUrl = resolveSiteUrl();

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}
