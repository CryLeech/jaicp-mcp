# Changelog

[Русский](CHANGELOG.md) · [English](CHANGELOG.en.md)

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), версии — [SemVer](https://semver.org/lang/ru/).

## [Unreleased]

## [0.1.0] — 2026-09-07

### Добавлено

- Три stdio-инструмента: `jaicp_specs`, `jaicp_operations`, `jaicp_call`
- Семь официальных OpenAPI: bot-channel, project, reporter, async, text-campaign, CAILA, Dialer
- Совместимость с JAICP и Tovie Platform через `JAICP_HOST`
- Write-guard по метаданным операции, `confirm` и `JAICP_READ_ONLY`
- Проверка required/defaults, дизамбигуация дублей `operationId` через `path`
- JSON, form-urlencoded, multipart (base64) и бинарные ответы
- Таймаут, запрет redirect, лимит размера, валидация host и path-параметров
- Автономные тесты (`npm test`) и сверка YAML (`npm run check-specs`)

### Безопасность

- Редакция типичных секретов в выводе инструментов
- Path-параметры не могут содержать `..` и разделители сегментов

[Unreleased]: https://github.com/CryLeech/jaicp-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/CryLeech/jaicp-mcp/releases/tag/v0.1.0
