export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function passwordHasLetter(password: string) {
  return /\p{L}/u.test(password);
}

export function passwordHasDigit(password: string) {
  return /\d/.test(password);
}

export function getPasswordChecks(password: string) {
  return [
    { id: "length", label: `${PASSWORD_MIN_LENGTH}+ символов`, passed: password.length >= PASSWORD_MIN_LENGTH },
    { id: "letter", label: "есть буква", passed: passwordHasLetter(password) },
    { id: "digit", label: "есть цифра", passed: passwordHasDigit(password) },
  ];
}

export function isPasswordReady(password: string) {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    passwordHasLetter(password) &&
    passwordHasDigit(password)
  );
}
