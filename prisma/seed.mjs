import bcrypt from "bcryptjs";
import { ItemStatus, PrismaClient, ItemType, MediaOwnerType, UserStatus } from "@prisma/client";
import rawCities from "../src/features/locations/russian-cities.json" with { type: "json" };

const prisma = new PrismaClient();

function referenceCity(name) {
  const city = rawCities.find((candidate) => candidate.name === name);
  if (!city) throw new Error(`Missing city reference for ${name}`);
  const id = `${city.name}-${city.subject}`
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return { name: city.name, id };
}

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
    categoryId: "thing.electronics.audio",
    description: "Флагманские наушники в отличном состоянии. Полный комплект, бережное использование.",
    city: "Москва",
    desired: ["Механическая клавиатура", "AirPods Pro"],
    image: "/demo/items/sony.png",
  },
  {
    ownerEmail: "dmitry@menarium.ru",
    title: "Canon AE-1",
    type: ItemType.THING,
    category: "Фото",
    categoryId: "thing.electronics.photo-video",
    description: "Пленочная камера Canon AE-1. Подойдет для тех, кто хочет начать с аналоговой фотографии.",
    city: "Санкт-Петербург",
    desired: ["Винтажные часы", "Объектив"],
    image: "/demo/items/canon.png",
  },
  {
    ownerEmail: "maria@menarium.ru",
    title: "Консультация по интерьеру",
    type: ItemType.SERVICE,
    category: "Услуги",
    categoryId: "service.creative.art-service",
    description: "Помогу собрать визуальную концепцию комнаты, подобрать референсы и список покупок.",
    city: "Москва",
    desired: ["Фотосъемка", "Книги по дизайну"],
    image: "/demo/items/interior.png",
  },
  {
    ownerEmail: "dmitry@menarium.ru",
    title: "Коллекция винила",
    type: ItemType.THING,
    category: "Музыка",
    categoryId: "thing.media.vinyl",
    description: "Небольшая коллекция пластинок в хорошем состоянии. Готов обсуждать обмен комплектом.",
    city: "Санкт-Петербург",
    desired: ["Проигрыватель", "Аудиотехника"],
    image: "/demo/items/vinyl.png",
  },
];

async function upsertUser(user) {
  const passwordHash = await bcrypt.hash(user.password, 12);
  const city = referenceCity(user.city);
  return prisma.user.upsert({
    where: { email: user.email },
    update: {
      name: user.name,
      city: city.name,
      cityId: city.id,
      passwordHash,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      suspendedAt: null,
      suspensionReason: null,
    },
    create: {
      email: user.email,
      name: user.name,
      city: city.name,
      cityId: city.id,
      passwordHash,
    },
  });
}

async function upsertItem(fixture, owners) {
  const owner = owners.get(fixture.ownerEmail);
  if (!owner) throw new Error(`Missing owner for ${fixture.ownerEmail}`);
  const city = referenceCity(fixture.city);

  const existing = await prisma.item.findFirst({
    where: {
      ownerId: owner.id,
      title: fixture.title,
    },
    include: { images: true },
  });

  if (existing) {
    await prisma.item.update({
      where: { id: existing.id },
      data: {
        type: fixture.type,
        category: fixture.category,
        categoryId: fixture.categoryId,
        description: fixture.description,
        city: city.name,
        cityId: city.id,
        desired: fixture.desired,
        acceptsAnything: false,
        isOnline: false,
        extraOfferText: null,
        status: ItemStatus.ACTIVE,
      },
    });
    if (existing.images[0]) {
      await prisma.mediaAsset.update({
        where: { id: existing.images[0].id },
        data: { url: fixture.image, contentType: "image/png" },
      });
    } else {
      await prisma.mediaAsset.create({
        data: {
          ownerId: owner.id,
          ownerType: MediaOwnerType.ITEM,
          itemId: existing.id,
          url: fixture.image,
          contentType: "image/png",
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
      categoryId: fixture.categoryId,
      description: fixture.description,
      city: city.name,
      cityId: city.id,
      desired: fixture.desired,
      acceptsAnything: false,
      isOnline: false,
      images: {
        create: {
          ownerId: owner.id,
          ownerType: MediaOwnerType.ITEM,
          url: fixture.image,
          contentType: "image/png",
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
  const demoUserIds = ownerEntries.map((user) => user.id);

  // Seed is also the E2E reset boundary. Remove only activity involving the
  // well-known demo accounts, leaving all other local data untouched.
  await prisma.$transaction([
    prisma.swapRequest.deleteMany({
      where: {
        OR: [{ senderId: { in: demoUserIds } }, { receiverId: { in: demoUserIds } }],
      },
    }),
    prisma.itemThread.deleteMany({
      where: {
        OR: [{ buyerId: { in: demoUserIds } }, { ownerId: { in: demoUserIds } }],
      },
    }),
    prisma.notification.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.swipePass.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.favorite.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.productEvent.deleteMany({ where: { actorId: { in: demoUserIds } } }),
    prisma.userBlock.deleteMany({
      where: {
        OR: [{ blockerId: { in: demoUserIds } }, { blockedId: { in: demoUserIds } }],
      },
    }),
  ]);
  await prisma.item.deleteMany({
    where: {
      ownerId: { in: demoUserIds },
      title: { startsWith: "[E2E]" },
    },
  });
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
