"use client";

import { useState } from "react";
import Image from "next/image";

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
      <div className="relative h-[560px] bg-white/5">
        <Image src="/menarium-placeholder.svg" alt={title} fill className="object-cover" priority />
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-[560px]">
        <Image src={active.url} alt={title} fill className="object-cover" priority />
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
              <Image src={image.url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
