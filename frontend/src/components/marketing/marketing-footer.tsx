import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { BrandLockup } from "@/components/brand/brand-mark";
import { GitHubMark } from "@/components/icons/github-mark";

const githubUrl = "https://github.com/yasir-mrwt/inflowAPM";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const footerGroups: { label: string; links: FooterLink[] }[] = [
  {
    label: "Product",
    links: [
      { label: "Overview", href: "/#product-overview" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Architecture", href: "/#how-it-works" },
    ],
  },
  {
    label: "Developers",
    links: [
      { label: "Documentation", href: `${githubUrl}#readme`, external: true },
      { label: "Roadmap", href: `${githubUrl}#roadmap`, external: true },
      { label: "Source code", href: githubUrl, external: true },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border-subtle bg-surface-inset">
      <div className="mx-auto grid w-full max-w-[var(--content-width)] gap-12 px-[var(--page-gutter)] py-12 md:grid-cols-[minmax(0,1fr)_auto] md:py-16">
        <div>
          <Link href="/" aria-label="InflowAPM home" className="inline-flex rounded-md">
            <BrandLockup className="size-9" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-text-secondary">
            Open-source application performance monitoring for understanding
            request latency, failures, and route health.
          </p>
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <GitHubMark className="size-[15px]" />
            View on GitHub
            <ArrowUpRight size={12} className="text-text-muted" aria-hidden="true" />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-12 sm:gap-20">
          {footerGroups.map((group) => (
            <div key={group.label}>
              <p className="type-meta mb-4 text-text-muted">{group.label}</p>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        prefetch={false}
                        className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border-subtle">
        <div className="mx-auto flex w-full max-w-[var(--content-width)] flex-col gap-2 px-[var(--page-gutter)] py-5 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} InflowAPM.</p>
          <p>Built openly for developers who operate production systems.</p>
        </div>
      </div>
    </footer>
  );
}
