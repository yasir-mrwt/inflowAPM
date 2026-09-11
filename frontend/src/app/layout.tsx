import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { siteUrl } from "@/lib/site";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "InflowAPM · Open-source API monitoring",
    template: "%s · InflowAPM",
  },
  description:
    "Open-source application performance monitoring for understanding latency, errors, and route health.",
  applicationName: "InflowAPM",
  keywords: [
    "application performance monitoring",
    "Node.js monitoring",
    "Express monitoring",
    "API observability",
    "open-source APM",
  ],
  authors: [{ name: "InflowAPM contributors" }],
  creator: "InflowAPM contributors",
  category: "developer tools",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "InflowAPM",
    title: "InflowAPM · Open-source API monitoring",
    description:
      "Understand API latency, errors, throughput, and route health with open-source application performance monitoring.",
    images: [
      {
        url: "/brand/inflowapm-logo.png",
        width: 1254,
        height: 1254,
        alt: "InflowAPM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InflowAPM · Open-source API monitoring",
    description:
      "Understand API latency, errors, throughput, and route health.",
    images: ["/brand/inflowapm-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
