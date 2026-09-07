# NOTICE

## Русский

JAICP, CAILA, Conversational Cloud и связанные товарные знаки принадлежат Just AI.
Tovie AI Platform, Tovie Cloud и связанные товарные знаки принадлежат Tovie AI / TOVIE AI LIMITED.

Этот репозиторий — неофициальный клиент к публичным HTTP API. Он не является продуктом Just AI или Tovie AI и не лицензирует JAICP или Tovie Platform.

Код в `src/` и `scripts/` распространяется по MIT (см. `LICENSE`).

В `vendor/specs/` лежат копии публичных OpenAPI. Этот репозиторий их не пишет и не является источником API. MIT на эти файлы не распространяется.

Копии совпадают с официальными файлами обоих облаков (проверено побайтно):

| id | JAICP | Tovie Platform |
|----|-------|----------------|
| bot-channel | https://app.jaicp.com/api/api-gateway/static/specs/bot-channel-api.yml | https://platform.tovie.ai/api/api-gateway/static/specs/bot-channel-api.yml |
| project | https://app.jaicp.com/api/api-gateway/static/specs/project-api.yml | https://platform.tovie.ai/api/api-gateway/static/specs/project-api.yml |
| reporter | https://app.jaicp.com/api/api-gateway/static/specs/reporter-api.yml | https://platform.tovie.ai/api/api-gateway/static/specs/reporter-api.yml |
| async | https://app.jaicp.com/api/api-gateway/static/specs/async-api.yml | https://platform.tovie.ai/api/api-gateway/static/specs/async-api.yml |
| text-campaign | https://app.jaicp.com/api/api-gateway/static/specs/text-campaign-api.yml | https://platform.tovie.ai/api/api-gateway/static/specs/text-campaign-api.yml |
| caila | https://app.jaicp.com/cailapub/static/openapi/direct.yml | https://platform.tovie.ai/cailapub/static/openapi/direct.yml |
| calls | https://app.jaicp.com/dialer/static/openapi/calls.yml | https://platform.tovie.ai/dialer/static/openapi/calls.yml |
| common | https://app.jaicp.com/dialer/static/openapi/common.yml | https://platform.tovie.ai/dialer/static/openapi/common.yml |

Обзор API: https://help.cloud.just-ai.com/jaicp/api/ · https://help.cloud.tovie.ai/platform/api/

Скачать копии с JAICP: `npm run sync-specs`. Сверить оба облака: `npm run check-specs`.

## English

JAICP, CAILA, Conversational Cloud, and related marks belong to Just AI.
Tovie AI Platform, Tovie Cloud, and related marks belong to Tovie AI / TOVIE AI LIMITED.

This repository is an unofficial client for the public HTTP APIs. It is not a Just AI or Tovie AI product and does not license JAICP or Tovie Platform.

Code in `src/` and `scripts/` is MIT-licensed (see `LICENSE`).

`vendor/specs/` contains copies of public OpenAPI documents. This repository does not author them and is not the API source. MIT does not apply to those files.

The copies match the official files of both clouds (verified byte-for-byte). Sources are listed in the table above.

API overviews: https://help.cloud.just-ai.com/jaicp/api/ · https://help.cloud.tovie.ai/platform/api/

Refresh JAICP copies with `npm run sync-specs`. Compare both clouds with `npm run check-specs`.
