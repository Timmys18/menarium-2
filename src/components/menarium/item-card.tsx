import { ArrowRightLeft, Globe2, Heart, MapPin, Sparkles } from "lucide-react";
import { ItemContextLink } from "@/components/catalog/item-context-link";
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
  reserveTopRight = false,
  isOnline,
  likes,
  flexible,
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
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d131d]/85 to-transparent" />
          <div className={cn(
            "absolute left-4 top-4 flex flex-wrap items-start gap-2",
            reserveTopRight ? "right-28" : showFavorite ? "right-16" : "right-4",
          )}>
            <Badge className={cn("bg-[#090d14]/78", reserveTopRight && "max-w-full truncate whitespace-nowrap")}>
              {category}
            </Badge>
            <Badge variant={isOnline ? "teal" : "glass"} className="bg-[#090d14]/78">
              {isOnline ? <Globe2 className="h-3 w-3" /> : null}
              {isOnline ? "Онлайн" : type === "SERVICE" ? "Услуга" : "Предмет"}
            </Badge>
          </div>
          {flexible ? (
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#090d14]/88 px-3 py-1.5 text-[11px] font-medium text-white/82">
              <Sparkles className="h-3 w-3 text-teal-200" />
              Открыт к вариантам
            </div>
          ) : null}
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
            <div className="mb-3 flex items-start gap-2 rounded-[13px] border border-blue-300/12 bg-blue-400/[0.05] px-3 py-2 text-xs leading-4 text-blue-100/68">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-200" />
              <span>{recommendationReason}</span>
            </div>
          ) : null}
            <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-5.5 tracking-[-0.02em] text-white sm:text-lg sm:leading-6">{title}</h3>
            {likes ? (
              <span className="flex shrink-0 items-center gap-1 text-sm text-white/78">
                <Heart className="h-4 w-4 text-blue-300" />
                {likes}
              </span>
            ) : null}
          </div>
          <div className="mt-auto rounded-[15px] border border-teal-300/[0.12] bg-teal-300/[0.05] px-3 py-2.5 sm:px-3.5 sm:py-3">
            <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-100/78">
              <ArrowRightLeft className="h-3.5 w-3.5 text-teal-200" />
              Ищу взамен
            </span>
            <span className="line-clamp-2 block text-sm leading-5 text-white/82">{wanted}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/78">
            {city ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{city}</span>
              </span>
            ) : <span />}
            <span className="shrink-0 text-teal-200/80">Посмотреть →</span>
          </div>
        </div>
    </HoverCard>
  );
}
