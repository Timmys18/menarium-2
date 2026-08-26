import { ArrowRightLeft, Globe2, Heart, MapPin, Sparkles } from "lucide-react";
import { ItemContextLink } from "@/components/catalog/item-context-link";
import { HoverCard } from "@/components/menarium/card";
import { FavoriteButton } from "@/components/menarium/favorite-button";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";

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
  recommendationReason?: string;
  reserveTopRight?: boolean;
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
  priority,
  returnHref,
  isFavorite,
  canFavorite,
  favoriteLoginHref,
  recommendationReason,
}: ItemCardProps) {
  const itemHref = returnHref
    ? `/item/${id}?from=${encodeURIComponent(returnHref)}`
    : `/item/${id}`;

  const showFavorite = Boolean(canFavorite || favoriteLoginHref);

  return (
    <HoverCard role="article" className="group relative flex h-full flex-col overflow-hidden">
      <ItemContextLink
        href={itemHref}
        returnHref={returnHref}
        className="absolute inset-0 z-10 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300/70 sm:rounded-[28px]"
      >
        <span className="sr-only">Открыть объявление «{title}»</span>
      </ItemContextLink>
        <div
          className="item-transition-image relative aspect-[16/10] overflow-hidden sm:aspect-[4/3]"
          style={{ viewTransitionName: `item-image-${id}` }}
        >
          <ItemCoverImage
            src={image}
            alt={title}
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1535px) 50vw, 33vw"
            imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          />
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
        <div className="flex flex-1 flex-col p-4 sm:p-5.5">
          {recommendationReason ? (
            <div className="mb-3 flex items-start gap-2 text-xs leading-4 text-white/62">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-200" />
              <span>{recommendationReason}</span>
            </div>
          ) : null}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1.5 text-xs text-white/62">{category}{type === "SERVICE" ? " · услуга" : ""}</p>
              <h3 className="line-clamp-2 text-base font-semibold leading-5.5 tracking-[-0.02em] text-white sm:text-lg sm:leading-6">{title}</h3>
            </div>
            {likes ? (
              <span className="flex shrink-0 items-center gap-1 text-sm text-white/78">
                <Heart className="h-4 w-4 text-blue-300" />
                {likes}
              </span>
            ) : null}
          </div>
          <div className="mt-auto border-t border-white/[0.075] pt-3">
            <span className="flex items-start gap-2 text-sm leading-5 text-white/78">
              <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-200" />
              <span className="line-clamp-2">Ищет: {wanted}</span>
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/78">
            {city ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{city}</span>
              </span>
            ) : <span />}
            {isOnline ? <Globe2 className="h-3.5 w-3.5 shrink-0 text-teal-200" aria-label="Доступно онлайн" /> : null}
          </div>
        </div>
    </HoverCard>
  );
}
