/**
 * Fail-fast проверка обязательных переменных окружения при старте в production.
 * Вызывается из instrumentation.ts — до обработки первых запросов.
 */
export function validateProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const required = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length) {
    throw new Error(`[env] Отсутствуют обязательные переменные: ${missing.join(", ")}`);
  }

  if (process.env.STORAGE_PROVIDER === "s3") {
    const s3Keys = ["STORAGE_BUCKET", "STORAGE_REGION", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY", "STORAGE_PUBLIC_BASE_URL"] as const;
    const s3Missing = s3Keys.filter((key) => !process.env[key]?.trim());
    if (s3Missing.length) {
      throw new Error(`[env] S3 storage: отсутствуют ${s3Missing.join(", ")}`);
    }
  }
}
