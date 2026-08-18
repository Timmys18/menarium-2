import { describe, expect, it } from "vitest";
import { chatWithLabel, formatMonthYearGenitive, toInstrumentalName } from "./russian";

describe("formatMonthYearGenitive", () => {
  it("uses the genitive case the phrase requires", () => {
    // Intl отдал бы «август 2026», из чего получалось «С нами с август 2026 г.»
    expect(formatMonthYearGenitive(new Date("2026-08-18T00:00:00Z"))).toBe("августа 2026");
    expect(formatMonthYearGenitive(new Date("2026-01-05T00:00:00Z"))).toBe("января 2026");
    expect(formatMonthYearGenitive(new Date("2026-05-01T00:00:00Z"))).toBe("мая 2026");
  });
});

describe("toInstrumentalName", () => {
  it("inflects the regular masculine endings", () => {
    expect(toInstrumentalName("Дмитрий")).toBe("Дмитрием");
    expect(toInstrumentalName("Сергей")).toBe("Сергеем");
    expect(toInstrumentalName("Иван")).toBe("Иваном");
  });

  it("inflects the regular feminine endings", () => {
    expect(toInstrumentalName("Мария")).toBe("Марией");
    expect(toInstrumentalName("Анна")).toBe("Анной");
    expect(toInstrumentalName("Аня")).toBe("Аней");
    expect(toInstrumentalName("Саша")).toBe("Сашей");
  });

  it("keeps the initial that follows the first name", () => {
    expect(toInstrumentalName("Дмитрий П.")).toBe("Дмитрием П.");
    expect(toInstrumentalName("Мария К.")).toBe("Марией К.");
  });

  it("leaves alone what it cannot inflect with confidence", () => {
    // Мягкий знак не позволяет определить род: «Игорь» и «Любовь» склоняются
    // по-разному, а ошибка здесь заметнее, чем несклонённое имя.
    expect(toInstrumentalName("Игорь")).toBe("Игорь");
    expect(toInstrumentalName("Timur")).toBe("Timur");
    expect(toInstrumentalName("ИП")).toBe("ИП");
    expect(toInstrumentalName("Ян")).toBe("Ян");
    expect(toInstrumentalName("")).toBe("");
  });
});

describe("chatWithLabel", () => {
  it("produces the phrase the interface actually shows", () => {
    expect(chatWithLabel("Дмитрий П.")).toBe("Чат с Дмитрием П.");
  });

  it("has one fallback for a missing name", () => {
    expect(chatWithLabel(null)).toBe("Чат с собеседником");
    expect(chatWithLabel("   ")).toBe("Чат с собеседником");
  });
});
