## Why

Первый публичный тест MCP-сервера к JAICP опирается на неполный разбор OpenAPI: дубли `operationId` в text-campaign невызываемы, write-guard смотрит на сырой pathname, required/defaults/content-type не используются, а HTTP всегда шлёт JSON. Это нужно закрыть до релиза 0.1.0, сохранив тот же контракт для Tovie Platform.

## What Changes

- OpenAPI становится источником обязательности, defaults, content-type и классификации мутаций.
- `jaicp_call` получает необязательный точный `path` для дизамбигуации; уникальный `operationId` по-прежнему работает.
- HTTP поддерживает JSON, `application/x-www-form-urlencoded` и безопасный multipart (base64 без чтения локальных путей).
- Бинарные ответы отдаются как MCP blob, а не ломаются через `res.text()`.
- Появляются timeout, запрет автоматических redirect, лимит размера ответа, валидация host и `JAICP_READ_ONLY`.
- Path-параметры с `..`, `/`, `\` и управляющими символами отвергаются.
- Автономные тесты покрывают контракт и stdio MCP без сети.
- Документация: русский канон, английские зеркала, двуязычный NOTICE; CHANGELOG в формате Keep a Changelog.

## Capabilities

### New Capabilities

- `api-contract`: разбор OpenAPI, выбор операции, required/defaults, форматы тела и ответа.
- `request-safety`: классификация мутаций, валидация path/host, redaction, timeout/redirect/limits, read-only режим.
- `release-docs`: SemVer 0.1.0, языки документации, совместимость JAICP/Tovie.

### Modified Capabilities

## Impact

`src/openapi.mjs`, `src/http.mjs`, `src/env.mjs`, `src/server.mjs`, новые модули `src/path.mjs` и `src/request.mjs`, `package.json`, `test/`, `README.md`, `README.en.md`, `CHANGELOG.md`, `CHANGELOG.en.md`, `NOTICE.md`, `.env.example`, `.gitattributes`, `scripts/sync-specs.ps1`. Зависимости не добавляются, кроме `node:test`.
