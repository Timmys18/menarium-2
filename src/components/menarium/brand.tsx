import { Repeat2 } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

type BrandMarkSize = "xs" | "sm" | "md" | "lg" | "xl";

const markSizes: Record<BrandMarkSize, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

export function BrandMark({
  size = "md",
  className,
  priority = false,
  decorative = true,
}: {
  size?: BrandMarkSize;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  const arrowGradientId = useId();
  const ringGradientId = useId();
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 text-white drop-shadow-[0_8px_14px_rgba(0,0,0,0.32)]",
        markSizes[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="h-full w-full"
        aria-hidden={decorative ? true : undefined}
        aria-label={decorative ? undefined : "Логотип Менариум"}
        data-priority={priority ? "high" : undefined}
        role={decorative ? undefined : "img"}
      >
        <defs>
          <linearGradient id={arrowGradientId} x1="10" y1="12" x2="54" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#55B9FF" />
            <stop offset="0.48" stopColor="#1870D2" />
            <stop offset="1" stopColor="#06418C" />
          </linearGradient>
          <linearGradient id={ringGradientId} x1="15" y1="8" x2="52" y2="59" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F3F6FB" />
            <stop offset="0.45" stopColor="#AAB4C2" />
            <stop offset="1" stopColor="#697483" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="24" stroke={`url(#${ringGradientId})`} strokeWidth="4.5" />
        <path d="M7 21.5H35V14L53 28.5 35 43V35.5H7V21.5Z" fill={`url(#${arrowGradientId})`} stroke="#78C4FF" strokeOpacity="0.6" strokeWidth="1" strokeLinejoin="round" />
        <path d="M57 42.5H29V50L11 35.5 29 21V28.5H57V42.5Z" fill={`url(#${arrowGradientId})`} stroke="#78C4FF" strokeOpacity="0.6" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function BrandLockup({
  className,
  markClassName,
  textClassName,
  priority = false,
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark size="md" className={markClassName} priority={priority} />
      <span
        className={cn(
          "font-sans text-xl font-semibold tracking-[-0.035em] text-white",
          textClassName,
        )}
      >
        Менариум
      </span>
    </span>
  );
}

export function BrandGlyph({ className }: { className?: string }) {
  return <Repeat2 aria-hidden="true" className={cn("h-5 w-5", className)} />;
}
