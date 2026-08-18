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
        className="absolute inset-0 z-10 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)] sm:rounded-lg"
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
            imageClassName="transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--surface-card)]/85 to-transparent" />
          {/*
            Длинная категория («Иллюстрация и творчество») вытесняла соседний
            чип на вторую строку и наезжала на него. Категория теперь сжимается
            в пределах своей ширины, а тип остаётся целым: строка одна,
            наложения нет. text-overflow не работает на самом flex-контейнере,
            поэтому обрезаем текст во вложенном блочном span, а не на Badge.
          */}
          <div className={cn(
            "absolute left-4 top-4 flex items-start gap-2",
            reserveTopRight ? "right-28" : showFavorite ? "right-16" : "right-4",
          )}>
            <Badge className="min-w-0 shrink bg-[var(--surface-sunken)]/78">
              <span className="block min-w-0 truncate">{category}</span>
            </Badge>
            <Badge variant={isOnline ? "teal" : "glass"} className="shrink-0 bg-[var(--surface-sunken)]/78">
              {isOnline ? <Globe2 className="h-3 w-3" /> : null}
              {isOnline ? "Онлайн" : type === "SERVICE" ? "Услуга" : "Предмет"}
            </Badge>
          </div>
          {flexible ? (
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-line-default bg-[var(--surface-sunken)]/88 px-3 py-1.5 text-micro font-medium text-text-strong">
              <Sparkles className="h-3 w-3 text-accent" />
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
            <div className="mb-3 flex items-start gap-2 rounded-xs border border-blue-300/12 bg-blue-400/[0.05] px-3 py-2 text-xs leading-4 text-info-soft">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span>{recommendationReason}</span>
            </div>
          ) : null}
            <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-5.5 tracking-[-0.02em] text-text-primary sm:text-lg sm:leading-6">{title}</h3>
            {likes ? (
              <span className="flex shrink-0 items-center gap-1 text-sm text-text-muted">
                <Heart className="h-4 w-4 text-info" />
                {likes}
              </span>
            ) : null}
          </div>
          <div className="mt-auto rounded-control border border-teal-300/[0.12] bg-teal-300/[0.05] px-3 py-2.5 sm:px-3.5 sm:py-3">
            <span className="mb-1.5 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-[0.12em] text-accent">
              <ArrowRightLeft className="h-3.5 w-3.5 text-accent" />
              Ищу взамен
            </span>
            <span className="line-clamp-2 block text-sm leading-5 text-text-strong">{wanted}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-text-muted">
            {city ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{city}</span>
              </span>
            ) : <span />}
            <span className="shrink-0 text-accent">Посмотреть →</span>
          </div>
        </div>
    </HoverCard>
  );
}
