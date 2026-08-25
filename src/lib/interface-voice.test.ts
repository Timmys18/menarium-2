import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = path.join(process.cwd(), "src");
const informalForms = [
  /(?<![\p{L}])Расскажи(?![\p{L}])/iu,
  /(?<![\p{L}])Добавь(?![\p{L}])/iu,
  /(?<![\p{L}])Выбери(?![\p{L}])/iu,
  /(?<![\p{L}])Укажи(?![\p{L}])/iu,
  /(?<![\p{L}])Создай(?![\p{L}])/iu,
  /(?<![\p{L}])Твои(?![\p{L}])/iu,
  /(?<![\p{L}])Дай(?![\p{L}])/iu,
  /(?<![\p{L}])Оставь(?![\p{L}])/iu,
  /(?<![\p{L}])Сократи(?![\p{L}])/iu,
  /(?<![\p{L}])Напиши(?![\p{L}])/iu,
  /(?<![\p{L}])Тяни(?![\p{L}])/iu,
  /(?<![\p{L}])Найди(?![\p{L}])/iu,
  /(?<![\p{L}])Договорись(?![\p{L}])/iu,
  /(?<![\p{L}])Заверши(?![\p{L}])/iu,
  /(?<![\p{L}])Продолжай(?![\p{L}])/iu,
  /(?<![\p{L}])Открой(?![\p{L}])/iu,
  /(?<![\p{L}])Измени(?![\p{L}])/iu,
  /(?<![\p{L}])Проверь(?![\p{L}])/iu,
  /(?<![\p{L}])Смотри(?![\p{L}])/iu,
  /(?<![\p{L}])Вернись(?![\p{L}])/iu,
  /(?<![\p{L}])Подтверди(?![\p{L}])/iu,
  /(?<![\p{L}])Начни(?![\p{L}])/iu,
  /(?<![\p{L}])Удали(?![\p{L}])/iu,
  /(?<![\p{L}])тебя(?![\p{L}])/iu,
  /(?<![\p{L}])тебе(?![\p{L}])/iu,
  /(?<![\p{L}])твой(?![\p{L}])/iu,
  /(?<![\p{L}])твоя(?![\p{L}])/iu,
  /(?<![\p{L}])твоё(?![\p{L}])/iu,
  /(?<![\p{L}])твои(?![\p{L}])/iu,
  /(?<![\p{L}])хочешь(?![\p{L}])/iu,
  /(?<![\p{L}])можешь(?![\p{L}])/iu,
  /(?<![\p{L}])решишь(?![\p{L}])/iu,
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.(?:ts|tsx)$/.test(entry.name) && !/\.test\.(?:ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("interface voice", () => {
  it("uses formal Russian address in every product string", () => {
    const violations = sourceFiles(sourceRoot).flatMap((file) => {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      return lines.flatMap((line, index) => {
        const matched = informalForms.find((expression) => expression.test(line));
        return matched ? [`${path.relative(process.cwd(), file)}:${index + 1}: ${line.trim()}`] : [];
      });
    });

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("uses exchange terminology consistently", () => {
    const violations = sourceFiles(sourceRoot).flatMap((file) => {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      return lines.flatMap((line, index) =>
        /сделк/iu.test(line) ? [`${path.relative(process.cwd(), file)}:${index + 1}: ${line.trim()}`] : [],
      );
    });

    expect(violations, violations.join("\n")).toEqual([]);
  });
});
