"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { CityPicker } from "@/components/menarium/city-picker";
import { catalogTaxonomy, categoryLabel } from "@/features/taxonomy/catalog";
import { getCity } from "@/features/locations/cities";
import { cn } from "@/lib/utils";

function useCatalogNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (key: "category" | "city", value?: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  };
}

export function CatalogCategoryFilter({ value, className }: { value?: string; className?: string }) {
  const navigate = useCatalogNavigation();
  return (
    <select
      value={value ?? ""}
      onChange={(event) => navigate("category", event.target.value || undefined)}
      className={cn("min-h-11 w-full rounded-[13px] border border-white/10 bg-[#111723] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65", className)}
    >
      <option value="">Все категории</option>
      {Object.values(catalogTaxonomy).flatMap((roots) => roots).map((root) => (
        <optgroup key={root.id} label={root.label}>
          {root.children.map((child) => (
            <option key={child.id} value={child.id}>{child.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function CatalogCityFilter({ value, className }: { value?: string; className?: string }) {
  const navigate = useCatalogNavigation();
  const selected = getCity(value);
  return (
    <div className={cn("space-y-2", className)}>
      <CityPicker value={value ?? ""} onChange={(city) => navigate("city", city.id)} />
      {selected ? (
        <button type="button" onClick={() => navigate("city")} className="inline-flex items-center gap-1.5 text-xs text-white/48 transition hover:text-white">
          <X className="h-3.5 w-3.5" /> Сбросить «{selected.name}»
        </button>
      ) : null}
    </div>
  );
}

export function CatalogFilterChip({ kind, value }: { kind: "category" | "city"; value?: string }) {
  const navigate = useCatalogNavigation();
  const label = kind === "category" ? categoryLabel(value) : getCity(value)?.name;
  if (!label) return null;
  return (
    <button onClick={() => navigate(kind)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs text-white/62">
      {label} <X className="h-3 w-3" />
    </button>
  );
}
