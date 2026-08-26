import Image from "next/image";
import { BrandGlyph } from "@/components/menarium/brand";
import { cn } from "@/lib/utils";

export const ITEM_PLACEHOLDER = "/menarium-placeholder.svg";

export function isItemPlaceholder(src?: string | null) {
  return !src || src === ITEM_PLACEHOLDER || src.endsWith("menarium-placeholder.svg");
}

type Props = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
};

export function ItemCoverImage({
  src,
  alt,
  className,
  imageClassName,
  priority,
  sizes,
}: Props) {
  if (isItemPlaceholder(src)) {
    return (
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-[#101722]",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-white/62">
          <BrandGlyph className="h-10 w-10 opacity-70" />
          <span className="text-[11px] uppercase tracking-[0.18em]">Нет фото</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      loading={priority ? "eager" : undefined}
      sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
      className={cn("object-cover", imageClassName)}
    />
  );
}
