import { describe, expect, it } from "vitest";
import {
  checkPassword,
  getPasswordChecks,
  isPasswordReady,
  passwordIsCommon,
  passwordIsSequential,
  passwordRepeatsIdentity,
} from "./password-policy";

describe("checkPassword", () => {
  it("accepts a reasonable password", () => {
    expect(checkPassword("morkovnyj-sok-42")).toBeNull();
    expect(isPasswordReady("morkovnyj-sok-42")).toBe(true);
  });

  it("still enforces the basic shape", () => {
    expect(checkPassword("abc1")).toBe("too-short");
    expect(checkPassword("a".repeat(200) + "1")).toBe("too-long");
    expect(checkPassword("bezcifrbukvy")).toBe("needs-letter-and-digit");
  });

  it("rejects passwords that pass the old rules but are trivially guessable", () => {
    // Все три проходили прежнюю проверку «8+ символов, буква и цифра».
    expect(checkPassword("parol123")).toBe("too-common");
    expect(checkPassword("qwerty12")).toBe("too-common");
    expect(checkPassword("password1")).toBe("too-common");
  });

  it("sees through leetspeak and trailing years", () => {
    expect(passwordIsCommon("P@ssw0rd")).toBe(true);
    expect(passwordIsCommon("qwerty2026")).toBe(true);
    expect(passwordIsCommon("privet1234")).toBe(false);
  });

  it("rejects sequences and single-character padding", () => {
    expect(passwordIsSequential("12345678")).toBe(true);
    expect(passwordIsSequential("abcdefgh")).toBe(true);
    expect(passwordIsSequential("aaaaaaa1")).toBe(true);
    expect(passwordIsSequential("morkovnyj-sok-42")).toBe(false);
  });

  it("rejects a password built from the user's own email or name", () => {
    expect(checkPassword("timur2026goda", { email: "timur@example.com" })).toBe("repeats-identity");
    expect(checkPassword("MariaMaria11", { name: "Maria" })).toBe("repeats-identity");
    expect(passwordRepeatsIdentity("nezavisimyj7", { email: "timur@example.com" })).toBe(false);
  });

  it("ignores identity fragments too short to matter", () => {
    // Трёхбуквенный логин совпал бы почти с любым паролем.
    expect(passwordRepeatsIdentity("anyparol9", { email: "ann@example.com" })).toBe(false);
  });
});

describe("getPasswordChecks", () => {
  it("stays quiet on an empty field instead of accusing the user upfront", () => {
    const checks = getPasswordChecks("");
    expect(checks.find((check) => check.id === "uncommon")?.passed).toBe(true);
    expect(checks.find((check) => check.id === "length")?.passed).toBe(false);
  });

  it("mirrors exactly what the server enforces", () => {
    const password = "qwerty12";
    const checks = getPasswordChecks(password);
    expect(checks.find((check) => check.id === "uncommon")?.passed).toBe(false);
    expect(isPasswordReady(password)).toBe(false);
  });
});
