import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Меняйся. Просто";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const [logoData, onestRegular, onestBold] = await Promise.all([
    readFile(join(process.cwd(), "public/brand/menarium-exchange.png"), "base64"),
    readFile(join(process.cwd(), "assets/fonts/Onest-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Onest-Bold.ttf")),
  ]);
  const logoUrl = `data:image/png;base64,${logoData}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #1a1030 100%)",
          color: "white",
          fontFamily: "Onest",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 32,
          }}
        >
          {/* ImageResponse does not support next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            width={88}
            height={88}
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              objectFit: "cover",
            }}
          />
          <span style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>Менариум</span>
        </div>
        <p style={{ fontSize: 36, color: "rgba(255,255,255,0.75)", margin: 0 }}>
          Меняйся. Просто
        </p>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Onest",
          data: onestRegular,
          style: "normal",
          weight: 400,
        },
        {
          name: "Onest",
          data: onestBold,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
