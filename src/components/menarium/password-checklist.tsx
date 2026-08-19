import { Check, X } from "lucide-react";
import type { getPasswordChecks } from "@/lib/password-policy";

/**
 * Пройденный и непройденный пункт раньше отличались только цветом текста —
 * одна и та же галочка, просто приглушённая. Для человека, который цвет
 * не различает, оба состояния выглядели одинаково пройденными.
 */
export function PasswordChecklist({ checks }: { checks: ReturnType<typeof getPasswordChecks> }) {
  return (
    <>
      {checks.map((check) => (
        <span
          key={check.id}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-micro transition ${
            check.passed
              ? "border-teal-300/20 bg-teal-300/[0.08] text-accent"
              : "border-line-hairline bg-fill-1 text-text-subtle"
          }`}
        >
          {check.passed ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
          {check.label}
        </span>
      ))}
    </>
  );
}
