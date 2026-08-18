"use client";

import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { getCity, searchCities, type CityOption } from "@/features/locations/cities";
import { cn } from "@/lib/utils";

export function CityPicker({
  value,
  onChange,
  id,
  className,
  inline = false,
}: {
  value: string;
  onChange: (city: CityOption) => void;
  id?: string;
  className?: string;
  /** Keep the city search in the document flow when an overlay would cover nearby catalog content. */
  inline?: boolean;
}) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState<"up" | "down">("down");
  // Высоту списка считаем от фактического свободного места, а не фиксированной
  // величиной: прежний `max-h` не знал, где находится сам пикер, и в панели
  // фильтров последний город обрезался пополам.
  const [maxHeight, setMaxHeight] = useState(248);
  const selected = getCity(value);
  const cities = searchCities(query);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function toggleList() {
    if (open) {
      setOpen(false);
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const gap = 8;
      const margin = 16;
      // Поле поиска над списком тоже занимает место в раскрытой панели.
      const searchFieldHeight = 60;
      const roomBelow = window.innerHeight - rect.bottom - gap - margin - searchFieldHeight;
      const roomAbove = rect.top - gap - margin - searchFieldHeight;
      const openUpwards = !inline && roomBelow < 176 && roomAbove > roomBelow;
      if (!inline) setPlacement(openUpwards ? "up" : "down");
      setMaxHeight(Math.max(132, Math.min(248, openUpwards ? roomAbove : roomBelow)));
    }

    setQuery("");
    setOpen(true);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        onClick={toggleList}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-control border border-line-default bg-[var(--surface-input)] px-4 py-3 text-left text-text-primary outline-none transition hover:border-line-strong focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-accent" />
          <span className={cn("truncate", selected ? "text-text-primary" : "text-text-subtle")}>{selected ? selected.name : "Выберите город"}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-subtle transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className={cn(
          "w-full overflow-hidden rounded-md border border-line-default bg-[var(--surface-raised)] p-2 shadow-[0_22px_60px_rgba(0,0,0,0.5)]",
          inline ? "relative mt-2" : cn("absolute left-0 z-[70]", placement === "up" ? "bottom-[calc(100%+.5rem)]" : "top-[calc(100%+.5rem)]"),
        )}>
          <label className="flex min-h-11 items-center gap-2 rounded-xs bg-fill-2 px-3 py-2 text-text-muted">
            <Search className="h-4 w-4 shrink-0" />
            <span className="sr-only">Найти город в списке</span>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
              placeholder="Начните печатать город"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-subtle"
            />
            {query ? (
              <button type="button" aria-label="Очистить поиск города" onClick={() => setQuery("")} className="-mr-3 flex h-11 w-11 items-center justify-center text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
          <div
            id={listId}
            role="listbox"
            aria-label="Города"
            style={{ maxHeight }}
            className="menarium-scrollbar mt-2 overflow-y-auto overscroll-contain pr-1"
          >
            {cities.map((city) => {
              const active = city.id === value;
              return (
                <button
                  key={city.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(city);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-xs px-3 py-2.5 text-left transition hover:bg-fill-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]",
                    active && "bg-teal-300/[0.09]",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text-primary">{city.name}</span>
                    <span className="block truncate text-xs text-text-subtle">{city.region}</span>
                  </span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
                </button>
              );
            })}
            {cities.length === 0 ? <p className="px-3 py-5 text-center text-sm text-text-subtle">Город не найден в справочнике.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
