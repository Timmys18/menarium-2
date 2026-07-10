import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Menarium — бартерная платформа";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          fontFamily: "system-ui, sans-serif",
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
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: "linear-gradient(135deg, #14b8a6, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
            }}
          >
            ⇄
          </div>
          <span style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>MENARIUM</span>
        </div>
        <p style={{ fontSize: 36, color: "rgba(255,255,255,0.75)", margin: 0 }}>
          Обменивай вещи и услуги без денег
        </p>
      </div>
    ),
    { ...size },
  );
}
