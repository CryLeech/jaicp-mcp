## Context

Текущий сервер — тонкая обёртка: YAML парсится в список операций, вызов собирается вручную. Контракт JAICP и Tovie совпадает побайтно, поэтому отдельного Tovie-парсера нет.

## Goals / Non-Goals

**Goals:** сделать OpenAPI источником required/defaults/content-type/safety; закрыть обход write-guard; поддержать form/multipart/binary; добавить автономные тесты и двуязычные документы.

**Non-Goals:** публикация в npm; GitHub Release/тег; live-вызовы CAILA/Dialer/Tovie; полное удаление ПДн; multipart с чтением локальных файлов.

## Decisions

- Вынести `fillPath` и валидацию path в `src/path.mjs`, сборку вызова — в `src/request.mjs`, чтобы `server.mjs` остался MCP-обвязкой.
- Дизамбигуация через необязательный `path`, а не через переименование `operationId` в индексе: уникальные id не ломаются.
- Write-классификация: GET/HEAD = read, кроме явного списка Dialer `addPhone*`; POST/PUT/PATCH/DELETE = write, кроме `_READ` в `x-security-authority` и явного списка reporter/CAILA read POST.
- Multipart принимает `{ filename, mediaType, data }` (base64) в поле `file` или в `body.file`.
- HTTPS обязателен; HTTP только для localhost или `JAICP_ALLOW_INSECURE_HOST=1`.
- Тесты: `node:test` без новых зависимостей; drift YAML — отдельный сетевой скрипт.

## Risks / Trade-offs

- `createFilterSetId` станет read из-за `GENERAL_ANALYTICS_READ` — это ближе к спеке, чем текущий confirm.
- Генерация отчётов reporter останется write (нет `_READ` на большинстве и есть side effect).
- Query arrays без `style` сериализуются как form/explode (несколько одноимённых ключей).
