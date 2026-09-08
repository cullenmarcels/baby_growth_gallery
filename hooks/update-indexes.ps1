[CmdletBinding()]
param(
    [string]$RootPath = (Split-Path -Parent $PSScriptRoot),
    [switch]$Write,
    [switch]$Check
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'project-library.ps1')
if (-not $Write -and -not $Check) { $Check = $true }
$root = (Resolve-Path -LiteralPath $RootPath).Path
$utf8 = New-Object Text.UTF8Encoding($false)
$errors = [System.Collections.Generic.List[string]]::new()

function Format-NullValue { param($Value) if ([string]::IsNullOrWhiteSpace([string]$Value) -or $Value -eq 'null') { '-' } else { [string]$Value } }
function Replace-Block {
    param([string]$Path, [string]$Name, [string[]]$Lines)
    $text = [IO.File]::ReadAllText($Path, [Text.Encoding]::UTF8)
    $begin = "<!-- GENERATED:BEGIN $Name -->"; $end = "<!-- GENERATED:END $Name -->"
    $replacement = $begin + "`n" + ($Lines -join "`n") + "`n" + $end
    $pattern = [regex]::Escape($begin) + '.*?' + [regex]::Escape($end)
    if (-not [regex]::IsMatch($text, $pattern, [Text.RegularExpressions.RegexOptions]::Singleline)) { throw "Missing generated block $Name in $Path" }
    $expected = [regex]::Replace($text, $pattern, $replacement, [Text.RegularExpressions.RegexOptions]::Singleline).Replace("`r`n","`n").Replace("`r","`n")
    $actual = $text.Replace("`r`n","`n").Replace("`r","`n")
    if ($Write) { if ($expected -ne $actual) { [IO.File]::WriteAllText($Path, $expected, $utf8) } }
    elseif ($expected -ne $actual) { $errors.Add("Generated block is stale: $Name") }
}

$rulesIndex = Join-Path $root 'rules/INDEX.md'
$stageOrder = @('exploration','planning','development','review','regression','acceptance')
$stageActions = @('Inspect facts and repository mode','Define requirements, baseline, scope and implementation','Modify files within owned_paths','Review the committed candidate','Validate candidate and integrated revisions','Record acceptance, integration and archive')
$stageOutputs = @('Plan evidence and preflight','Frozen plan.md and state.md','state.md and execution-log.md','review-report.md','regression-report.md','acceptance-record.md / Achievement')
$stageRows = @()
for ($i=0; $i -lt $stageOrder.Count; $i++) {
    $name=$stageOrder[$i]; $path=Join-Path $root "rules/stages/$name.md"; $m=Get-ProjectFrontMatter $path
    $label=(Get-Culture).TextInfo.ToTitleCase($name)
    $stageRows += "| ``$($m.ruleset_id)`` | ``$($m.version)`` | $($stageActions[$i]) | [$label](./stages/$name.md) | AGENTS, Docs/Rules Index, preflight | ``$($stageOutputs[$i])`` |"
}
Replace-Block $rulesIndex 'STAGES' $stageRows

$moduleRows = @()
foreach ($file in @(Get-ChildItem (Join-Path $root 'rules/modules') -File -Filter '*.md' | Sort-Object Name)) {
    $m=Get-ProjectFrontMatter $file.FullName
    $stages=((ConvertFrom-InlineList $m.stages) -join ', ')
    $plans=@(ConvertFrom-InlineList $m.related_plan_ids);$lastPlan=if($plans.Count){$plans[-1]}else{'-'}
    $moduleRows += "| ``$($m.ruleset_id)`` | ``$($m.version)`` | [$($file.Name)](./modules/$($file.Name)) | $stages | ``$($m.status)`` | ``$($m.health)`` | ``$lastPlan`` |"
}
Replace-Block $rulesIndex 'MODULES' $moduleRows

$docsIndex = Join-Path $root 'docs/INDEX.md'
$sourceRows=@();$sourceEntries=@()
$designRoot=Join-Path $root 'docs/designs';if(Test-Path $designRoot){foreach($file in Get-ChildItem $designRoot -File -Filter 'design.md' -Recurse){$m=Get-ProjectFrontMatter $file.FullName;$sourceEntries += [pscustomobject]@{File=$file;Meta=$m;Created=$m.created_at;TypeOrder=0;Id=$m.id}}}
$specRoot=Join-Path $root 'docs/specs';if(Test-Path $specRoot){foreach($file in Get-ChildItem $specRoot -File -Filter '*.md' -Recurse){$m=Get-ProjectFrontMatter $file.FullName;$sourceEntries += [pscustomobject]@{File=$file;Meta=$m;Created=$m.created_at;TypeOrder=1;Id=$m.id}}}
foreach($entry in @($sourceEntries|Sort-Object Created,TypeOrder,Id)){$m=$entry.Meta;$relative=ConvertTo-ProjectRelativePath (Join-Path $root 'docs') $entry.File.FullName;$sourceRows += "| ``$($m.id)`` | ``$($m.type)`` | $($m.title) | ``$($m.status)`` | ``$($m.supersedes)`` | ``$($m.superseded_by)`` | [source](./$relative) |"}
if($sourceRows.Count-eq0){$sourceRows=@('| - | - | No registered Design or Spec | - | - | - | - |')}
Replace-Block $docsIndex 'DESIGNS_SPECS' $sourceRows

$planRows = @()
$planDirs = @(Get-ChildItem (Join-Path $root 'docs/plans') -Directory | ForEach-Object {
    $plan=Join-Path $_.FullName 'plan.md'; $m=Get-ProjectFrontMatter $plan
    [pscustomobject]@{ Dir=$_; Meta=$m; Created=$m.created_at; Id=$m.id }
} | Sort-Object @{Expression='Created';Descending=$true}, @{Expression='Id';Descending=$true})
foreach ($entry in $planDirs) {
    $m=$entry.Meta; $dir=$entry.Dir; $id=$m.id; $status=$m.status
    $statePath=Join-Path $dir.FullName 'state.md'; $state=$null
    if (Test-Path $statePath) { $state=Get-ProjectFrontMatter $statePath; $status=$state.status }
    $review=Join-Path $dir.FullName 'review-report.md'; $reviewStatus=if(Test-Path $review){(Get-ProjectFrontMatter $review).status}else{'missing'}
    $reg=Join-Path $dir.FullName 'regression-report.md'; $regExists=Test-Path $reg; $regStatus=if($regExists){(Get-ProjectFrontMatter $reg).status}else{'legacy_n/a'}
    $ach=@(Get-ChildItem (Join-Path $root 'docs/achievements') -File -Filter ($id.Replace('PLAN-','ACH-')+'-*.md'))
    $achCell=if($ach.Count -eq 1){"[$($id.Replace('PLAN-','ACH-'))](./achievements/$($ach[0].Name))"}else{'-'}
    $accept=if($ach.Count -eq 1){$a=Get-ProjectFrontMatter $ach[0].FullName; "confirmed $($a.confirmed_at)"}elseif($state -and $state.accepted_scope_digest -and $state.accepted_scope_digest -ne 'null'){'recorded'}else{'pending'}
    $repo=if($state){Format-NullValue $state.repository_mode}else{'legacy'}
    $base=if($state){Format-NullValue $state.base_commit}else{'-'}
    $candidate=if($state){Format-NullValue $state.reviewed_commit}else{'-'}
    $integrated=if($state){Format-NullValue $state.integrated_commit}else{'-'}
    $regCell=if($regExists){"[$regStatus](./plans/$id/regression-report.md)"}else{'legacy_n/a'}
    $planRows += "| [$id](./plans/$id/plan.md) | $($m.title) | ``$status`` | ``$repo`` | ``$base`` | ``$candidate`` | ``$integrated`` | [$reviewStatus](./plans/$id/review-report.md) | $regCell | $accept | $achCell |"
}
Replace-Block $docsIndex 'PLANS' $planRows

$achievementRows=@()
foreach($file in @(Get-ChildItem (Join-Path $root 'docs/achievements') -File -Filter '*.md' | ForEach-Object { $m=Get-ProjectFrontMatter $_.FullName; [pscustomobject]@{File=$_;Meta=$m} } | Sort-Object @{Expression={$_.Meta.created_at};Descending=$true}, @{Expression={$_.Meta.id};Descending=$true})) {
    $m=$file.Meta
    $achievementRows += "| ``$($m.id)`` | [$($m.plan_id)](./plans/$($m.plan_id)/plan.md) | $($m.title) | $($m.confirmed_at) | [archive](./achievements/$($file.File.Name)) |"
}
Replace-Block $docsIndex 'ACHIEVEMENTS' $achievementRows

if ($Check -and $errors.Count -gt 0) { 'INDEX_VALIDATION=FAILED'; $errors | ForEach-Object { "ERROR: $_" }; exit 1 }
'INDEX_VALIDATION=PASSED'
exit 0
