"use client";

import { categoryOptions, type CatalogType } from "@/features/taxonomy/catalog";

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

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-12 w-full rounded-[14px] border border-white/10 bg-[#111723] px-4 py-3 text-white outline-none focus:border-blue-300/55 focus-visible:ring-2 focus-visible:ring-blue-300/50"
    >
      {roots.map((root) => (
        <optgroup key={root.id} label={root.label}>
          {root.children.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
