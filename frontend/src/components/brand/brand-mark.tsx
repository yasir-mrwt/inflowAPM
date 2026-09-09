import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
};

function BrandMark({ className, priority = false }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "relative block size-10 shrink-0 overflow-hidden rounded-md bg-black",
        className,
      )}
    >
      <Image
        src="/brand/inflowapm-logo.png"
        alt=""
        fill
        sizes="48px"
        priority={priority}
        className="object-cover"
      />
    </span>
  );
}

type BrandLockupProps = BrandMarkProps & {
  labelClassName?: string;
};

function BrandLockup({
  className,
  labelClassName,
  priority = false,
}: BrandLockupProps) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="InflowAPM">
      <BrandMark className={className} priority={priority} />
      <span
        aria-hidden="true"
        className={cn(
          "text-[0.9375rem] font-semibold tracking-[-0.02em] text-text-primary",
          labelClassName,
        )}
      >
        Inflow<span className="text-brand">APM</span>
      </span>
    </span>
  );
}

export { BrandLockup, BrandMark };
