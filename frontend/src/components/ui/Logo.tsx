import { useId } from "react";
import { cn } from "@/lib/utils";

/** The COHVRA mark: a "C" with a smaller "c" nested inside it (co- = together). */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="COHVRA"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="60" y1="30" x2="450" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.5" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#4c1d95" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${id}-bg)`} />
      <g fill="none" strokeLinecap="round">
        <path d="M 363.2 346 A 140 140 0 1 1 363.2 166" stroke="#ffffff" strokeWidth="52" />
        <path d="M 308.1 299.7 A 68 68 0 1 1 308.1 212.3" stroke="#ddd6fe" strokeWidth="44" />
      </g>
    </svg>
  );
}

export function Logo({
  size = 36,
  tone = "dark",
  className,
}: {
  size?: number;
  // "dark" = for dark backgrounds (gradient wordmark), "light" = for light backgrounds.
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark size={size} />
      <span
        className={cn(
          "font-bold uppercase leading-none tracking-[0.22em]",
          tone === "dark" ? "text-brand-gradient" : "text-violet-950",
        )}
        style={{ fontSize: Math.round(size * 0.5) }}
      >
        COHVRA
      </span>
    </span>
  );
}
