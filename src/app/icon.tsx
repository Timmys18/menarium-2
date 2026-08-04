import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const logoSvg = fs.readFileSync(
  path.join(process.cwd(), "public/brand/menarium-exchange.svg"),
  "utf8",
);
const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* ImageResponse needs a plain image element for embedded SVG data. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUrl} width={32} height={32} alt="" />
      </div>
    ),
    { ...size },
  );
}
