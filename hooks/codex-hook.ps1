[CmdletBinding()]
param([Parameter(Mandatory)][ValidateSet('SessionStart','Stop')][string]$Event,[string]$RootPath=(Split-Path -Parent $PSScriptRoot),[Parameter(ValueFromPipeline=$true)][string]$InputObject)

Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath $RootPath).Path
$raw=if($InputObject){$InputObject}else{[Console]::In.ReadToEnd()};$payload=$null
if(-not[string]::IsNullOrWhiteSpace($raw)){try{$payload=$raw|ConvertFrom-Json}catch{$payload=$null}}
if($Event-eq'SessionStart'){
    $out=@(& (Join-Path $root 'hooks/repository-preflight.ps1') -RootPath $root -AsJson 2>&1);$code=$LASTEXITCODE
    $context="Read AGENTS.md, rules/INDEX.md, docs/README.md and docs/INDEX.md first. Repository preflight exit=${code}: $($out -join ' ')"
    [pscustomobject]@{hookSpecificOutput=[ordered]@{hookEventName='SessionStart';additionalContext=$context}}|ConvertTo-Json -Depth 5 -Compress
    exit 0
}
$payloadProperties=if($payload){@($payload.PSObject.Properties|ForEach-Object{$_.Name})}else{@()}
if($payload -and $payloadProperties -contains 'stop_hook_active' -and $payload.stop_hook_active){'{}';exit 0}
$validation=@(& (Join-Path $root 'hooks/validate-project.ps1') -RootPath $root -Check 2>&1);$code=$LASTEXITCODE
if($code-eq0){'{}';exit 0}
[pscustomobject]@{decision='block';reason="Project validation is not complete (exit $code). Fix or record the reported state before stopping: $($validation -join ' ')"}|ConvertTo-Json -Compress
exit 0
