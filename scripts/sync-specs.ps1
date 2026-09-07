$ErrorActionPreference = "Stop"
$dest = Join-Path $PSScriptRoot "..\vendor\specs"
New-Item -ItemType Directory -Path $dest -Force | Out-Null

$files = @{
  "bot-channel-api.yml" = "https://app.jaicp.com/api/api-gateway/static/specs/bot-channel-api.yml"
  "project-api.yml" = "https://app.jaicp.com/api/api-gateway/static/specs/project-api.yml"
  "reporter-api.yml" = "https://app.jaicp.com/api/api-gateway/static/specs/reporter-api.yml"
  "async-api.yml" = "https://app.jaicp.com/api/api-gateway/static/specs/async-api.yml"
  "text-campaign-api.yml" = "https://app.jaicp.com/api/api-gateway/static/specs/text-campaign-api.yml"
  "direct.yml" = "https://app.jaicp.com/cailapub/static/openapi/direct.yml"
  "calls.yml" = "https://app.jaicp.com/dialer/static/openapi/calls.yml"
  "common.yml" = "https://app.jaicp.com/dialer/static/openapi/common.yml"
}

foreach ($name in $files.Keys) {
  $out = Join-Path $dest $name
  Invoke-WebRequest -Uri $files[$name] -OutFile $out -UseBasicParsing
  Write-Host "$name $((Get-Item $out).Length)"
}
