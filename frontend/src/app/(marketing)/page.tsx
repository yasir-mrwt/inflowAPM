import type { Metadata } from "next";

import { HomeHero } from "@/components/marketing/home-hero";
import { IncidentInvestigation } from "@/components/marketing/incident-investigation";
import { IntegrationOpenSource } from "@/components/marketing/integration-open-source";
import { ProductionProblem } from "@/components/marketing/production-problem";
import { SdkIntegration } from "@/components/marketing/sdk-integration";
import { TelemetryFlow } from "@/components/marketing/telemetry-flow";
import { absoluteUrl } from "@/lib/site";

const pageDescription =
  "Open-source application performance monitoring for understanding API latency, errors, throughput, and route health.";

export const metadata: Metadata = {
  title: "Open-source API monitoring",
  description: pageDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "InflowAPM",
    title: "InflowAPM · Open-source API monitoring",
    description: pageDescription,
    images: [{ url: "/brand/inflowapm-logo.png", alt: "InflowAPM" }],
  },
  twitter: {
    card: "summary",
    title: "InflowAPM · Open-source API monitoring",
    description: pageDescription,
    images: ["/brand/inflowapm-logo.png"],
  },
};

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "InflowAPM",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Linux, macOS, Windows",
    description: pageDescription,
    url: absoluteUrl("/"),
    codeRepository: "https://github.com/yasir-mrwt/inflowAPM",
    license: "https://opensource.org/license/mit",
    featureList: [
      "Express request instrumentation",
      "Route latency and error telemetry",
      "Project-scoped telemetry ingestion",
      "Self-hosted development environment",
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HomeHero />
      <ProductionProblem />
      <TelemetryFlow />
      <IncidentInvestigation />
      <SdkIntegration />
      <IntegrationOpenSource />
    </main>
  );
}
