[CmdletBinding()]
param([string]$RootPath = (Split-Path -Parent $PSScriptRoot))

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'project-library.ps1')
$errors = [System.Collections.Generic.List[string]]::new()
function Fail([string]$Message) { $errors.Add($Message) }
function Need([string]$Path) { if (-not (Test-Path -LiteralPath $Path)) { Fail "Missing required path: $Path" } }

$root=(Resolve-Path -LiteralPath $RootPath).Path
$rulesRoot=Join-Path $root 'rules'; $docsRoot=Join-Path $root 'docs'
$stageNames=@('exploration','planning','development','review','regression','acceptance')
$moduleNames=@('source-and-evidence','repository-safety','responsive-ui','implementation-quality','testing-quality','security-and-privacy','git-collaboration')
$required=@('AGENTS.md','rules/README.md','rules/INDEX.md','rules/archive/INDEX.md','rules/archive/MANIFEST.sha256','docs/README.md','docs/INDEX.md','docs/ARCHIVE.sha256')
$required += @($stageNames | ForEach-Object { "rules/stages/$_.md" })
$required += @($moduleNames | ForEach-Object { "rules/modules/$_.md" })
foreach($relative in $required){Need (Join-Path $root $relative)}

$agents=Join-Path $root 'AGENTS.md'
if((Test-Path $agents) -and @(Get-Content $agents).Count -gt 100){Fail "AGENTS.md exceeds 100 lines"}

$formalText=@()
foreach($base in @($rulesRoot,$docsRoot)){if(Test-Path $base){$formalText += Get-ChildItem $base -File -Recurse | Where-Object Extension -in @('.md','.yaml','.yml','.json','.sha256')}}
foreach($file in $formalText){try{[void](Get-NormalizedUtf8Bytes $file.FullName)}catch{Fail "Formal text is not valid UTF-8: $($file.FullName)"}}

$rulesets=@{}; $globalRules=@{}; $currentFiles=@()
$currentFiles += Get-ChildItem (Join-Path $rulesRoot 'stages') -File -Filter '*.md'
$currentFiles += Get-ChildItem (Join-Path $rulesRoot 'modules') -File -Filter '*.md'
$requiredMeta=@('ruleset_id','title','version','status','health','scope','stages','effective_at','updated_at','source_refs','related_plan_ids','related_achievement_ids','supersedes_version')
foreach($file in $currentFiles){
    $m=Get-ProjectFrontMatter $file.FullName
    foreach($field in $requiredMeta){if(-not $m.ContainsKey($field) -or [string]::IsNullOrWhiteSpace($m[$field])){Fail "Missing Ruleset field '$field': $($file.FullName)"}}
    if(-not $m.ruleset_id){continue}
    if($rulesets.ContainsKey($m.ruleset_id)){Fail "Duplicate Ruleset ID '$($m.ruleset_id)'";continue}
    $set=[ordered]@{Path=$file.FullName;Version=$m.version;Rules=[System.Collections.Generic.HashSet[string]]::new()};$rulesets[$m.ruleset_id]=$set
    if($m.version -notmatch '^\d+$' -or [int]$m.version -lt 1){Fail "Invalid Ruleset version: $($file.FullName)"}
    if($m.status -ne 'active'){Fail "Current Ruleset must be active: $($file.FullName)"}
    if($m.health -notin @('healthy','review_due','conflict','unverifiable')){Fail "Invalid Ruleset health: $($file.FullName)"}
    if($file.Directory.Name -eq 'stages' -and @(Get-Content $file.FullName).Count -gt 80){Fail "Stage menu exceeds 80 lines: $($file.FullName)"}
    $index=[IO.File]::ReadAllText((Join-Path $rulesRoot 'INDEX.md'))
    if(-not $index.Contains("| ``$($m.ruleset_id)`` | ``$($m.version)`` |")){Fail "Rules Index does not register current version for '$($m.ruleset_id)'"}
    if($file.Directory.Name -ne 'modules'){continue}
    $text=[IO.File]::ReadAllText($file.FullName)
    $matches=[regex]::Matches($text,'(?m)^##\s+([A-Z]+-\d{3})\s+\u2014')
    foreach($match in $matches){
        $id=$match.Groups[1].Value
        if($globalRules.ContainsKey($id)){Fail "Duplicate Rule ID '$id'"}else{$globalRules[$id]=$file.FullName}
        [void]$set.Rules.Add($id)
        $start=$match.Index;$next=$text.IndexOf("`n## ",$start+4);if($next -lt 0){$next=$text.Length};$block=$text.Substring($start,$next-$start)
        foreach($field in @('Level','Status','Stages','Applies to','Trigger','Requirement','Verification modes','Verification','Exceptions','Source')){if($block -notmatch "(?m)^- $([regex]::Escape($field)):\s*.+$"){Fail "Rule '$id' missing '$field'"}}
        if($block -match '(?m)^- Level:\s*`MUST`' -and $block -notmatch '(?m)^- Verification modes:\s*`(automatic|review|regression|human)`'){Fail "MUST Rule '$id' lacks verification mode"}
    }
}

function Get-RulesetVersion([string]$Id,[string]$Version){
    if($rulesets.ContainsKey($Id) -and $rulesets[$Id].Version -eq $Version){return $rulesets[$Id]}
    $archive=Get-ChildItem (Join-Path $rulesRoot "archive/$Id") -File -Filter '*.md' -ErrorAction SilentlyContinue | Where-Object {(Get-ProjectFrontMatter $_.FullName).version -eq $Version} | Select-Object -First 1
    if(-not $archive){return $null}
    $set=[ordered]@{Path=$archive.FullName;Version=$Version;Rules=[System.Collections.Generic.HashSet[string]]::new()}
    foreach($m in [regex]::Matches([IO.File]::ReadAllText($archive.FullName),'(?m)^##\s+([A-Z]+-\d{3})\s+\u2014')){[void]$set.Rules.Add($m.Groups[1].Value)}
    return $set
}

$allIds=@{}
foreach($file in @(Get-ChildItem $docsRoot -File -Recurse -Filter '*.md')){
    $m=Get-ProjectFrontMatter $file.FullName
    if($m.ContainsKey('id') -and $m['id']){if($allIds.ContainsKey($m['id'])){Fail "Duplicate document ID '$($m['id'])'"}else{$allIds[$m['id']]=$file.FullName}}
    $text=[IO.File]::ReadAllText($file.FullName)
    foreach($link in [regex]::Matches($text,'\[[^\]]*\]\(([^)#]+)(?:#[^)]*)?\)')){
        $target=$link.Groups[1].Value;if($target -match '^[A-Za-z][A-Za-z0-9+.-]*:'){continue}
        if(-not(Test-Path -LiteralPath (Join-Path $file.DirectoryName $target))){Fail "Broken Markdown link in $($file.FullName): $target"}
    }
}
foreach($file in @(Get-ChildItem $rulesRoot -File -Recurse -Filter '*.md' | Where-Object { $_.FullName -notlike (Join-Path $rulesRoot 'archive\*') })){
    $text=[IO.File]::ReadAllText($file.FullName)
    foreach($link in [regex]::Matches($text,'\[[^\]]*\]\(([^)#]+)(?:#[^)]*)?\)')){$target=$link.Groups[1].Value;if($target -match '^[A-Za-z][A-Za-z0-9+.-]*:'){continue};if(-not(Test-Path -LiteralPath (Join-Path $file.DirectoryName $target))){Fail "Broken Markdown link in $($file.FullName): $target"}}
}

$allowedLegacy=@('PLAN-20260904-001','PLAN-20260907-001','PLAN-20260908-001')
$allowedLegacyDocs=@('PLAN-20260904-001','PLAN-20260907-001','PLAN-20260908-001','ACH-20260904-001','ACH-20260907-001','ACH-20260908-001')
foreach($docId in $allIds.Keys){
    $baseId=$docId -replace '-(STATE|EXEC|REVIEW|REGRESSION|ACCEPTANCE)$',''
    if($baseId -notmatch '^(DES|SPEC|PLAN|ACH)-\d{8}-([0-9A-HJKMNP-TV-Z]{8}|\d{3})$'){Fail "Invalid document ID '$docId'";continue}
    if($baseId -match '^(DES|SPEC|PLAN|ACH)-\d{8}-\d{3}$' -and $baseId -notin $allowedLegacyDocs){Fail "New legacy document ID is forbidden: $baseId"}
}
foreach($file in @(Get-ChildItem (Join-Path $docsRoot 'achievements') -File -Filter '*.md')){$m=Get-ProjectFrontMatter $file.FullName;if($m.id -and $m.plan_id -and $m.id -ne $m.plan_id.Replace('PLAN-','ACH-')){Fail "Achievement ID does not inherit Plan suffix: $($m.id)"}}
$modernStates=@()
foreach($dir in @(Get-ChildItem (Join-Path $docsRoot 'plans') -Directory)){
    $planPath=Join-Path $dir.FullName 'plan.md';Need $planPath;if(-not(Test-Path $planPath)){continue}
    $pm=Get-ProjectFrontMatter $planPath;$id=$pm.id
    if($dir.Name -ne $id){Fail "Plan directory and ID differ: $($dir.Name)"}
    $legacy=$id -match '^PLAN-\d{8}-\d{3}$';$modern=$id -match '^PLAN-\d{8}-[0-9A-HJKMNP-TV-Z]{8}$'
    if(-not $legacy -and -not $modern){Fail "Invalid Plan ID '$id'"}
    if($legacy -and $id -notin $allowedLegacy){Fail "New legacy Plan ID is forbidden: $id"}
    $status=$pm.status
    if($modern){
        foreach($name in @('state.md','execution-log.md','review-report.md','regression-report.md','acceptance-record.md')){Need (Join-Path $dir.FullName $name)}
        $statePath=Join-Path $dir.FullName 'state.md';if(-not(Test-Path $statePath)){continue};$state=Get-ProjectFrontMatter $statePath;$status=$state.status
        $modernStates += [pscustomobject]@{Id=$id;State=$state}
        if($pm.status -ne 'confirmed'){Fail "Modern plan.md status must remain confirmed: $id"}
        foreach($field in @('repository_mode','remote_name','integration_target','work_branch','base_commit','remote_freshness','working_tree_state','owned_paths','overlapping_plan_ids','reviewed_commit','reviewed_scope_digest','accepted_commit','accepted_scope_digest','integrated_commit','integrated_scope_digest')){if(-not $state.ContainsKey($field)){Fail "State '$id' missing '$field'"}}
        if($state.repository_mode -in @('git_local','git_remote') -and ($state.base_commit -eq 'null' -or $state.work_branch -eq 'null')){Fail "Git Plan lacks base commit or branch: $id"}
        if($state.repository_mode -eq 'git_remote' -and $state.integration_target -eq 'null'){Fail "Remote Git Plan lacks integration target: $id"}
        if($state.repository_mode -in @('git_local','git_remote') -and $status -in @('in_regression','acceptance_pending','integration_pending','integration_review','archived') -and ($state.reviewed_commit -eq 'null' -or $state.reviewed_scope_digest -eq 'null')){Fail "Git Plan lacks reviewed commit evidence: $id"}
        if($status -in @('integration_pending','integration_review','archived') -and ($state.accepted_commit -eq 'null' -or $state.accepted_scope_digest -eq 'null')){Fail "Integrated lifecycle lacks acceptance evidence: $id"}
        if($status -eq 'archived' -and $state.repository_mode -eq 'git_remote' -and ($state.integrated_commit -eq 'null' -or $state.integrated_scope_digest -eq 'null')){Fail "Remote Git Plan archived without integrated evidence: $id"}
        if($status -in @('integration_review','archived') -and $state.repository_mode -eq 'git_remote' -and $state.accepted_scope_digest -ne $state.integrated_scope_digest){Fail "Remote Git Plan has invalidated acceptance: $id"}
    }
    if($status -notin @('confirmed','in_progress','in_review','in_regression','acceptance_pending','integration_pending','integration_review','blocked','superseded','cancelled','archived')){Fail "Invalid Plan status '$status': $id"}
    $planText=[IO.File]::ReadAllText($planPath)
    $expected=[System.Collections.Generic.HashSet[string]]::new()
    foreach($ref in [regex]::Matches($planText,'(?ms)^\s*- ruleset_id:\s*([A-Z0-9-]+)\s*\r?\n\s*version:\s*(\d+)\s*\r?\n\s*rule_ids:\s*\[([^\]]*)\]')){
        $set=Get-RulesetVersion $ref.Groups[1].Value $ref.Groups[2].Value
        if(-not $set){Fail "Plan '$id' references missing Ruleset/version $($ref.Groups[1].Value) v$($ref.Groups[2].Value)";continue}
        foreach($rid in $ref.Groups[3].Value.Split(',')|ForEach-Object{$_.Trim()}|Where-Object{$_}){[void]$expected.Add($rid);if(-not $set.Rules.Contains($rid)){Fail "Plan '$id' references missing Rule '$rid'"}}
    }
    $review=Join-Path $dir.FullName 'review-report.md';$reg=Join-Path $dir.FullName 'regression-report.md'
    if($id -ne 'PLAN-20260904-001'){Need $reg}
    if($status -in @('acceptance_pending','integration_pending','integration_review','archived')){
        Need $review; if(Test-Path $review){$rm=Get-ProjectFrontMatter $review;if($rm.status -ne 'passed'){Fail "Plan '$id' reached acceptance without passed Review"};$rt=[IO.File]::ReadAllText($review);foreach($rid in $expected){if($rt -notmatch "(?m)^\|\s*``?$([regex]::Escape($rid))``?\s*\|"){Fail "Review for '$id' omits Rule '$rid'"}}}
        if($id -ne 'PLAN-20260904-001'){if(Test-Path $reg){$gm=Get-ProjectFrontMatter $reg;if($gm.status -notin @('passed','not_applicable')){Fail "Plan '$id' reached acceptance with invalid Regression"}}}
    }
    if($modern -and $status -in @('integration_pending','integration_review','archived')){$accept=Get-ProjectFrontMatter (Join-Path $dir.FullName 'acceptance-record.md');if(-not$accept.ContainsKey('acceptance_status') -or $accept.acceptance_status -ne 'confirmed'){Fail "Plan '$id' lacks confirmed acceptance record"}}
    if(Test-Path $reg){$gm=Get-ProjectFrontMatter $reg;if($gm.ContainsKey('ci_status') -and $gm.ci_status -eq 'failed'){Fail "Plan '$id' has failed CI"}}
    $ach=@(Get-ChildItem (Join-Path $docsRoot 'achievements') -File -Filter ($id.Replace('PLAN-','ACH-')+'-*.md'))
    if($status -eq 'archived' -and $ach.Count -ne 1){Fail "Archived Plan '$id' must have exactly one Achievement"}
    if($status -ne 'archived' -and $ach.Count -ne 0){Fail "Non-archived Plan '$id' has an Achievement"}
}

for($i=0;$i -lt $modernStates.Count;$i++){for($j=$i+1;$j -lt $modernStates.Count;$j++){
    $a=$modernStates[$i];$b=$modernStates[$j]
    if($a.State.status -in @('archived','cancelled','superseded') -or $b.State.status -in @('archived','cancelled','superseded')){continue}
    $hit=$false;foreach($left in (ConvertFrom-InlineList $a.State.owned_paths)){foreach($right in (ConvertFrom-InlineList $b.State.owned_paths)){if(Test-ProjectPathOverlap $left $right){$hit=$true}}}
    if($hit){$aLinks=ConvertFrom-InlineList $a.State.overlapping_plan_ids;$bLinks=ConvertFrom-InlineList $b.State.overlapping_plan_ids;if($a.Id -notin $bLinks -and $b.Id -notin $aLinks){Fail "Active Plan owned_paths overlap without coordination: $($a.Id), $($b.Id)"}}
}}

function Test-Manifest([string]$Manifest,[string]$Base,[string]$Exclude){
    $entries=@{}
    foreach($line in @(Get-Content $Manifest)){if([string]::IsNullOrWhiteSpace($line)-or$line.TrimStart().StartsWith('#')){continue};if($line -notmatch '^([A-F0-9]{64})\s{2}(.+)$'){Fail "Malformed archive manifest line: $line";continue};$entries[$Matches[2]]=$Matches[1]}
    foreach($relative in $entries.Keys){$target=Join-Path $Base $relative;if(-not(Test-Path $target)){Fail "Manifest references missing file: $relative"}elseif((Get-NormalizedSha256 $target)-ne$entries[$relative]){Fail "Archive hash mismatch: $relative"}}
    if($Exclude -eq 'rules'){foreach($file in @(Get-ChildItem $Base -File -Filter '*.md' -Recurse|Where-Object{$_.Name-ne'INDEX.md'})){ $rel=ConvertTo-ProjectRelativePath $Base $file.FullName;if(-not$entries.ContainsKey($rel)){Fail "Archive file missing from manifest: $rel"} }}
    if($Exclude -eq 'docs'){
        $files=@(Get-ChildItem (Join-Path $Base 'achievements') -File -Filter '*.md')
        foreach($dir in @(Get-ChildItem (Join-Path $Base 'plans') -Directory)){$plan=Join-Path $dir.FullName 'plan.md';if(Test-Path $plan){$m=Get-ProjectFrontMatter $plan;$state=Join-Path $dir.FullName 'state.md';$status=if(Test-Path $state){(Get-ProjectFrontMatter $state).status}else{$m.status};if($status-eq'archived'){$files+=Get-ChildItem $dir.FullName -File}}}
        foreach($file in $files){$rel=ConvertTo-ProjectRelativePath $Base $file.FullName;if(-not $entries.ContainsKey($rel)){Fail "Archived docs file missing from manifest: $rel"}}
    }
}
Test-Manifest (Join-Path $rulesRoot 'archive/MANIFEST.sha256') (Join-Path $rulesRoot 'archive') 'rules'
Test-Manifest (Join-Path $docsRoot 'ARCHIVE.sha256') $docsRoot 'docs'

if($errors.Count){'RULES_VALIDATION=FAILED';"ERROR_COUNT=$($errors.Count)";$errors|ForEach-Object{"ERROR: $_"};exit 1}
'RULES_VALIDATION=PASSED';"RULESET_COUNT=$($rulesets.Count)";"RULE_COUNT=$($globalRules.Count)";"MARKDOWN_FILE_COUNT=$(@($formalText|Where-Object Extension -eq '.md').Count)";"ARCHIVE_FILE_COUNT=$(@(Get-ChildItem (Join-Path $rulesRoot 'archive') -File -Filter '*.md' -Recurse|Where-Object{$_.Name-ne'INDEX.md'}).Count)";"AGENTS_LINE_COUNT=$(@(Get-Content $agents).Count)";exit 0
