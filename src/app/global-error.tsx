"use client";

import { useEffect } from "react";

/*
 * Последний рубеж: сюда попадают только ошибки самого корневого макета, из-за
 * которых `app/error.tsx` отрисоваться уже не может. Next.js заменяет корневой
 * макет целиком, поэтому здесь свои `<html>` и `<body>`, а `globals.css`
 * подключён как раз в замещаемом макете и на этот экран не распространяется.
 *
 * Отсюда и оформление стилями прямо в файле, и системный шрифт: экран обязан
 * выглядеть как продукт даже тогда, когда не загрузился ни один общий стиль и
 * ни один шрифт. Тема берётся из системной настройки — cookie с выбором
 * пользователя читать некому, серверная часть до этого места не доходит.
 *
 * Без этого файла такой сбой показывал бы стандартную страницу Next.js:
 * английский текст «Application error: a client-side exception has occurred»
 * на белом фоне.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <style>{`
          :root {
            color-scheme: dark;
            --ge-bg: #070a10;
            --ge-card: #101722;
            --ge-line: rgba(255, 255, 255, 0.1);
            --ge-text: #f7f9fc;
            --ge-muted: rgba(255, 255, 255, 0.62);
            --ge-danger-bg: rgba(239, 68, 68, 0.15);
            --ge-danger: #fca5a5;
            --ge-btn: #f7f9fc;
            --ge-btn-text: #070a10;
          }
          @media (prefers-color-scheme: light) {
            :root {
              color-scheme: light;
              --ge-bg: #f5f7fb;
              --ge-card: #ffffff;
              --ge-line: rgba(11, 18, 32, 0.14);
              --ge-text: #0b1220;
              --ge-muted: rgba(11, 18, 32, 0.58);
              --ge-danger-bg: rgba(185, 28, 28, 0.1);
              --ge-danger: #b91c1c;
              --ge-btn: #0b1220;
              --ge-btn-text: #ffffff;
            }
          }
          .ge-body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: var(--ge-bg);
            color: var(--ge-text);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
          }
          .ge-card {
            width: 100%;
            max-width: 34rem;
            box-sizing: border-box;
            padding: 32px;
            text-align: center;
            background: var(--ge-card);
            border: 1px solid var(--ge-line);
            border-radius: 22px;
          }
          .ge-badge {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            background: var(--ge-danger-bg);
            color: var(--ge-danger);
          }
          .ge-title { margin: 0; font-size: 1.75rem; font-weight: 650; letter-spacing: -0.02em; }
          .ge-text { margin: 12px 0 0; color: var(--ge-muted); }
          .ge-actions {
            margin-top: 24px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            justify-content: center;
          }
          @media (min-width: 640px) { .ge-actions { flex-direction: row; } }
          .ge-btn {
            min-height: 44px;
            padding: 0 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            border: 1px solid transparent;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
            background: var(--ge-btn);
            color: var(--ge-btn-text);
          }
          .ge-btn-secondary {
            background: transparent;
            color: var(--ge-text);
            border-color: var(--ge-line);
            text-decoration: none;
          }
          .ge-btn:focus-visible {
            outline: 2px solid #78aaff;
            outline-offset: 2px;
          }
        `}</style>
        <div className="ge-body">
          <div className="ge-card">
            <div className="ge-badge" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <h1 className="ge-title">Приложение не запустилось</h1>
            <p className="ge-text">
              Сбой произошёл до того, как страница успела собраться. Мы уже знаем о нём. Попробуйте
              обновить — если не поможет, вернитесь чуть позже.
            </p>
            <div className="ge-actions">
              <button type="button" className="ge-btn" onClick={reset}>
                Обновить
              </button>
              {/*
                Именно `<a>`, а не `<Link>`: клиентский переход сохранил бы
                уже развалившееся дерево React и упал бы повторно. Отсюда
                выбираться нужно полной перезагрузкой документа.
              */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="ge-btn ge-btn-secondary">
                На главную
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
