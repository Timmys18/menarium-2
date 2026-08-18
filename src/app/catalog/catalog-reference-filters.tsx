"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { CityPicker } from "@/components/menarium/city-picker";
import { MenariumSelect, type SelectOption } from "@/components/menarium/select";
import { catalogTaxonomy, categoryLabel, categoryRoot } from "@/features/taxonomy/catalog";
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
  const root = categoryRoot(value);
  const selectedSubcategory = value !== root?.id ? value ?? "" : "";
  const categoryOptions: SelectOption[] = [
    { value: "", label: "Все категории" },
    ...Object.entries(catalogTaxonomy).flatMap(([type, roots]) =>
      roots.map((entry) => ({
        value: entry.id,
        label: entry.label,
        group: type === "THING" ? "Предметы" : "Услуги",
      })),
    ),
  ];
  const subcategoryOptions: SelectOption[] = root
    ? [
        { value: "", label: "Все подкатегории" },
        ...root.children.map((child) => ({ value: child.id, label: child.label })),
      ]
    : [];

  return (
    <div className={cn("grid gap-2", className)}>
      <MenariumSelect
        ariaLabel="Категория каталога"
        placeholder="Все категории"
        value={root?.id ?? ""}
        options={categoryOptions}
        onChange={(next) => navigate("category", next || undefined)}
      />

      <MenariumSelect
        ariaLabel="Подкатегория каталога"
        value={selectedSubcategory}
        options={subcategoryOptions}
        disabled={!root}
        disabledHint="Сначала выберите категорию"
        placeholder="Все подкатегории"
        onChange={(next) => navigate("category", next || root?.id)}
      />
    </div>
  );
}

export function CatalogCityFilter({ value, className }: { value?: string; className?: string }) {
  const navigate = useCatalogNavigation();
  const selected = getCity(value);
  return (
    <div className={cn("space-y-2", className)}>
      <CityPicker value={value ?? ""} inline onChange={(city) => navigate("city", city.id)} />
      {selected ? (
        <button type="button" onClick={() => navigate("city")} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-xs text-white/78 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65">
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
    <button type="button" onClick={() => navigate(kind)} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs text-white/78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65">
      {label} <X className="h-3 w-3" />
    </button>
  );
}
