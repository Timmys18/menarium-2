"use client";

import { useState } from "react";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";

export function ItemImageGallery({
  images,
  title,
}: {
  images: { id: string; url: string }[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  if (!active) {
    return (
      <div className="relative h-[560px]">
        <ItemCoverImage src="" alt={title} priority />
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-[560px]">
        <ItemCoverImage src={active.url} alt={title} priority />
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto p-4">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border ${
                index === activeIndex ? "border-teal-400" : "border-white/10 opacity-70"
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
