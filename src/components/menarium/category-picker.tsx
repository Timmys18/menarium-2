"use client";

import { Tag } from "lucide-react";
import { MenariumSelect, type SelectOption } from "@/components/menarium/select";
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

  const rootOptions: SelectOption[] = roots.map((entry) => ({ value: entry.id, label: entry.label }));
  const subcategoryOptions: SelectOption[] = selectedRoot
    ? [
        { value: "", label: "Все подкатегории" },
        ...selectedRoot.children.map((category) => ({ value: category.id, label: category.label })),
      ]
    : [];

  return (
    <div className="grid gap-2">
      <MenariumSelect
        id={id}
        ariaLabel="Категория"
        icon={<Tag className="h-4 w-4" />}
        placeholder="Выберите категорию"
        value={selectedRoot?.id ?? ""}
        options={rootOptions}
        onChange={onChange}
      />

      <MenariumSelect
        id={id ? `${id}-subcategory` : undefined}
        ariaLabel="Подкатегория"
        value={selectedSubcategory}
        options={subcategoryOptions}
        disabled={!selectedRoot}
        // В нативном `<option>` эта подпись обрезалась системной стрелкой
        // до «Сначала выберите категори◄».
        disabledHint="Сначала выберите категорию"
        placeholder="Все подкатегории"
        onChange={(next) => onChange(next || selectedRoot?.id || "")}
      />
    </div>
  );
}
