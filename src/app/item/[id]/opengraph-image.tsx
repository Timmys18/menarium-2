import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ItemStatus, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { itemWantedLabel } from "@/features/items/presenters";

export const alt = "Объявление на Менариуме";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Ссылка на объявление расходится по мессенджерам — это основной канал для
 * C2C в России. Без собственной картинки превью приходило пустым, и вместе с
 * ним пропадала главная причина открыть ссылку: фотография вещи.
 */
export default async function ItemOpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, onestRegular, onestBold] = await Promise.all([
    prisma.item
      .findFirst({
        where: { id, status: ItemStatus.ACTIVE, owner: { status: UserStatus.ACTIVE } },
        select: {
          title: true,
          category: true,
          city: true,
          desired: true,
          acceptsAnything: true,
          extraOfferText: true,
          images: { select: { url: true }, take: 1 },
        },
      })
      .catch(() => null),
    readFile(join(process.cwd(), "assets/fonts/Onest-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Onest-Bold.ttf")),
  ]);

  const title = item?.title ?? "Менариум";
  const wanted = item
    ? itemWantedLabel({
        desired: item.desired,
        acceptsAnything: item.acceptsAnything,
        extraOfferText: item.extraOfferText,
      })
    : "Обмен вещами и услугами";
  const photo = item?.images[0]?.url;
  const photoUrl = photo?.startsWith("http") ? photo : undefined;

  const fonts = [
    { name: "Onest", data: onestRegular, style: "normal" as const, weight: 400 as const },
    { name: "Onest", data: onestBold, style: "normal" as const, weight: 700 as const },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #070a10 0%, #0d131d 55%, #101722 100%)",
          color: "white",
          fontFamily: "Onest",
        }}
      >
        {photoUrl ? (
          <div
            style={{
              width: 520,
              height: "100%",
              display: "flex",
              backgroundImage: `url("${photoUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : null}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: photoUrl ? "64px 64px 64px 56px" : "64px 96px",
          }}
        >
          <span
            style={{
              fontSize: 24,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#5eead4",
              marginBottom: 20,
            }}
          >
            {item?.category ?? "Менариум"}
          </span>
          <span
            style={{
              fontSize: photoUrl ? 60 : 76,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.08,
              // Длинный заголовок иначе выдавливает подпись и город за пределы
              // картинки, и превью приходит обрезанным.
              display: "block",
              overflow: "hidden",
              maxHeight: photoUrl ? 200 : 260,
            }}
          >
            {title}
          </span>
          <span
            style={{
              marginTop: 28,
              fontSize: 30,
              color: "rgba(230,236,247,0.78)",
              display: "block",
              overflow: "hidden",
              maxHeight: 80,
            }}
          >
            {wanted}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: "auto" }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: "#78aaff" }}>Менариум</span>
            {item?.city ? (
              <span style={{ fontSize: 26, color: "rgba(230,236,247,0.62)" }}>· {item.city}</span>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
