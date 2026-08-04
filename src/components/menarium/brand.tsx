import Image from "next/image";
import { Repeat2 } from "lucide-react";
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
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-transparent",
        markSizes[size],
        className,
      )}
    >
      <Image
        src="/brand/menarium-logo.png"
        alt={decorative ? "" : "Логотип Менариум"}
        fill
        sizes={size === "xl" ? "80px" : size === "lg" ? "56px" : size === "md" ? "40px" : size === "sm" ? "32px" : "24px"}
        preload={priority}
        className="scale-[1.13] object-cover object-center mix-blend-screen"
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
  return <Repeat2 aria-hidden="true" className={cn("h-5 w-5", className)} />;
}
