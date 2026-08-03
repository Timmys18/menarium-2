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
}: {
  value: string;
  onChange: (city: CityOption) => void;
  id?: string;
  className?: string;
}) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setQuery("");
          setOpen((current) => !current);
        }}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-[#111723] px-4 py-3 text-left text-white outline-none transition hover:border-white/20 focus-visible:ring-2 focus-visible:ring-blue-300/50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-teal-200" />
          <span className={cn("truncate", selected ? "text-white" : "text-white/42")}>{selected ? selected.name : "Выберите город"}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/48 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-[18px] border border-white/12 bg-[#101722] p-2 shadow-[0_22px_60px_rgba(0,0,0,0.5)]">
          <label className="flex items-center gap-2 rounded-xl bg-white/[0.055] px-3 py-2 text-white/45">
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
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            />
            {query ? (
              <button type="button" aria-label="Очистить поиск города" onClick={() => setQuery("")} className="text-white/45 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
          <div id={listId} role="listbox" aria-label="Города" className="mt-2 max-h-64 overflow-y-auto pr-1">
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
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]",
                    active && "bg-teal-300/[0.09]",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">{city.name}</span>
                    <span className="block truncate text-xs text-white/42">{city.region}</span>
                  </span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-teal-200" /> : null}
                </button>
              );
            })}
            {cities.length === 0 ? <p className="px-3 py-5 text-center text-sm text-white/42">Город не найден в справочнике.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
