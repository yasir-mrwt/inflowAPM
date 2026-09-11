"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const DotLottieReact = dynamic(
  () =>
    import("@lottiefiles/dotlottie-react").then((module) => {
      module.setWasmUrl("/animations/dotlottie-player.wasm");
      return module.DotLottieReact;
    }),
  { ssr: false },
);

function useReducedMotion() {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function AuthAnimation({
  src,
  className,
  compact = false,
}: {
  src: string;
  className?: string;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(compact);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (compact || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "120px" },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [compact]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn("relative grid place-items-center", className)}
    >
      {visible && !reducedMotion ? (
        <DotLottieReact
          src={src}
          autoplay
          loop
          className="size-full"
          renderConfig={{ autoResize: true, devicePixelRatio: compact ? 1 : 1.5 }}
        />
      ) : (
        <span
          className={cn(
            "block rounded-full border border-brand/25 bg-brand-muted/35",
            compact ? "size-5" : "size-24 shadow-[0_0_0_2rem_color-mix(in_srgb,var(--brand)_3%,transparent)]",
          )}
        />
      )}
    </div>
  );
}
