import Image from "next/image";
import Link from "next/link";
import { ArrowRightLeft, Heart, TrendingUp } from "lucide-react";
import { Badge } from "@/components/menarium/badge";
import { HoverCard } from "@/components/menarium/card";

export type ItemCardProps = {
  id: string;
  title: string;
  category: string;
  image: string;
  wanted: string;
  city?: string;
  likes?: number;
  trending?: boolean;
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
}: ItemCardProps) {
  return (
    <Link href={`/item/${id}`}>
      <HoverCard className="group overflow-hidden">
        <div className="relative h-80 overflow-hidden">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute left-4 top-4">
            <Badge>{category}</Badge>
          </div>
          {trending ? (
            <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/90 to-purple-500/90 backdrop-blur-xl">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          ) : null}
        </div>
        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="text-lg tracking-tight text-white">{title}</h3>
            {likes ? (
              <span className="flex items-center gap-1 text-sm text-white/45">
                <Heart className="h-4 w-4 text-purple-400" />
                {likes}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <ArrowRightLeft className="h-3.5 w-3.5 text-purple-400" />
            <span className="tracking-wide">{wanted}</span>
          </div>
          {city ? <p className="mt-2 text-xs text-white/35">{city}</p> : null}
        </div>
      </HoverCard>
    </Link>
  );
}
