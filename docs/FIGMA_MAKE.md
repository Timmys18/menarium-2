# Figma Make — визуальный контракт Menarium

## Файл

| Поле | Значение |
|------|----------|
| Тип | **Figma Make** (не обычный Design) |
| File key | `XT9Xe6gYW5lm6qWyuCTVpd` |
| Название | Design premium UX for Menarium |
| Code node | `0:9` (из `code-node-id=0-9`) |
| Конфиг в репо | `figma.config.json` |

**Ссылка на проект:**

https://www.figma.com/make/XT9Xe6gYW5lm6qWyuCTVpd/Design-premium-UX-for-Menarium

**Пример превью экрана (профиль):**

https://www.figma.com/make/XT9Xe6gYW5lm6qWyuCTVpd/Design-premium-UX-for-Menarium?code-node-id=0-9&preview-route=%2Fprofile

## Как агент читает Make

Для Figma Make используется MCP-инструмент **`get_design_context`**:

- `fileKey`: `XT9Xe6gYW5lm6qWyuCTVpd`
- `nodeId`: `0:9` (или `0:1` для корня Make-файла)

`get_screenshot` для Make **не поддерживается**.

## Сверка с localhost

| Make `preview-route` | Страница сайта |
|----------------------|----------------|
| `/` | http://localhost:3000/ |
| `/catalog` | http://localhost:3000/catalog |
| `/swipe` | http://localhost:3000/swipe |
| `/profile` | http://localhost:3000/profile |
| `/exchange` | http://localhost:3000/exchange |
| `/new` | http://localhost:3000/new |

## Если Figma MCP не отвечает в Cursor

1. **Figma Desktop** открыт, вы залогинены, файл Make доступен.
2. Cursor → **Settings → MCP → Figma** → Reconnect / Sign in.
3. **Reload Window**: `Ctrl+Shift+P` → `Developer: Reload Window`.
4. Новое сообщение в чат: «проверь Figma Make».

Ошибка `Failed to acquire MessagePort` — сбой канала Cursor↔MCP, обычно лечится перезагрузкой окна.
