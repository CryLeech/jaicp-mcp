## 1. Контракт OpenAPI

- [x] 1.1 Расширить парсер: required, default, style/explode, content-type, `x-security-authority`, sandbox `$ref`
- [x] 1.2 Добавить `findOperation(spec, operationId, path?)` с ошибкой, в которой перечислены пути
- [x] 1.3 Вынести сборку запроса: required, defaults, `projectShortName`, массивы query
- [x] 1.4 Классифицировать мутации по метаданным операции

## 2. Транспорт и безопасность

- [x] 2.1 Поддержать JSON, form-urlencoded и multipart из base64
- [x] 2.2 Обработать JSON/text и octet-stream ответы
- [x] 2.3 Добавить timeout, manual redirect, лимит размера, валидацию host и `JAICP_READ_ONLY`
- [x] 2.4 Расширить redaction и запретить опасные path-параметры

## 3. Тесты

- [x] 3.1 Unit-тесты parser/request/http/env/path без сети
- [x] 3.2 Матрица всех 160 операций: индекс, однозначный выбор, safety
- [x] 3.3 Stdio MCP integration с mock fetch
- [x] 3.4 Скрипты `test`, `check`, `check-specs`

## 4. Документы и проверка

- [x] 4.1 README/CHANGELOG ru+en, двуязычный NOTICE, `.gitattributes`, `.env.example`
- [x] 4.2 Сверить YAML JAICP и Tovie; smoke только тестовый проект
- [x] 4.3 `openspec validate --all --strict --no-interactive` и `npm test`
