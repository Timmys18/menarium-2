import Link from "next/link";
import { ArrowRightLeft, Heart, MapPin, TrendingUp } from "lucide-react";
import { Badge } from "@/components/menarium/badge";
import { HoverCard } from "@/components/menarium/card";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";

export type ItemCardProps = {
  id: string;
  title: string;
  category: string;
  image: string;
  wanted: string;
  city?: string;
  likes?: number;
  trending?: boolean;
  priority?: boolean;
};

export function ItemCard({
  id,
  title,
  category,
  image,
  wanted,
  city,
  likes,
  trending,
  priority,
}: ItemCardProps) {
  return (
    <Link href={`/item/${id}`} className="block h-full rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 sm:rounded-[28px]">
      <HoverCard className="group flex h-full flex-col overflow-hidden">
        <div className="relative h-64 overflow-hidden sm:h-72 xl:h-64 2xl:h-72">
          <ItemCoverImage
            src={image}
            alt={title}
            priority={priority}
            sizes="(max-width: 768px) 100vw, 33vw"
            imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0d131d] to-transparent" />
          <div className="absolute left-4 top-4">
            <Badge className="bg-[#090d14]/72">{category}</Badge>
          </div>
          {trending ? (
            <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-blue-500/85 shadow-lg backdrop-blur-xl">
              <TrendingUp className="h-4 w-4 text-blue-50" />
            </div>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-lg font-semibold leading-6 tracking-[-0.02em] text-white">{title}</h3>
            {likes ? (
              <span className="flex shrink-0 items-center gap-1 text-sm text-white/42">
                <Heart className="h-4 w-4 text-blue-300" />
                {likes}
              </span>
            ) : null}
          </div>
          <div className="mt-auto flex items-start gap-2 rounded-[14px] border border-white/[0.065] bg-white/[0.035] px-3 py-2.5 text-sm text-white/52">
            <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-200" />
            <span className="line-clamp-2 leading-5">Ищу: {wanted}</span>
          </div>
          {city ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-white/35">
              <MapPin className="h-3.5 w-3.5" />
              {city}
            </p>
          ) : null}
        </div>
      </HoverCard>
    </Link>
  );
}
