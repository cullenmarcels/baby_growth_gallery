[CmdletBinding()]
param(
    [string]$RootPath = (Split-Path -Parent $PSScriptRoot),
    [switch]$Check,
    [switch]$Remote,
    [switch]$AsJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root=(Resolve-Path -LiteralPath $RootPath).Path
. (Join-Path $PSScriptRoot 'project-library.ps1')
$failures=[System.Collections.Generic.List[string]]::new();$unavailable=[System.Collections.Generic.List[string]]::new()
function Run-Check([string]$Name,[scriptblock]$Action){
    try{$out=@(& $Action 2>&1);$code=$LASTEXITCODE;if($code -eq 2){$unavailable.Add("$Name`: $($out -join ' ')")}elseif($code -ne 0){$failures.Add("$Name`: $($out -join ' ')")}}
    catch{$unavailable.Add("$Name`: $($_.Exception.Message)")}
}
Run-Check 'rules' { & (Join-Path $root 'hooks/validate-rules.ps1') -RootPath $root }
Run-Check 'indexes' { & (Join-Path $root 'hooks/update-indexes.ps1') -RootPath $root -Check }
$preflightArgs=@{RootPath=$root;AsJson=$true};if($Remote){$preflightArgs.Remote=$true}
$preflightText=@(& (Join-Path $root 'hooks/repository-preflight.ps1') @preflightArgs 2>&1);$preflightCode=$LASTEXITCODE
try{$preflight=($preflightText -join "`n")|ConvertFrom-Json}catch{$preflight=$null;$unavailable.Add('preflight emitted invalid JSON')}
if($preflightCode -eq 2){$unavailable.Add("preflight: $($preflightText -join ' ')")}elseif($preflightCode -ne 0){$failures.Add("preflight blockers: $($preflight.blocking_reasons -join ', ')")}

foreach($required in @('.gitattributes','.gitignore','.codex/hooks.json')){if(-not(Test-Path (Join-Path $root $required))){$failures.Add("Missing required file: $required")}}
$hookPath=Join-Path $root '.codex/hooks.json'
if(Test-Path $hookPath){try{$hooks=[IO.File]::ReadAllText($hookPath,[Text.Encoding]::UTF8)|ConvertFrom-Json;if(-not$hooks.hooks.SessionStart-or-not$hooks.hooks.Stop){$failures.Add('Codex hooks must define SessionStart and Stop')};$hookText=[IO.File]::ReadAllText($hookPath,[Text.Encoding]::UTF8);if($hookText-notmatch'rev-parse --show-toplevel'){$failures.Add('Codex hooks do not resolve the Git root')}}catch{$failures.Add("Invalid Codex hooks JSON: $($_.Exception.Message)")}}

if($preflight -and $preflight.repository_mode -ne 'non_git'){
    $gitRoot=@(& git -C $root rev-parse --show-toplevel 2>$null)[0]
    $protected=@()
    foreach($manifestRel in @('rules/archive/MANIFEST.sha256','docs/ARCHIVE.sha256')){
        $manifest=Join-Path $gitRoot $manifestRel
        if(Test-Path $manifest){foreach($line in Get-Content $manifest){if($line-match'^[A-F0-9]{64}\s{2}(.+)$'){$base=if($manifestRel.StartsWith('rules')){'rules/archive'}else{'docs'};$protected += "$base/$($Matches[1])"}}}
    }
    foreach($path in @($protected|Sort-Object -Unique)){
        $status=@(& git -C $gitRoot status --porcelain=v1 -- $path);if($status){$failures.Add("Protected archive has uncommitted change: $path")}
        if($preflight.integration_target){
            & git -C $gitRoot cat-file -e "$($preflight.integration_target):$path" 2>$null
            if($LASTEXITCODE -eq 0){$diff=@(& git -C $gitRoot diff --name-only $preflight.integration_target HEAD -- $path);if($diff){$failures.Add("Protected archive differs from integration baseline: $path")}}
        }
    }
    foreach($stateFile in @(Get-ChildItem (Join-Path $gitRoot 'docs/plans') -File -Filter 'state.md' -Recurse -ErrorAction SilentlyContinue)){
        $state=Get-ProjectFrontMatter $stateFile.FullName;$owned=@(ConvertFrom-InlineList $state.owned_paths)
        $digestVersion=if($state.ContainsKey('scope_digest_version')){[int]$state.scope_digest_version}else{1}
        foreach($pair in @(@('reviewed_commit','reviewed_scope_digest'),@('accepted_commit','accepted_scope_digest'),@('integrated_commit','integrated_scope_digest'))){
            $commit=$state[$pair[0]];$digest=$state[$pair[1]]
            if($commit -and $commit-ne'null'){
                if($commit-notmatch'^[A-Fa-f0-9]{40}$'){$failures.Add("Invalid full commit in $($state.plan_id): $($pair[0])");continue}
                try{$actual=Get-GitScopeDigest $gitRoot $commit $owned -Version $digestVersion;if($digest-ne$actual){$failures.Add("Scope digest mismatch in $($state.plan_id): $($pair[1])")}}catch{$failures.Add("Cannot verify scope digest in $($state.plan_id): $($_.Exception.Message)")}
            }
        }
        if($state.status-in@('integration_review','archived') -and $state.accepted_scope_digest-ne$state.integrated_scope_digest){$failures.Add("Acceptance is invalidated by integrated scope in $($state.plan_id)")}
        if($state.integrated_commit-ne'null' -and $state.integration_target-ne'null'){
            & git -C $gitRoot merge-base --is-ancestor $state.integrated_commit $state.integration_target 2>$null
            if($LASTEXITCODE-ne0){$failures.Add("Integrated commit is not on target branch in $($state.plan_id)")}
        }
    }
}

$exit=if($unavailable.Count){2}elseif($failures.Count){1}else{0}
$result=[ordered]@{status=if($exit -eq 0){'passed'}elseif($exit -eq 1){'failed'}else{'unavailable'};exit_code=$exit;repository=$preflight;failures=@($failures);unavailable=@($unavailable)}
if($AsJson){[pscustomobject]$result|ConvertTo-Json -Depth 8}else{"PROJECT_VALIDATION=$($result.status.ToUpperInvariant())";if($preflight){"REPOSITORY_MODE=$($preflight.repository_mode)"};$failures|ForEach-Object{"ERROR: $_"};$unavailable|ForEach-Object{"UNAVAILABLE: $_"}}
exit $exit
