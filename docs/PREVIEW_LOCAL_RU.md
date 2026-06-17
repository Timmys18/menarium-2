# Как посмотреть Menarium локально (приёмка UI/UX)

Сайт — это Next.js на **http://localhost:3000**.

**Сейчас без базы:** главная (`/`) и каталог (`/catalog`) автоматически показывают демо-карточки и жёлтый баннер «Режим предпросмотра UI» — можно оценить внешний вид. Обмен, профиль, свайп и создание объявлений требуют PostgreSQL.

## Быстрый старт (Docker)

1. Запустите **Docker Desktop** и дождитесь статуса «Running».
2. В папке проекта:

```powershell
cd C:\Users\mks\Desktop\menarium-2
docker compose -f docker-compose.local.yml up -d
```

3. В `.env` должно быть:

```env
DATABASE_URL="postgresql://menarium:menarium_local_password@localhost:5432/menarium2?schema=public"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-only-replace-in-production"
```

4. База и демо-данные:

```powershell
npm run db:deploy
npm run db:seed
npm run dev
```

5. Браузер: **http://localhost:3000**

## Демо-входы (только локально)

| Email | Пароль |
|--------|--------|
| admin@menarium.ru | MenariumAdmin2026! |
| maria@menarium.ru | MenariumDemo2026! |
| dmitry@menarium.ru | MenariumDemo2026! |

Для проверки обмена откройте **две вкладки** (Maria и Dmitry).

## Маршрут приёмки UI (сверка с Figma)

| Шаг | URL | Что оценить |
|-----|-----|-------------|
| 1 | `/` | Главный экран, hero, карточки |
| 2 | `/catalog` | Фильтры, сортировка, сетка |
| 3 | `/swipe` | Карточка и кнопки действий |
| 4 | `/item/…` | Галерея, обмен, чат по объявлению |
| 5 | `/new` | Создание объявления и фото |
| 6 | `/exchange` | Вкладки обменов и чат сделки |
| 7 | `/profile` | Статистика и быстрые ссылки |
| 8 | `/notifications` | Список и «прочитано» |

Замечания удобно писать списком: экран → что не так (цвет, отступ, текст, отсутствующий блок).

## Маршрут приёмки бизнес-логики

1. Maria: войти → `/new` → создать объявление с фото.
2. Dmitry: другая вкладка → открыть объявление Maria → предложить обмен.
3. Maria: `/exchange` → принять → сообщение в чате сделки.
4. Обе стороны: завершить обмен.
5. Проверить `/notifications`, редактирование объявления, отклонение/отмену.
6. `/swipe`: пропуск — карточка не возвращается.

## Если Docker не используете

Укажите в `.env` свой `DATABASE_URL`, создайте БД `menarium2`, затем `npm run db:deploy` и `npm run db:seed`.

## Остановка Docker

```powershell
docker compose -f docker-compose.local.yml down
```
