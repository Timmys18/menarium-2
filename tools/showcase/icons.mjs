/*
 * Пересобирает растровые знаки из вектора.
 *
 * Знак живёт в одном файле — `public/brand/menarium-exchange.svg`. Из него
 * получаются иконка приложения, apple-icon и знак на карточке для соцсетей.
 * Скрипт нужен потому, что три растра — это три места, где цвет знака может
 * разойтись с вектором, и однажды он разошёлся: в варианте 3 знак в шапке
 * стал тёплым, а иконка приложения осталась синей.
 *
 *   node tools/showcase/icons.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const svg = readFileSync(path.join(root, "public/brand/menarium-exchange.svg"));

// Фон иконки приложения совпадает с фоном продукта: на домашнем экране
// прозрачный знак лёг бы на что угодно.
const APP_ICON_BG = { r: 12, g: 11, b: 10, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// Знак для соцсетей — прозрачный: его кладут на собственный фон карточки.
await sharp(svg, { density: 400 })
  .resize(512, 512, { fit: "contain", background: TRANSPARENT })
  .png()
  .toFile(path.join(root, "public/brand/menarium-exchange.png"));

for (const [out, size] of [["src/app/icon.png", 512], ["src/app/apple-icon.png", 180]]) {
  // 0.82 — поля вокруг знака: без них скруглённая маска iOS срезает кольцо.
  const inner = Math.round(size * 0.82);
  const mark = await sharp(svg, { density: 400 })
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: APP_ICON_BG } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(path.join(root, out));
}

console.log("Знаки пересобраны из public/brand/menarium-exchange.svg");
