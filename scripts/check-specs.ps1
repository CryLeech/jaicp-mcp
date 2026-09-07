$ErrorActionPreference = "Stop"
$dest = Join-Path $PSScriptRoot "..\vendor\specs"

$sources = @(
  @{ Name = "JAICP"; Host = "https://app.jaicp.com" },
  @{ Name = "Tovie"; Host = "https://platform.tovie.ai" }
)

$files = [ordered]@{
  "bot-channel-api.yml" = "/api/api-gateway/static/specs/bot-channel-api.yml"
  "project-api.yml" = "/api/api-gateway/static/specs/project-api.yml"
  "reporter-api.yml" = "/api/api-gateway/static/specs/reporter-api.yml"
  "async-api.yml" = "/api/api-gateway/static/specs/async-api.yml"
  "text-campaign-api.yml" = "/api/api-gateway/static/specs/text-campaign-api.yml"
  "direct.yml" = "/cailapub/static/openapi/direct.yml"
  "calls.yml" = "/dialer/static/openapi/calls.yml"
  "common.yml" = "/dialer/static/openapi/common.yml"
}

Add-Type -AssemblyName System.Net.Http
$handler = New-Object System.Net.Http.HttpClientHandler
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromSeconds(20)
$client.DefaultRequestHeaders.UserAgent.ParseAdd("jaicp-mcp-check-specs")
$sha = [System.Security.Cryptography.SHA256]::Create()
$failed = $false

function Get-Hash([byte[]]$bytes) {
  ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "")
}

foreach ($source in $sources) {
  $hostReachable = $true
  foreach ($name in $files.Keys) {
    $localPath = Join-Path $dest $name
    $localBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $localPath))
    if (-not $hostReachable) {
      "{0,-6} {1,-22} {2}" -f $source.Name, $name, "SKIPPED"
      continue
    }
    $url = $source.Host + $files[$name]
    try {
      $remoteBytes = $client.GetByteArrayAsync($url).GetAwaiter().GetResult()
      $match = (Get-Hash $localBytes) -eq (Get-Hash $remoteBytes)
      $status = if ($match) { "OK" } else { "DRIFT" }
      if (-not $match) { $failed = $true }
    } catch {
      $status = "FETCH-FAIL"
      $failed = $true
      $hostReachable = $false
    }
    "{0,-6} {1,-22} {2}" -f $source.Name, $name, $status
  }
}

$sha.Dispose()
$client.Dispose()
if ($failed) { throw "Official OpenAPI copies drifted from vendor/specs or a source was unreachable" }
