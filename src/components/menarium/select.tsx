"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  /** Заголовок группы, аналог `<optgroup>`. Рисуется перед первым пунктом группы. */
  group?: string;
};

/**
 * Заменяет нативный `<select>`.
 *
 * Системный `<select>` рисуется движком ОС: собственная стрелка, собственное
 * меню, собственные цвета. Рядом с кастомными пикерами продукта это выглядело
 * как два разных приложения в одной колонке фильтров, а длинная подпись
 * («Сначала выберите категорию») ещё и обрезалась системной стрелкой.
 *
 * Поведение клавиатуры повторяет нативное намеренно: стрелки двигают активный
 * пункт, Home/End прыгают к краям, набор букв ищет по началу подписи,
 * Enter выбирает, Escape закрывает. Иначе замена нативного элемента отняла бы
 * у клавиатурных пользователей то, что у них уже работало.
 */
export function MenariumSelect({
  value,
  options,
  onChange,
  id,
  placeholder = "Выберите значение",
  ariaLabel,
  icon,
  disabled = false,
  disabledHint,
  className,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Подсказка вместо placeholder, когда выбор ещё невозможен. */
  disabledHint?: string;
  className?: string;
}) {
  const listId = useId();
  const optionIdPrefix = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ query: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState<"up" | "down">("down");
  // Высоту списка считаем от фактического места на экране, а не фиксированным
  // значением: иначе список упирается в край панели и последний пункт
  // обрезается пополам.
  const [maxHeight, setMaxHeight] = useState(248);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      close();
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open, close]);

  // Активный пункт должен оставаться в поле зрения при движении стрелками,
  // иначе длинный список «прокручивается» только визуально.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function openList() {
    if (disabled) return;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const gap = 8;
      const margin = 16;
      const roomBelow = window.innerHeight - rect.bottom - gap - margin;
      const roomAbove = rect.top - gap - margin;
      const openUpwards = roomBelow < 176 && roomAbove > roomBelow;
      setPlacement(openUpwards ? "up" : "down");
      setMaxHeight(Math.max(140, Math.min(320, openUpwards ? roomAbove : roomBelow)));
    }

    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options));
    setOpen(true);
  }

  function commit(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
    triggerRef.current?.focus();
  }

  function moveActive(direction: 1 | -1) {
    setActiveIndex((current) => {
      const start = current < 0 ? (direction === 1 ? -1 : options.length) : current;
      for (let step = 1; step <= options.length; step += 1) {
        const next = start + direction * step;
        if (next < 0 || next >= options.length) break;
        if (!options[next]?.disabled) return next;
      }
      return current;
    });
  }

  function selectByTypeahead(key: string) {
    const now = Date.now();
    // Пауза дольше секунды начинает новый поиск: так «ма» ищет «Мебель»,
    // а не продолжает предыдущий набор.
    typeahead.current.query = now - typeahead.current.at > 1000 ? key : typeahead.current.query + key;
    typeahead.current.at = now;

    const query = typeahead.current.query.toLowerCase();
    const found = options.findIndex(
      (option) => !option.disabled && option.label.toLowerCase().startsWith(query),
    );
    if (found >= 0) setActiveIndex(found);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        triggerRef.current?.focus();
        break;
      case "ArrowDown":
        event.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActive(-1);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(firstEnabledIndex(options));
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(lastEnabledIndex(options));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        break;
      case "Tab":
        close();
        break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          selectByTypeahead(event.key);
        }
    }
  }

  const triggerLabel = selected?.label ?? (disabled && disabledHint ? disabledHint : placeholder);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-activedescendant={open && activeIndex >= 0 ? `${optionIdPrefix}-${activeIndex}` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex min-h-12 w-full items-center justify-between gap-3 rounded-control border border-line-default bg-[var(--surface-input)] px-4 py-3 text-left text-text-primary outline-none transition",
          "hover:border-line-strong focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
          "disabled:cursor-not-allowed disabled:border-line-hairline disabled:text-text-subtle disabled:hover:border-line-hairline",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon ? <span className="shrink-0 text-accent">{icon}</span> : null}
          <span className={cn("truncate", selected ? "text-text-primary" : "text-text-subtle")}>{triggerLabel}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-subtle transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 z-[70] w-full overflow-hidden rounded-md border border-line-default bg-[var(--surface-raised)] p-2 shadow-[0_22px_60px_rgba(0,0,0,0.5)]",
            placement === "up" ? "bottom-[calc(100%+.5rem)]" : "top-[calc(100%+.5rem)]",
          )}
        >
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{ maxHeight }}
            className="menarium-scrollbar overflow-y-auto overscroll-contain pr-1"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const startsGroup = Boolean(option.group) && option.group !== options[index - 1]?.group;
              return (
                <div key={option.value || `empty-${index}`} role="presentation">
                  {startsGroup ? (
                    <p
                      role="presentation"
                      className="px-3 pb-1 pt-3 text-micro font-semibold uppercase tracking-[0.12em] text-text-subtle first:pt-1"
                    >
                      {option.group}
                    </p>
                  ) : null}
                  <button
                    id={`${optionIdPrefix}-${index}`}
                    data-index={index}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    disabled={option.disabled}
                    aria-selected={isSelected}
                    onKeyDown={onKeyDown}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(index)}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-3 rounded-xs px-3 py-2.5 text-left transition",
                      "focus-visible:outline-none disabled:cursor-not-allowed disabled:text-text-faint",
                      index === activeIndex && !option.disabled && "bg-fill-2",
                      isSelected && "bg-teal-300/[0.09]",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text-primary">{option.label}</span>
                      {option.hint ? (
                        <span className="block truncate text-xs text-text-subtle">{option.hint}</span>
                      ) : null}
                    </span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
                  </button>
                </div>
              );
            })}
            {options.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-text-subtle">Нет доступных вариантов.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function firstEnabledIndex(options: SelectOption[]) {
  return options.findIndex((option) => !option.disabled);
}

function lastEnabledIndex(options: SelectOption[]) {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index]?.disabled) return index;
  }
  return -1;
}
