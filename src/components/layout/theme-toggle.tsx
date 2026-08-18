"use client";

import { useState, useTransition } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { rememberTheme } from "@/app/theme-actions";
import type { ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

const options: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Светлая тема", icon: Sun },
  { value: "dark", label: "Тёмная тема", icon: Moon },
  { value: "system", label: "Как в системе", icon: Monitor },
];

export function ThemeToggle({ initial }: { initial: ThemeChoice }) {
  const [choice, setChoice] = useState(initial);
  const [isSaving, startTransition] = useTransition();

  function apply(next: ThemeChoice) {
    setChoice(next);

    // Атрибут переставляем сразу: переключение должно быть мгновенным и не
    // ждать сетевого ответа. Сервер запоминает выбор параллельно, чтобы
    // следующая страница пришла уже в нужной схеме.
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);

    startTransition(async () => {
      await rememberTheme(next);
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Оформление"
      className="inline-flex items-center gap-0.5 rounded-control border border-line-default bg-fill-1 p-0.5"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => apply(option.value)}
            disabled={isSaving && !active}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
              active
                ? "bg-fill-3 text-text-primary"
                : "text-text-subtle hover:bg-fill-2 hover:text-text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
