JAICP, CAILA, Conversational Cloud и связанные товарные знаки принадлежат Just AI. Этот репозиторий не является продуктом Just AI и не лицензирует JAICP.

В `vendor/specs/` лежат копии публичных OpenAPI Just AI / JAICP. Этот репозиторий их не пишет и не является источником API. MIT на эти файлы не распространяется.

Скачать заново (нужен PowerShell): `npm run sync-specs`.

Обзор API: https://help.cloud.just-ai.com/jaicp/api/

| id | Документация | YAML |
|----|--------------|------|
| bot-channel | https://app.jaicp.com/api/api-gateway/static/specs/bot-channel-api.html | https://app.jaicp.com/api/api-gateway/static/specs/bot-channel-api.yml |
| project | https://app.jaicp.com/api/api-gateway/static/specs/project-api.html | https://app.jaicp.com/api/api-gateway/static/specs/project-api.yml |
| reporter | https://app.jaicp.com/api/api-gateway/static/specs/reporter-api.html | https://app.jaicp.com/api/api-gateway/static/specs/reporter-api.yml |
| async | https://app.jaicp.com/api/api-gateway/static/specs/async-api.html | https://app.jaicp.com/api/api-gateway/static/specs/async-api.yml |
| text-campaign | https://app.jaicp.com/api/api-gateway/static/specs/text-campaign-api.html | https://app.jaicp.com/api/api-gateway/static/specs/text-campaign-api.yml |
| caila | https://app.jaicp.com/cailapub/static/openapi/direct-api-en.html | https://app.jaicp.com/cailapub/static/openapi/direct.yml |
| calls | https://app.jaicp.com/dialer/static/openapi/index.html | https://app.jaicp.com/dialer/static/openapi/calls.yml |

У Dialer `calls.yml` ссылается на `common.yml`: https://app.jaicp.com/dialer/static/openapi/common.yml
