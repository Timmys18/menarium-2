"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";

export function ItemImageGallery({
  images,
  title,
  itemId,
}: {
  images: { id: string; url: string }[];
  title: string;
  itemId: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  function showRelativeImage(offset: number) {
    setActiveIndex((current) => (current + offset + images.length) % images.length);
  }

  if (!active) {
    return (
      <div className="relative aspect-[4/3] min-h-64">
        <ItemCoverImage src="" alt={title} priority />
      </div>
    );
  }

  return (
    <div>
        <div
          className="item-transition-image relative aspect-[4/3] min-h-64 overflow-hidden bg-white/[0.03]"
          style={{ viewTransitionName: `item-image-${itemId}` }}
        >
        <ItemCoverImage
          src={active.url}
          alt={images.length > 1 ? `${title} — фото ${activeIndex + 1}` : title}
          priority
          sizes="(max-width: 1024px) 100vw, 58vw"
        />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => showRelativeImage(-1)}
              aria-label="Предыдущее фото"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-control border border-white/10 bg-[var(--surface-sunken)]/72 text-white/78 shadow-lg backdrop-blur-xl transition hover:bg-[var(--surface-sunken)]/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => showRelativeImage(1)}
              aria-label="Следующее фото"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-control border border-white/10 bg-[var(--surface-sunken)]/72 text-white/78 shadow-lg backdrop-blur-xl transition hover:bg-[var(--surface-sunken)]/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-[var(--surface-sunken)]/76 px-3 py-1.5 text-xs text-white/78 backdrop-blur-xl">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        ) : null}
        </div>
      {images.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-white/8 p-3 sm:p-4" aria-label="Все фотографии">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Показать фото ${index + 1}`}
              aria-pressed={index === activeIndex}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-control border transition sm:h-20 sm:w-20 sm:rounded-control ${
                index === activeIndex
                  ? "border-teal-300 ring-2 ring-teal-300/20"
                  : "border-white/10 opacity-58 hover:opacity-90"
              }`}
            >
              <ItemCoverImage src={image.url} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
