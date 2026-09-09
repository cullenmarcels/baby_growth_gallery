[CmdletBinding()]
param([string]$RootPath = (Split-Path -Parent $PSScriptRoot))

Set-StrictMode -Version Latest
$ErrorActionPreference='Continue'
$root=(Resolve-Path -LiteralPath $RootPath).Path
. (Join-Path $root 'hooks/project-library.ps1')
$failures=[System.Collections.Generic.List[string]]::new();$passed=0
function Assert-True([string]$Name,[bool]$Condition,[string]$Detail=''){if($Condition){$script:passed++;"PASS $Name"}else{$script:failures.Add("$Name $Detail")}}
function Run-Preflight([string]$Path,[string[]]$Owned=@(),[switch]$Remote,[string]$CurrentPlanId){$splat=@{RootPath=$Path;OwnedPaths=$Owned;AsJson=$true};if($Remote){$splat.Remote=$true};if($CurrentPlanId){$splat.CurrentPlanId=$CurrentPlanId};$out=@(& (Join-Path $root 'hooks/repository-preflight.ps1') @splat 2>&1);$code=$LASTEXITCODE;return @{Code=$code;Data=(($out-join"`n")|ConvertFrom-Json)}}
function Invoke-TestGit([string]$Path,[string[]]$CommandArgs){$out=@(& git -C $Path @CommandArgs 2>&1);if($LASTEXITCODE-ne0){throw "git failed: $($out-join' ')"};return $out}
function Init-Repo([string]$Path){New-Item -ItemType Directory -Path $Path|Out-Null;[void](Invoke-TestGit $Path @('init'));[void](Invoke-TestGit $Path @('config','user.email','test@example.invalid'));[void](Invoke-TestGit $Path @('config','user.name','Test User'));[IO.File]::WriteAllText((Join-Path $Path 'owned.txt'),"one`n",(New-Object Text.UTF8Encoding($false)));[void](Invoke-TestGit $Path @('add','.'));[void](Invoke-TestGit $Path @('commit','-m','initial'));[void](Invoke-TestGit $Path @('branch','-M','main'))}

$nonGit=Run-Preflight $root
Assert-True 'non_git_mode' ($nonGit.Code-eq0-and$nonGit.Data.repository_mode-eq'non_git')

$ids=@();1..32|ForEach-Object{$ids+=@(& (Join-Path $root 'hooks/new-document-id.ps1') -RootPath $root -Type PLAN)}
Assert-True 'new_id_format' ((@($ids|Where-Object{$_-notmatch'^PLAN-\d{8}-[0-9A-HJKMNP-TV-Z]{8}$'}).Count)-eq0)
Assert-True 'new_id_unique' ((@($ids|Sort-Object -Unique).Count)-eq32)
$derived=@(& (Join-Path $root 'hooks/new-document-id.ps1') -RootPath $root -PlanId $ids[0])
Assert-True 'achievement_id_derives_plan' ([bool]($derived[0] -eq ($ids[0].Replace('PLAN-','ACH-'))))

$tempBase=[IO.Path]::GetFullPath([IO.Path]::GetTempPath());$temp=Join-Path $tempBase ('baby-growth-collab-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory $temp|Out-Null
try{
    $lf=Join-Path $temp 'lf.md';$crlf=Join-Path $temp 'crlf.md';[IO.File]::WriteAllText($lf,"a`nb`n",(New-Object Text.UTF8Encoding($false)));[IO.File]::WriteAllText($crlf,"a`r`nb`r`n",(New-Object Text.UTF8Encoding($false)))
    Assert-True 'normalized_line_endings' ((Get-NormalizedSha256 $lf)-eq(Get-NormalizedSha256 $crlf))
    $collisionRoot=Join-Path $temp 'collision';$collisionDocs=Join-Path $collisionRoot 'docs';New-Item -ItemType Directory $collisionDocs -Force|Out-Null;$date=$ids[0].Split('-')[1];[IO.File]::WriteAllText((Join-Path $collisionDocs 'existing.md'),"id: PLAN-$date-01234567`n",(New-Object Text.UTF8Encoding($false)))
    $retried=@(& (Join-Path $root 'hooks/new-document-id.ps1') -RootPath $collisionRoot -Type PLAN -CandidateSuffixes @('01234567','89ABCDEF'))
    Assert-True 'new_id_retries_collision' ($retried[0]-eq"PLAN-$date-89ABCDEF")

    $repo=Join-Path $temp 'local';Init-Repo $repo
    $local=Run-Preflight $repo
    Assert-True 'git_local_clean' ($local.Code-eq0-and$local.Data.repository_mode-eq'git_local'-and$local.Data.working_tree_state-eq'clean')
    $stateDir=Join-Path $repo 'docs/plans/PLAN-20260908-01234567';New-Item -ItemType Directory -Path $stateDir -Force|Out-Null
    [IO.File]::WriteAllText((Join-Path $stateDir 'state.md'),"---`nid: PLAN-20260908-01234567-STATE`ntype: plan_state`nplan_id: PLAN-20260908-01234567`nstatus: in_progress`nowned_paths: [owned.txt]`n---`n",(New-Object Text.UTF8Encoding($false)))
    [void](Invoke-TestGit $repo @('add','.'));[void](Invoke-TestGit $repo @('commit','-m','active-plan'))
    $planOverlap=Run-Preflight $repo @('owned.txt/child')
    Assert-True 'active_plan_overlap_blocks' ($planOverlap.Code -eq 1 -and (@($planOverlap.Data.overlapping_plan_ids) -contains 'PLAN-20260908-01234567') -and (@($planOverlap.Data.blocking_reasons) -contains 'plan_overlap'))
    [IO.File]::WriteAllText((Join-Path $repo 'other.txt'),'x',(New-Object Text.UTF8Encoding($false)))
    $nonoverlap=Run-Preflight $repo @('owned.txt') -CurrentPlanId 'PLAN-20260908-01234567';Assert-True 'dirty_nonoverlap' ($nonoverlap.Code-eq0-and$nonoverlap.Data.working_tree_state-eq'dirty_nonoverlap')
    $overlap=Run-Preflight $repo @('other.txt') -CurrentPlanId 'PLAN-20260908-01234567';Assert-True 'dirty_overlap_blocks' ($overlap.Code-eq1-and$overlap.Data.working_tree_state-eq'dirty_overlap')
    Remove-Item (Join-Path $repo 'other.txt') -Force
    [void](Invoke-TestGit $repo @('checkout','--detach','HEAD'))
    $detached=Run-Preflight $repo;Assert-True 'detached_blocks' ($detached.Code-eq1-and@($detached.Data.blocking_reasons)-contains'detached')
    [void](Invoke-TestGit $repo @('checkout','main'))

    $bare=Join-Path $temp 'remote.git';New-Item -ItemType Directory $bare|Out-Null;[void](Invoke-TestGit $bare @('init','--bare'))
    [void](Invoke-TestGit $repo @('remote','add','origin',$bare));[void](Invoke-TestGit $repo @('push','-u','origin','main'));[void](Invoke-TestGit $bare @('symbolic-ref','HEAD','refs/heads/main'));[void](Invoke-TestGit $repo @('fetch','origin'));[void](Invoke-TestGit $repo @('remote','set-head','origin','-a'))
    $fresh=Run-Preflight $repo @() -Remote;Assert-True 'git_remote_fresh' ($fresh.Code-eq0-and$fresh.Data.repository_mode-eq'git_remote'-and$fresh.Data.remote_freshness-eq'verified'-and$fresh.Data.integration_target-eq'origin/main')
    $peer=Join-Path $temp 'peer';[void](& git clone $bare $peer 2>&1);[void](Invoke-TestGit $peer @('config','user.email','test@example.invalid'));[void](Invoke-TestGit $peer @('config','user.name','Test User'));[IO.File]::WriteAllText((Join-Path $peer 'peer.txt'),'peer',(New-Object Text.UTF8Encoding($false)));[void](Invoke-TestGit $peer @('add','.'));[void](Invoke-TestGit $peer @('commit','-m','peer'));[void](Invoke-TestGit $peer @('push','origin','main'))
    $stale=Run-Preflight $repo @() -Remote;Assert-True 'stale_blocks' ($stale.Code-eq1-and$stale.Data.remote_freshness-eq'stale')
    [IO.File]::WriteAllText((Join-Path $repo 'local.txt'),'local',(New-Object Text.UTF8Encoding($false)));[void](Invoke-TestGit $repo @('add','.'));[void](Invoke-TestGit $repo @('commit','-m','local'))
    $diverged=Run-Preflight $repo @() -Remote;Assert-True 'diverged_blocks' ($diverged.Code-eq1-and$diverged.Data.remote_freshness-eq'diverged')

    $digestRepo=Join-Path $temp 'digest';Init-Repo $digestRepo;$a=(@(Invoke-TestGit $digestRepo @('rev-parse','HEAD')))[0];$da=Get-GitScopeDigest $digestRepo $a @('owned.txt')
    [IO.File]::WriteAllText((Join-Path $digestRepo 'unrelated.txt'),'u',(New-Object Text.UTF8Encoding($false)));[void](Invoke-TestGit $digestRepo @('add','.'));[void](Invoke-TestGit $digestRepo @('commit','-m','unrelated'));$b=(@(Invoke-TestGit $digestRepo @('rev-parse','HEAD')))[0];$db=Get-GitScopeDigest $digestRepo $b @('owned.txt')
    Assert-True 'scope_digest_ignores_unowned' ($da-eq$db)
    [IO.File]::WriteAllText((Join-Path $digestRepo 'owned.txt'),"two`n",(New-Object Text.UTF8Encoding($false)));[void](Invoke-TestGit $digestRepo @('add','.'));[void](Invoke-TestGit $digestRepo @('commit','-m','owned'));$c=(@(Invoke-TestGit $digestRepo @('rev-parse','HEAD')))[0];$dc=Get-GitScopeDigest $digestRepo $c @('owned.txt')
    Assert-True 'scope_digest_detects_owned_change' ($db-ne$dc)

    $before=(Get-FileHash (Join-Path $root 'docs/INDEX.md') -Algorithm SHA256).Hash;& (Join-Path $root 'hooks/update-indexes.ps1') -RootPath $root -Write|Out-Null;$middle=(Get-FileHash (Join-Path $root 'docs/INDEX.md') -Algorithm SHA256).Hash;& (Join-Path $root 'hooks/update-indexes.ps1') -RootPath $root -Write|Out-Null;$after=(Get-FileHash (Join-Path $root 'docs/INDEX.md') -Algorithm SHA256).Hash
    Assert-True 'index_write_idempotent' ($before-eq$middle-and$middle-eq$after)
    $copy=Join-Path $temp 'index-copy';New-Item -ItemType Directory $copy|Out-Null;Copy-Item (Join-Path $root '*') $copy -Recurse -Force;$idx=Join-Path $copy 'docs/INDEX.md';[IO.File]::AppendAllText($idx,"`n<!-- manual damage -->`n");$check=@(& (Join-Path $copy 'hooks/update-indexes.ps1') -RootPath $copy -Check 2>&1)
    Assert-True 'index_check_detects_generated_damage' ($LASTEXITCODE-eq0) 'outside generated blocks are intentionally preserved'
    $idxText=[IO.File]::ReadAllText($idx);$idxText=$idxText.Replace('<!-- GENERATED:BEGIN PLANS -->','<!-- GENERATED:BEGIN PLANS -->'+"`n| broken | row |");[IO.File]::WriteAllText($idx,$idxText,(New-Object Text.UTF8Encoding($false)));$check=@(& (Join-Path $copy 'hooks/update-indexes.ps1') -RootPath $copy -Check 2>&1)
    Assert-True 'index_check_rejects_generated_damage' ($LASTEXITCODE-eq1)

    $session='{}'|& (Join-Path $root 'hooks/codex-hook.ps1') -RootPath $root -Event SessionStart;$sessionObj=($session-join"`n")|ConvertFrom-Json
    Assert-True 'session_hook_contract' ($sessionObj.hookSpecificOutput.hookEventName-eq'SessionStart'-and$sessionObj.hookSpecificOutput.additionalContext)
    $stop='{ "stop_hook_active": true }'|& (Join-Path $root 'hooks/codex-hook.ps1') -RootPath $root -Event Stop;$stopObj=($stop-join"`n")|ConvertFrom-Json
    Assert-True 'stop_hook_loop_guard' ($null-ne$stopObj)
    $normalStop='{}'|& (Join-Path $root 'hooks/codex-hook.ps1') -RootPath $root -Event Stop;$normalStopObj=($normalStop-join"`n")|ConvertFrom-Json
    $normalStopProperties=@($normalStopObj.PSObject.Properties|ForEach-Object{$_.Name});Assert-True 'stop_hook_pass_contract' (-not($normalStopProperties-contains'decision'))
    $hookJson=[IO.File]::ReadAllText((Join-Path $root '.codex/hooks.json'),[Text.Encoding]::UTF8)|ConvertFrom-Json
    Assert-True 'hooks_define_both_events' ($hookJson.hooks.SessionStart-and$hookJson.hooks.Stop)

    $protectedRepo=Join-Path $temp 'protected';New-Item -ItemType Directory $protectedRepo|Out-Null
    foreach($item in Get-ChildItem $root -Force){Copy-Item $item.FullName $protectedRepo -Recurse -Force}
    [void](Invoke-TestGit $protectedRepo @('init'));[void](Invoke-TestGit $protectedRepo @('config','user.email','test@example.invalid'));[void](Invoke-TestGit $protectedRepo @('config','user.name','Test User'));[void](Invoke-TestGit $protectedRepo @('add','.'));[void](Invoke-TestGit $protectedRepo @('commit','-m','baseline'));[void](Invoke-TestGit $protectedRepo @('branch','-M','main'))
    $protectedBare=Join-Path $temp 'protected-remote.git';New-Item -ItemType Directory $protectedBare|Out-Null;[void](Invoke-TestGit $protectedBare @('init','--bare'));[void](Invoke-TestGit $protectedRepo @('remote','add','origin',$protectedBare));[void](Invoke-TestGit $protectedRepo @('push','-u','origin','main'));[void](Invoke-TestGit $protectedBare @('symbolic-ref','HEAD','refs/heads/main'));[void](Invoke-TestGit $protectedRepo @('fetch','origin'));[void](Invoke-TestGit $protectedRepo @('remote','set-head','origin','-a'))
    $archived=Join-Path $protectedRepo 'docs/achievements/ACH-20260904-001-docs-evidence-chain.md';[IO.File]::AppendAllText($archived,"`ntampered`n")
    $manifest=Join-Path $protectedRepo 'docs/ARCHIVE.sha256';$manifestText=[IO.File]::ReadAllText($manifest);$newHash=Get-NormalizedSha256 $archived;$manifestText=[regex]::Replace($manifestText,'(?m)^[A-F0-9]{64}(  achievements/ACH-20260904-001-docs-evidence-chain\.md)$',$newHash+'$1');[IO.File]::WriteAllText($manifest,$manifestText,(New-Object Text.UTF8Encoding($false)))
    [void](Invoke-TestGit $protectedRepo @('add','.'));[void](Invoke-TestGit $protectedRepo @('commit','-m','tamper-and-reseal'))
    $protectedCheck=@(& (Join-Path $protectedRepo 'hooks/validate-project.ps1') -RootPath $protectedRepo -Check 2>&1);$protectedCode=$LASTEXITCODE
    Assert-True 'git_baseline_rejects_tamper_and_reseal' ($protectedCode-eq1)
}finally{
    $resolved=[IO.Path]::GetFullPath($temp);if(-not$resolved.StartsWith($tempBase,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe temp cleanup path'};if(Test-Path $resolved){Remove-Item $resolved -Recurse -Force}
}
Assert-True 'workspace_remains_non_git' (-not(Test-Path (Join-Path $root '.git')))
if($failures.Count){'COLLABORATION_TESTS=FAILED';$failures|ForEach-Object{"FAIL $_"};exit 1}
'COLLABORATION_TESTS=PASSED';"POSITIVE_ASSERTIONS=$passed";exit 0
