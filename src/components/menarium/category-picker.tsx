"use client";

import { categoryOptions, categoryRoot, type CatalogType } from "@/features/taxonomy/catalog";

export function CategoryPicker({
  type,
  value,
  onChange,
  id,
}: {
  type: CatalogType;
  value: string;
  onChange: (categoryId: string) => void;
  id?: string;
}) {
  const roots = categoryOptions(type);
  const root = categoryRoot(value);
  const selectedRoot = root && roots.some((entry) => entry.id === root.id) ? root : null;
  const selectedSubcategory = value !== selectedRoot?.id ? value : "";

  return (
    <div className="grid gap-2">
      <select
        id={id}
        aria-label="Категория"
        value={selectedRoot?.id ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-[14px] border border-white/10 bg-[#111723] px-4 py-3 text-white outline-none focus:border-blue-300/55 focus-visible:ring-2 focus-visible:ring-blue-300/50"
      >
        <option value="">Выберите категорию</option>
        {roots.map((entry) => (
          <option key={entry.id} value={entry.id}>{entry.label}</option>
        ))}
      </select>

      <select
        id={id ? `${id}-subcategory` : undefined}
        aria-label="Подкатегория"
        value={selectedSubcategory}
        disabled={!selectedRoot}
        onChange={(event) => onChange(event.target.value || selectedRoot?.id || "")}
        className="min-h-12 w-full rounded-[14px] border border-white/10 bg-[#111723] px-4 py-3 text-white outline-none transition disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:text-white/62 focus:border-blue-300/55 focus-visible:ring-2 focus-visible:ring-blue-300/50"
      >
        <option value="">{selectedRoot ? "Все подкатегории" : "Сначала выберите категорию"}</option>
        {selectedRoot?.children.map((category) => (
          <option key={category.id} value={category.id}>{category.label}</option>
        ))}
      </select>
    </div>
  );
}
