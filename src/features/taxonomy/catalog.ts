export type CatalogCategory = {
  id: string;
  label: string;
  children: readonly CatalogCategory[];
};

export type CatalogType = "THING" | "SERVICE";

const things = [
  { id: "electronics", label: "Электроника", children: [
    ["phones", "Смартфоны"], ["laptops", "Ноутбуки"], ["computers", "Компьютеры и периферия"],
    ["tablets", "Планшеты и электронные книги"], ["audio", "Аудио"], ["photo-video", "Фото и видео"],
    ["tv-video", "ТВ и видео"], ["gaming", "Игровые консоли и игры"], ["smart-home", "Умный дом"], ["electronics-accessories", "Аксессуары"],
  ] },
  { id: "home", label: "Дом и интерьер", children: [
    ["furniture", "Мебель"], ["interior", "Интерьер и декор"], ["kitchen", "Кухня и посуда"], ["appliances", "Бытовая техника"], ["lighting", "Освещение"], ["storage", "Хранение и организация"],
  ] },
  { id: "fashion", label: "Одежда и аксессуары", children: [
    ["women-clothing", "Женская одежда"], ["men-clothing", "Мужская одежда"], ["shoes", "Обувь"], ["bags", "Сумки и рюкзаки"], ["jewelry", "Украшения и часы"], ["fashion-accessories", "Аксессуары"],
  ] },
  { id: "beauty", label: "Красота и уход", children: [
    ["cosmetics", "Косметика"], ["perfume", "Парфюмерия"], ["care", "Уход"], ["beauty-devices", "Приборы и инструменты"],
  ] },
  { id: "sport", label: "Спорт и отдых", children: [
    ["fitness", "Фитнес"], ["bicycles", "Велосипеды и самокаты"], ["tourism", "Туризм и кемпинг"], ["winter-sport", "Зимний спорт"], ["water-sport", "Водный спорт"], ["sports-equipment", "Спортивный инвентарь"],
  ] },
  { id: "hobby", label: "Хобби и творчество", children: [
    ["art-supplies", "Материалы для творчества"], ["board-games", "Настольные игры"], ["collectibles", "Коллекции"], ["musical-instruments", "Музыкальные инструменты"], ["handmade", "Ручная работа"],
  ] },
  { id: "media", label: "Книги, музыка и коллекции", children: [
    ["books", "Книги"], ["vinyl", "Винил и носители"], ["sheet-music", "Ноты и учебные материалы"], ["memorabilia", "Памятные вещи"],
  ] },
  { id: "kids", label: "Детям", children: [
    ["kids-clothing", "Одежда и обувь"], ["toys", "Игрушки"], ["strollers", "Коляски и автокресла"], ["kids-furniture", "Детская мебель"], ["kids-hobby", "Творчество и развитие"],
  ] },
  { id: "auto", label: "Авто и мото", children: [
    ["auto-parts", "Запчасти"], ["auto-accessories", "Аксессуары"], ["tires", "Шины и диски"], ["moto", "Мотоэкипировка"], ["bicycles-parts", "Запчасти для велосипедов"],
  ] },
  { id: "tools-garden", label: "Инструменты, дача и сад", children: [
    ["tools", "Инструменты"], ["repair-equipment", "Оборудование для ремонта"], ["garden-tools", "Садовый инвентарь"], ["plants", "Растения и семена"], ["outdoor-furniture", "Дачная мебель"],
  ] },
  { id: "pets", label: "Зоотовары", children: [
    ["pet-care", "Уход и здоровье"], ["pet-food", "Корма и лакомства"], ["pet-accessories", "Аксессуары"], ["aquarium", "Аквариумистика"],
  ] },
] as const satisfies readonly { id: string; label: string; children: readonly (readonly [string, string])[] }[];

const services = [
  { id: "repair-home", label: "Ремонт и дом", children: [
    ["construction", "Ремонт и строительство"], ["appliance-repair", "Ремонт техники"], ["handyman", "Мастер на час"], ["cleaning", "Уборка"], ["assembly", "Сборка и установка"],
  ] },
  { id: "education", label: "Обучение", children: [
    ["school-subjects", "Школьные предметы"], ["languages", "Иностранные языки"], ["music-lessons", "Музыка и вокал"], ["professional-skills", "Профессиональные навыки"], ["creative-learning", "Творческие занятия"],
  ] },
  { id: "digital", label: "IT, дизайн и маркетинг", children: [
    ["development", "Разработка"], ["design", "Дизайн"], ["marketing", "Маркетинг и реклама"], ["content", "Контент и тексты"], ["it-help", "Настройка и помощь"],
  ] },
  { id: "photo-events", label: "Фото, видео и события", children: [
    ["photography", "Фотосъёмка"], ["video", "Видеосъёмка и монтаж"], ["event-help", "Помощь с событиями"], ["sound", "Звук и свет"],
  ] },
  { id: "creative", label: "Творчество и музыка", children: [
    ["music-service", "Музыка и звук"], ["art-service", "Иллюстрация и творчество"], ["handmade-service", "Изготовление на заказ"], ["writing", "Тексты и переводы"],
  ] },
  { id: "beauty-service", label: "Красота и уход", children: [
    ["hair", "Волосы"], ["nails", "Ногти"], ["makeup", "Макияж"], ["style", "Стиль и гардероб"],
  ] },
  { id: "sport-service", label: "Спорт и занятия", children: [
    ["personal-training", "Персональные тренировки"], ["yoga-dance", "Йога и танцы"], ["outdoor-activities", "Активный отдых"],
  ] },
  { id: "auto-service", label: "Автоуслуги", children: [
    ["car-repair", "Ремонт и обслуживание"], ["detailing", "Детейлинг"], ["driving-help", "Помощь с автомобилем"],
  ] },
  { id: "pets-service", label: "Уход за животными", children: [
    ["pet-sitting", "Передержка и присмотр"], ["walking", "Выгул"], ["grooming", "Груминг"], ["pet-training", "Дрессировка"],
  ] },
  { id: "business", label: "Деловая помощь", children: [
    ["accounting", "Бухгалтерия и документы"], ["business-consulting", "Консультации"], ["translation", "Переводы"], ["assistant", "Личный помощник"],
  ] },
] as const satisfies readonly { id: string; label: string; children: readonly (readonly [string, string])[] }[];

function buildTree(groups: typeof things | typeof services, prefix: string): CatalogCategory[] {
  return groups.map((group) => ({
    id: `${prefix}.${group.id}`,
    label: group.label,
    children: group.children.map(([id, label]) => ({ id: `${prefix}.${group.id}.${id}`, label, children: [] })),
  }));
}

export const catalogTaxonomy: Record<CatalogType, CatalogCategory[]> = {
  THING: buildTree(things, "thing"),
  SERVICE: buildTree(services, "service"),
};

export function categoryOptions(type: CatalogType): CatalogCategory[] {
  return catalogTaxonomy[type];
}

export function findCategory(categoryId: string | null | undefined): CatalogCategory | null {
  if (!categoryId) return null;
  for (const roots of Object.values(catalogTaxonomy)) {
    for (const root of roots) {
      if (root.id === categoryId) return root;
      const leaf = root.children.find((child) => child.id === categoryId);
      if (leaf) return leaf;
    }
  }
  return null;
}

/** Returns the broad category for either a category or one of its subcategories. */
export function categoryRoot(categoryId: string | null | undefined): CatalogCategory | null {
  if (!categoryId) return null;
  for (const roots of Object.values(catalogTaxonomy)) {
    for (const root of roots) {
      if (root.id === categoryId || root.children.some((child) => child.id === categoryId)) {
        return root;
      }
    }
  }
  return null;
}

/**
 * Expands a broad category into every stored value it represents.
 * A selected subcategory remains precise; a selected top-level category includes its children.
 */
export function categoryScope(categoryId: string | null | undefined) {
  const root = categoryRoot(categoryId);
  const ids =
    root && root.id === categoryId
      ? [root.id, ...root.children.map((child) => child.id)]
      : categoryId
        ? [categoryId]
        : [];
  const labels = ids
    .map((id) => categoryLabel(id))
    .filter((label): label is string => Boolean(label));
  const legacyLabels = Object.entries(legacyCategoryAliases)
    .filter(([, id]) => ids.includes(id))
    .map(([label]) => label);

  return {
    ids,
    labels: [...new Set([...labels, ...legacyLabels])],
  };
}

export function categoryLabel(categoryId: string | null | undefined): string | null {
  return findCategory(categoryId)?.label ?? null;
}

export function categoryPath(categoryId: string | null | undefined): string | null {
  if (!categoryId) return null;
  for (const roots of Object.values(catalogTaxonomy)) {
    for (const root of roots) {
      if (root.id === categoryId) return root.label;
      const leaf = root.children.find((child) => child.id === categoryId);
      if (leaf) return `${root.label} · ${leaf.label}`;
    }
  }
  return null;
}

export function categoryIdsForType(type: CatalogType): string[] {
  return categoryOptions(type).flatMap((root) => [root.id, ...root.children.map((child) => child.id)]);
}

const legacyCategoryAliases: Record<string, string> = {
  "Техника": "thing.electronics",
  "Аудио": "thing.electronics.audio",
  "Фото": "thing.electronics.photo-video",
  "Мода": "thing.fashion",
  "Музыка": "thing.media.vinyl",
  "Спорт": "thing.sport",
  "Книги": "thing.media.books",
  "Искусство": "thing.hobby.art-supplies",
  "Услуги": "service.business",
};

export function legacyCategoryId(label: string): string | null {
  return legacyCategoryAliases[label] ?? null;
}
