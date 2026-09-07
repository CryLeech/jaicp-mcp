# jaicp-mcp 0.1.0

Первый публичный тест MCP-сервера к API [JAICP](https://help.cloud.just-ai.com/jaicp/api/).

В npm пакет не выкладываем: клонируйте репозиторий, поставьте зависимости и подключите в клиенте `src/server.mjs`.

## Что нужно

- Node.js 20+
- Токен из раздела «Доступ к API» в JAICP — проекты, каналы, аналитика, текстовые рассылки (`JAICP_UNIFIED_TOKEN`)
- Для CAILA Direct — отдельный токен (`JAICP_NLP_TOKEN`)
- Для обзвонов Dialer — токен кампании (`JAICP_CALLS_TOKEN`)

Без unified-токена не заработают каналы, проекты, reporter и рассылки. Без `JAICP_NLP_TOKEN` не заработает CAILA. Без `JAICP_CALLS_TOKEN` — Dialer.

## Установка

```bash
git clone <this-repo>
cd jaicp-mcp
npm install
cp .env.example .env
```

Токены пишите в `.env` в корне клона. Этот файл в git не попадает.

Если переменные лежат в другом месте, укажите путь в `JAICP_ENV`.

```
JAICP_HOST=https://app.jaicp.com
JAICP_UNIFIED_TOKEN=
JAICP_PROJECT_SHORT_NAME=
JAICP_NLP_TOKEN=
JAICP_CALLS_TOKEN=
```

Проверка, что OpenAPI читается (токен не нужен):

```bash
npm run ops
```

## Клиенты

Сервер — обычный процесс `node src/server.mjs` (stdio). Cursor, Claude Code и Codex так умеют, но конфиг у каждого свой. Отдельного HTTP-адреса в 0.1 нет.

В примерах замените `/absolute/path/to/jaicp-mcp` на путь к клону. На Windows, если `node` не в PATH, укажите полный путь к `node.exe`.

В конфиг клиента токены не кладите. Их читает сам сервер из `.env`.

### Cursor (IDE и CLI)

Один файл на редактор и на Cursor CLI (`agent`): `~/.cursor/mcp.json` или `.cursor/mcp.json` в проекте.

```json
{
  "mcpServers": {
    "jaicp": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/jaicp-mcp/src/server.mjs"]
    }
  }
}
```

В Cursor токены можно держать не в `.env` репозитория, а в `~/.cursor/secrets/jaicp.env` — сервер смотрит туда первым.

Проверка: `agent mcp list`, затем `agent mcp list-tools jaicp`.

Документация: [Cursor MCP](https://cursor.com/docs/context/mcp), [Cursor CLI MCP](https://cursor.com/docs/cli/mcp).

### Claude Code

```bash
claude mcp add --transport stdio jaicp -- node /absolute/path/to/jaicp-mcp/src/server.mjs
```

Или `.mcp.json` в корне проекта (его можно коммитить, `.env` нельзя):

```json
{
  "mcpServers": {
    "jaicp": {
      "command": "node",
      "args": ["/absolute/path/to/jaicp-mcp/src/server.mjs"]
    }
  }
}
```

Проверка: `claude mcp list`. Если сервер описан в `.mcp.json`, Claude при первом запуске в этой папке может спросить подтверждение.

Документация: [Claude Code MCP](https://code.claude.com/docs/en/mcp).

### Codex CLI

Codex не читает `mcp.json`. Нужна запись в `~/.codex/config.toml`:

```toml
[mcp_servers.jaicp]
command = "node"
args = ["/absolute/path/to/jaicp-mcp/src/server.mjs"]
cwd = "/absolute/path/to/jaicp-mcp"
```

`cwd` — чтобы сервер нашёл `.env` в клоне, даже если Codex запущен из другой папки.

То же через CLI: `codex mcp add jaicp -- node /absolute/path/to/jaicp-mcp/src/server.mjs`. Проверка: `codex mcp list`.

Документация: [Codex MCP](https://developers.openai.com/codex/mcp/).

## Инструменты

| Инструмент | Что делает |
|------------|------------|
| `jaicp_specs` | Какие API подключены и какие токены заданы (да/нет, без значений) |
| `jaicp_operations` | Список операций одной спеки, можно сузить через `search` |
| `jaicp_call` | Вызов: `spec` + `operationId` + `pathParams` / `query` / `headers` / `body` |

Создание, изменение и удаление — только с `confirm: true`. То же для Dialer `addPhone`.

### Спеки

| id | Документация |
|----|--------------|
| `bot-channel` | https://app.jaicp.com/api/api-gateway/static/specs/bot-channel-api.html |
| `project` | https://app.jaicp.com/api/api-gateway/static/specs/project-api.html |
| `reporter` | https://app.jaicp.com/api/api-gateway/static/specs/reporter-api.html |
| `async` | https://app.jaicp.com/api/api-gateway/static/specs/async-api.html |
| `text-campaign` | https://app.jaicp.com/api/api-gateway/static/specs/text-campaign-api.html |
| `caila` | https://app.jaicp.com/cailapub/static/openapi/direct-api-en.html |
| `calls` | https://app.jaicp.com/dialer/static/openapi/index.html |

Копии YAML лежат в `vendor/specs/`. Обычная установка их не обновляет.

## Какой токен куда

| Спеки | Переменная |
|-------|------------|
| bot-channel, project, reporter, async, text-campaign | `JAICP_UNIFIED_TOKEN` (`Authorization: Bearer`) |
| caila | `JAICP_NLP_TOKEN` (подставляется в `{accessToken}` в пути) |
| calls | `JAICP_CALLS_TOKEN` (подставляется в `{token}` в пути) |

`JAICP_PROJECT_SHORT_NAME` сам попадает в query, если у операции есть такой параметр.

## Безопасность

- Токены в чат не копируйте
- Сервер вырезает секреты из ответов (в том числе CAILA `accessToken` и токен Telegram-бота в URL). На это лучше не рассчитывать как на единственную защиту
- В выгрузках reporter могут быть персональные данные
- Для тестов берите отдельный проект, не прод

## Лицензия

MIT. JAICP, CAILA, Conversational Cloud и связанные товарные знаки принадлежат Just AI; этот репозиторий — неофициальный клиент к их публичному API. Про копии OpenAPI — в `NOTICE.md`.
