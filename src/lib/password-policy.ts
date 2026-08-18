export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Пароли, которые перебираются первыми в любой массовой атаке: верхушка утечек
 * и типовые русскоязычные варианты. Список держим локально осознанно —
 * внешний сервис проверки (например, Have I Been Pwned) добавил бы сетевую
 * зависимость прямо в путь регистрации и падал бы вместе с ней.
 */
const COMMON_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "111111",
  "1234567",
  "password",
  "password1",
  "password123",
  "qwerty",
  "qwerty123",
  "qwerty1",
  "qwertyuiop",
  "1q2w3e4r",
  "1q2w3e4r5t",
  "1qaz2wsx",
  "zaq12wsx",
  "abc123",
  "iloveyou",
  "admin123",
  "welcome1",
  "monkey123",
  "dragon123",
  "letmein1",
  "sunshine1",
  "princess1",
  "football1",
  "baseball1",
  "superman1",
  "trustno1",
  "master123",
  "shadow123",
  "michael1",
  "jennifer1",
  "computer1",
  "internet1",
  "samsung1",
  "google123",
  "test1234",
  "user1234",
  "guest123",
  "root1234",
  "changeme1",
  "secret123",
  "passw0rd",
  "parol123",
  "parolparol",
  "privet123",
  "privetvsem",
  "russia123",
  "moscow123",
  "spartak1",
  "zenit123",
  "dinamo123",
  "lokomotiv1",
  "natasha1",
  "sergey123",
  "andrey123",
  "aleksey123",
  "vladimir1",
  "ekaterina1",
  "menarium1",
  "menarium123",
]);

export function passwordHasLetter(password: string) {
  return /\p{L}/u.test(password);
}

export function passwordHasDigit(password: string) {
  return /\d/.test(password);
}

function normalize(password: string) {
  return password.trim().toLowerCase();
}

/** `Passw0rd` и `p@ssword` — тот же словарный пароль, только с косметикой. */
function undoLeetspeak(value: string) {
  return value
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t");
}

export function passwordIsCommon(password: string) {
  const normalized = normalize(password);
  if (COMMON_PASSWORDS.has(normalized)) return true;
  if (COMMON_PASSWORDS.has(undoLeetspeak(normalized))) return true;

  // «Слово + цифры» и «слово + год» — самая частая попытка обойти требование
  // цифр, не меняя при этом сам словарный пароль.
  const base = normalized.replace(/[\d!?.\-_@#$*]+$/, "");
  if (base.length >= 4 && COMMON_PASSWORDS.has(base)) return true;

  return base.length >= 4 && COMMON_PASSWORDS.has(undoLeetspeak(base));
}

/** `aaaaaaaa`, `12345678`, `abcdefgh` — длина без какой-либо стойкости. */
export function passwordIsSequential(password: string) {
  const normalized = normalize(password);
  if (normalized.length < 4) return false;
  if (new Set(normalized).size <= 2) return true;

  let ascending = true;
  let descending = true;
  for (let index = 1; index < normalized.length; index += 1) {
    const delta = normalized.charCodeAt(index) - normalized.charCodeAt(index - 1);
    if (delta !== 1) ascending = false;
    if (delta !== -1) descending = false;
  }
  return ascending || descending;
}

/**
 * Пароль, собранный из собственной почты или имени, подбирается по профилю
 * пользователя, а не перебором — и потому не защищает вообще.
 */
export function passwordRepeatsIdentity(
  password: string,
  identity: { email?: string | null; name?: string | null },
) {
  const normalized = normalize(password);
  const parts = [identity.email?.split("@")[0], identity.name]
    .filter((part): part is string => Boolean(part && part.trim().length >= 4))
    .map((part) => part.trim().toLowerCase());

  return parts.some((part) => normalized.includes(part));
}

export type PasswordIdentity = { email?: string | null; name?: string | null };

export type PasswordRejection =
  | "too-short"
  | "too-long"
  | "needs-letter-and-digit"
  | "too-common"
  | "repeats-identity";

export const passwordRejectionMessages: Record<PasswordRejection, string> = {
  "too-short": `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов`,
  "too-long": `Пароль должен быть не длиннее ${PASSWORD_MAX_LENGTH} символов`,
  "needs-letter-and-digit": "Пароль должен содержать буквы и цифры",
  "too-common": "Такой пароль слишком часто встречается в утечках. Придумайте другой",
  "repeats-identity": "Пароль не должен повторять вашу почту или имя",
};

/**
 * Единая точка проверки: форма и API обязаны судить о пароле одинаково, иначе
 * клиент рисует зелёную галочку там, где сервер вернёт ошибку.
 */
export function checkPassword(password: string, identity: PasswordIdentity = {}): PasswordRejection | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "too-short";
  if (password.length > PASSWORD_MAX_LENGTH) return "too-long";
  if (!passwordHasLetter(password) || !passwordHasDigit(password)) return "needs-letter-and-digit";
  if (passwordIsCommon(password) || passwordIsSequential(password)) return "too-common";
  if (passwordRepeatsIdentity(password, identity)) return "repeats-identity";
  return null;
}

export function describePasswordRejection(rejection: PasswordRejection) {
  return passwordRejectionMessages[rejection];
}

export function getPasswordChecks(password: string, identity: PasswordIdentity = {}) {
  return [
    { id: "length", label: `${PASSWORD_MIN_LENGTH}+ символов`, passed: password.length >= PASSWORD_MIN_LENGTH },
    { id: "letter", label: "есть буква", passed: passwordHasLetter(password) },
    { id: "digit", label: "есть цифра", passed: passwordHasDigit(password) },
    {
      id: "uncommon",
      label: "не из частых",
      passed:
        password.length === 0 ||
        (!passwordIsCommon(password) &&
          !passwordIsSequential(password) &&
          !passwordRepeatsIdentity(password, identity)),
    },
  ];
}

export function isPasswordReady(password: string, identity: PasswordIdentity = {}) {
  return checkPassword(password, identity) === null;
}
