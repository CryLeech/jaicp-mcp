<div align="center">

# jaicp-mcp

**MCP-сервер для работы AI-агентов с JAICP и Tovie Platform**

[![Release](https://img.shields.io/github/v/release/CryLeech/jaicp-mcp?display_name=tag)](https://github.com/CryLeech/jaicp-mcp/releases)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-stdio-5A67D8)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Русский](README.md) · [English](README.en.md)

</div>

`jaicp-mcp` подключает MCP-клиенты — Cursor, Claude Code, Codex CLI и другие — к HTTP API [JAICP](https://help.cloud.just-ai.com/jaicp/api/) и [Tovie Platform](https://help.cloud.tovie.ai/platform/api/).

Сервер строит запросы по официальным OpenAPI, проверяет параметры до обращения к сети и защищает mutating-операции. Один и тот же контракт содержит 160 операций для обоих облаков.

> [!IMPORTANT]
> Это неофициальный проект. Он не является продуктом Just AI или Tovie AI.

## Возможности

- семь API: проекты, каналы, аналитика, асинхронные отчёты, текстовые рассылки, CAILA и Dialer;
- автоматическая подстановка required/default-параметров из OpenAPI;
- JSON, form-urlencoded, multipart-файлы из base64 и бинарные ответы;
- защита мутаций через `confirm` и глобальный режим `JAICP_READ_ONLY`;
- таймауты, запрет redirect, лимит ответа и редакция типичных секретов;
- одинаковый контракт для JAICP и Tovie Platform — меняются только хост и токены;
- полностью автономные тесты без запросов к реальным API.

## Быстрый старт

### 1. Установите сервер

Требуются Git и Node.js 20 или новее.

```bash
git clone https://github.com/CryLeech/jaicp-mcp.git
cd jaicp-mcp
npm ci
cp .env.example .env
```

В PowerShell последняя команда выглядит так:

```powershell
Copy-Item .env.example .env
```

### 2. Добавьте токен

Откройте `.env` и укажите как минимум unified-токен из раздела JAICP/Tovie «Доступ к API»:

```dotenv
JAICP_HOST=https://app.jaicp.com
JAICP_UNIFIED_TOKEN=your-unified-token
JAICP_PROJECT_SHORT_NAME=your-project-short-name
```

Для Tovie Platform используйте `JAICP_HOST=https://platform.tovie.ai` и токен, выпущенный этим облаком.

> [!CAUTION]
> Не добавляйте `.env` в Git и не помещайте токены в конфигурацию MCP-клиента.

### 3. Подключите MCP-клиент

Добавьте сервер в `~/.cursor/mcp.json` или `.cursor/mcp.json`, заменив путь на абсолютный:

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

После перезапуска Cursor сервер предоставит три инструмента: `jaicp_specs`, `jaicp_operations` и `jaicp_call`.

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add --transport stdio jaicp -- node /absolute/path/to/jaicp-mcp/src/server.mjs
```

Подробнее: [Claude Code MCP](https://code.claude.com/docs/en/mcp).

</details>

<details>
<summary><strong>Codex CLI</strong></summary>

```toml
[mcp_servers.jaicp]
command = "node"
args = ["/absolute/path/to/jaicp-mcp/src/server.mjs"]
cwd = "/absolute/path/to/jaicp-mcp"
```

Подробнее: [Codex MCP](https://developers.openai.com/codex/mcp/).

</details>

## Примеры запросов

После подключения можно обращаться к API обычным языком:

- «Покажи список проектов JAICP».
- «Найди операции для получения статистики сессий».
- «Покажи текстовые рассылки проекта `my-project`».
- «Экспортируй интенты CAILA».

Перед вызовом сервер найдёт точную OpenAPI-операцию, проверит обязательные параметры и определит, изменяет ли она данные.

## Инструменты

### `jaicp_specs`

Показывает подключённые API, хост, версию сервера и наличие нужных токенов. Значения токенов не возвращаются.

### `jaicp_operations`

Ищет операции одной спеки по `operationId`, пути, тегу или описанию. Возвращает required/default-параметры, форматы тела и ответа, а также признак мутации.

### `jaicp_call`

Выполняет операцию по `spec` + `operationId`. При совпадающих `operationId` принимает точный OpenAPI `path` для дизамбигуации.

```json
{
  "spec": "project",
  "operationId": "getByProjectShortName",
  "pathParams": {
    "projectShortName": "my-project"
  }
}
```

## Поддерживаемые API

- `bot-channel` — [JAICP](https://app.jaicp.com/api/api-gateway/static/specs/bot-channel-api.html) · [Tovie](https://platform.tovie.ai/api/api-gateway/static/specs/bot-channel-api.html)
- `project` — [JAICP](https://app.jaicp.com/api/api-gateway/static/specs/project-api.html) · [Tovie](https://platform.tovie.ai/api/api-gateway/static/specs/project-api.html)
- `reporter` — [JAICP](https://app.jaicp.com/api/api-gateway/static/specs/reporter-api.html) · [Tovie](https://platform.tovie.ai/api/api-gateway/static/specs/reporter-api.html)
- `async` — [JAICP](https://app.jaicp.com/api/api-gateway/static/specs/async-api.html) · [Tovie](https://platform.tovie.ai/api/api-gateway/static/specs/async-api.html)
- `text-campaign` — [JAICP](https://app.jaicp.com/api/api-gateway/static/specs/text-campaign-api.html) · [Tovie](https://platform.tovie.ai/api/api-gateway/static/specs/text-campaign-api.html)
- `caila` — [JAICP](https://app.jaicp.com/cailapub/static/openapi/direct-api-en.html) · [Tovie](https://platform.tovie.ai/cailapub/static/openapi/direct-api-en.html)
- `calls` — [JAICP](https://app.jaicp.com/dialer/static/openapi/index.html) · [Tovie](https://platform.tovie.ai/dialer/static/openapi/index.html)

Vendored-копии YAML находятся в `vendor/specs/`. `npm run check-specs` сравнивает их с файлами обоих облаков.

## Конфигурация

| Переменная | Назначение | По умолчанию |
| --- | --- | --- |
| `JAICP_HOST` | Хост JAICP или Tovie Platform | `https://app.jaicp.com` |
| `JAICP_UNIFIED_TOKEN` | Проекты, каналы, reporter и рассылки | — |
| `JAICP_PROJECT_SHORT_NAME` | Проект для path/query, если он не указан в вызове | — |
| `JAICP_NLP_TOKEN` | CAILA / NLP Direct | — |
| `JAICP_CALLS_TOKEN` | Dialer | — |
| `JAICP_READ_ONLY` | Запретить любые мутации | `false` |
| `JAICP_FETCH_TIMEOUT_MS` | Таймаут HTTP-запроса | `120000` |
| `JAICP_MAX_RESPONSE_BYTES` | Максимальный размер ответа | `2000000` |
| `JAICP_ENV` | Путь к другому env-файлу | — |

Сервер ищет конфигурацию в `~/.cursor/secrets/jaicp.env`, затем в `.env` проекта. Явные переменные окружения имеют приоритет.

`JAICP_PROJECT_SHORT_NAME` подставляется и в query, и в `{projectShortName}` path.

## Безопасность

> [!WARNING]
> `confirm: true` защищает только от случайного вызова: этот флаг передаёт та же AI-модель. Для гарантированного запрета изменений используйте `JAICP_READ_ONLY=true`.

- мутации определяются по HTTP-методу и `x-security-authority`;
- Dialer `addPhone*` считается мутацией даже при использовании GET;
- path-параметры с `/`, `\`, dot-segments и управляющими символами отклоняются;
- автоматические HTTP-redirect запрещены;
- multipart принимает base64, но не читает произвольные локальные пути;
- сервер редактирует типичные токены, но не обещает удалять персональные данные;
- reporter-выгрузки могут содержать персональные данные.

HTTP без TLS разрешён только для localhost. Для явного dev-исключения существует `JAICP_ALLOW_INSECURE_HOST=1`.

## Форматы данных

- JSON используется по умолчанию;
- `application/x-www-form-urlencoded` поддерживается для Dialer;
- `multipart/form-data` принимает `{ filename, mediaType, data }`, где `data` — base64;
- JSON и text-ответы возвращаются как текст MCP;
- `application/octet-stream` возвращается как MCP embedded resource.

## Разработка

```bash
npm test
npm run check
npm run check-specs
openspec validate --all --strict --no-interactive
```

Изменения проектируются через [OpenSpec](https://github.com/Fission-AI/OpenSpec). Активные изменения находятся в `openspec/changes/`.

## Лицензия

Исходный код распространяется по [MIT](LICENSE). JAICP и связанные знаки принадлежат Just AI; Tovie AI Platform и связанные знаки — Tovie AI. Подробнее: [NOTICE.md](NOTICE.md).
