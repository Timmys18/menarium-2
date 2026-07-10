import bcrypt from "bcryptjs";
import { PrismaClient, ItemType, MediaOwnerType } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    email: "admin@menarium.ru",
    name: "Администратор Menarium",
    city: "Москва",
    password: "MenariumAdmin2026!",
  },
  {
    email: "maria@menarium.ru",
    name: "Мария К.",
    city: "Москва",
    password: "MenariumDemo2026!",
  },
  {
    email: "dmitry@menarium.ru",
    name: "Дмитрий П.",
    city: "Санкт-Петербург",
    password: "MenariumDemo2026!",
  },
];

const itemFixtures = [
  {
    ownerEmail: "maria@menarium.ru",
    title: "Sony WH-1000XM5",
    type: ItemType.THING,
    category: "Техника",
    description: "Флагманские наушники в отличном состоянии. Полный комплект, бережное использование.",
    city: "Москва",
    desired: ["Механическая клавиатура", "AirPods Pro"],
    image: "/demo/items/sony.jpg",
  },
  {
    ownerEmail: "dmitry@menarium.ru",
    title: "Canon AE-1",
    type: ItemType.THING,
    category: "Фото",
    description: "Пленочная камера Canon AE-1. Подойдет для тех, кто хочет начать с аналоговой фотографии.",
    city: "Санкт-Петербург",
    desired: ["Винтажные часы", "Объектив"],
    image: "/demo/items/canon.jpg",
  },
  {
    ownerEmail: "maria@menarium.ru",
    title: "Консультация по интерьеру",
    type: ItemType.SERVICE,
    category: "Услуги",
    description: "Помогу собрать визуальную концепцию комнаты, подобрать референсы и список покупок.",
    city: "Москва",
    desired: ["Фотосъемка", "Книги по дизайну"],
    image: "/demo/items/interior.jpg",
  },
  {
    ownerEmail: "dmitry@menarium.ru",
    title: "Коллекция винила",
    type: ItemType.THING,
    category: "Музыка",
    description: "Небольшая коллекция пластинок в хорошем состоянии. Готов обсуждать обмен комплектом.",
    city: "Санкт-Петербург",
    desired: ["Проигрыватель", "Аудиотехника"],
    image: "/demo/items/vinyl.jpg",
  },
];

async function upsertUser(user) {
  const passwordHash = await bcrypt.hash(user.password, 12);
  return prisma.user.upsert({
    where: { email: user.email },
    update: {
      name: user.name,
      city: user.city,
    },
    create: {
      email: user.email,
      name: user.name,
      city: user.city,
      passwordHash,
    },
  });
}

async function upsertItem(fixture, owners) {
  const owner = owners.get(fixture.ownerEmail);
  if (!owner) throw new Error(`Missing owner for ${fixture.ownerEmail}`);

  const existing = await prisma.item.findFirst({
    where: {
      ownerId: owner.id,
      title: fixture.title,
    },
    include: { images: true },
  });

  if (existing) {
    if (existing.images[0]) {
      await prisma.mediaAsset.update({
        where: { id: existing.images[0].id },
        data: { url: fixture.image, contentType: "image/jpeg" },
      });
    } else {
      await prisma.mediaAsset.create({
        data: {
          ownerId: owner.id,
          ownerType: MediaOwnerType.ITEM,
          itemId: existing.id,
          url: fixture.image,
          contentType: "image/jpeg",
          sizeBytes: 1,
        },
      });
    }
    return existing;
  }

  return prisma.item.create({
    data: {
      ownerId: owner.id,
      title: fixture.title,
      type: fixture.type,
      category: fixture.category,
      description: fixture.description,
      city: fixture.city,
      desired: fixture.desired,
      acceptsAnything: false,
      isOnline: false,
      images: {
        create: {
          ownerId: owner.id,
          ownerType: MediaOwnerType.ITEM,
          url: fixture.image,
          contentType: "image/jpeg",
          sizeBytes: 1,
        },
      },
    },
  });
}

async function main() {
  // Защита от катастрофы: демо-данные с известными паролями НИКОГДА
  // не должны попасть в production. Разрешаем сид только явным флагом.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    console.error(
      "Отказано: запуск seed в production запрещён. " +
        "Демо-аккаунты с известными паролями небезопасны. " +
        "Если это действительно нужно — установите ALLOW_PROD_SEED=true.",
    );
    process.exit(1);
  }

  const ownerEntries = await Promise.all(users.map(upsertUser));
  const owners = new Map(ownerEntries.map((user) => [user.email, user]));
  await Promise.all(itemFixtures.map((fixture) => upsertItem(fixture, owners)));

  console.log("Seed complete:");
  console.log("- admin@menarium.ru / MenariumAdmin2026!");
  console.log("- maria@menarium.ru / MenariumDemo2026!");
  console.log("- dmitry@menarium.ru / MenariumDemo2026!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
