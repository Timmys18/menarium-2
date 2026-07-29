import Image from "next/image";
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
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-[28%] bg-[#111315] ring-1 ring-white/12 shadow-[0_10px_28px_rgba(0,0,0,0.32)]",
        markSizes[size],
        className,
      )}
    >
      <Image
        src="/brand/menarium-logo.png"
        alt={decorative ? "" : "Логотип Менариум"}
        fill
        sizes={
          size === "xl"
            ? "80px"
            : size === "lg"
              ? "56px"
              : size === "md"
                ? "40px"
                : size === "sm"
                  ? "32px"
                  : "24px"
        }
        preload={priority}
        className="object-cover"
      />
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
  return (
    <BrandMark
      size="xs"
      className={cn("h-5 w-5 rounded-[6px] shadow-none ring-white/10", className)}
    />
  );
}
