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
        "relative inline-flex shrink-0 items-center justify-center bg-transparent",
        markSizes[size],
        className,
      )}
    >
      <span className="relative block h-[88%] w-[88%]">
        <Image
          src="/brand/menarium-exchange.svg"
          alt={decorative ? "" : "Логотип Менариум"}
          fill
          sizes={size === "xl" ? "72px" : size === "lg" ? "50px" : size === "md" ? "36px" : size === "sm" ? "29px" : "22px"}
          preload={priority}
          className="object-contain object-center"
        />
      </span>
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
          "font-sans text-xl font-semibold tracking-[-0.035em] text-text-primary",
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
