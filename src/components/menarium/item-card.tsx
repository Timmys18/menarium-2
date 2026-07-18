import Link from "next/link";
import { ArrowRightLeft, Globe2, Heart, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/menarium/badge";
import { HoverCard } from "@/components/menarium/card";
import { FavoriteButton } from "@/components/menarium/favorite-button";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";
import { cn } from "@/lib/utils";

export type ItemCardProps = {
  id: string;
  ownerId?: string;
  title: string;
  category: string;
  image: string;
  wanted: string;
  city?: string;
  type: string;
  isOnline: boolean;
  likes?: number;
  flexible?: boolean;
  priority?: boolean;
  returnHref?: string;
  isFavorite?: boolean;
  canFavorite?: boolean;
  favoriteLoginHref?: string;
};

export function ItemCard({
  id,
  title,
  category,
  image,
  wanted,
  city,
  type,
  isOnline,
  likes,
  flexible,
  priority,
  returnHref,
  isFavorite,
  canFavorite,
  favoriteLoginHref,
}: ItemCardProps) {
  const itemHref = returnHref
    ? `/item/${id}?from=${encodeURIComponent(returnHref)}`
    : `/item/${id}`;

  const showFavorite = Boolean(canFavorite || favoriteLoginHref);

  return (
    <HoverCard className="group relative flex h-full flex-col overflow-hidden">
      <Link
        href={itemHref}
        className="absolute inset-0 z-10 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300/70 sm:rounded-[28px]"
      >
        <span className="sr-only">Открыть объявление «{title}»</span>
      </Link>
        <div className="relative aspect-[4/3] overflow-hidden">
          <ItemCoverImage
            src={image}
            alt={title}
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1535px) 50vw, 33vw"
            imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0d131d] to-transparent" />
          <div className={cn("absolute left-4 top-4 flex flex-wrap items-start gap-2", showFavorite ? "right-16" : "right-4")}>
            <Badge className="bg-[#090d14]/78">{category}</Badge>
            <Badge variant={isOnline ? "teal" : "glass"} className="bg-[#090d14]/78">
              {isOnline ? <Globe2 className="h-3 w-3" /> : null}
              {isOnline ? "Онлайн" : type === "SERVICE" ? "Услуга" : "Предмет"}
            </Badge>
          </div>
          {showFavorite ? (
            <FavoriteButton
              key={`${id}:${Boolean(isFavorite)}`}
              itemId={id}
              itemTitle={title}
              initialFavorite={isFavorite}
              authenticated={Boolean(canFavorite)}
              loginHref={favoriteLoginHref}
              className="absolute right-4 top-4 z-20"
            />
          ) : null}
          {flexible ? (
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#090d14]/78 px-3 py-1.5 text-[11px] font-medium text-white/76 backdrop-blur-xl">
              <Sparkles className="h-3 w-3 text-teal-200" />
              Открыт к вариантам
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
          <div className="mt-auto flex items-start gap-2 rounded-[15px] border border-teal-300/[0.11] bg-teal-300/[0.045] px-3.5 py-3 text-sm text-white/58">
            <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-200" />
            <span className="line-clamp-2 leading-5">Ищу: {wanted}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/35">
            {city ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{city}</span>
              </span>
            ) : <span />}
            <span className="shrink-0 text-teal-200/65">Посмотреть →</span>
          </div>
        </div>
    </HoverCard>
  );
}
