[CmdletBinding()]
param(
    [Parameter()]
    [string]$RootPath = (Split-Path -Parent $PSScriptRoot)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path -LiteralPath $RootPath).Path
$failures = [System.Collections.Generic.List[string]]::new()

function Invoke-RulesValidator {
    param([string]$CaseRoot)
    $validator = Join-Path $CaseRoot 'hooks\validate-rules.ps1'
    $output = @(& $validator -RootPath $CaseRoot 2>&1)
    return @{
        ExitCode = $LASTEXITCODE
        Output = ($output -join [Environment]::NewLine)
    }
}

function Replace-FirstText {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Replacement
    )
    $content = [IO.File]::ReadAllText($Path)
    $updated = [regex]::Replace($content, $Pattern, $Replacement, [Text.RegularExpressions.RegexOptions]::Multiline, [TimeSpan]::FromSeconds(2))
    if ($updated -eq $content) {
        throw "Test mutation did not match: $Path :: $Pattern"
    }
    [IO.File]::WriteAllText($Path, $updated)
}

$positive = Invoke-RulesValidator $root
if ($positive.ExitCode -ne 0) {
    $failures.Add("positive_structure unexpectedly failed: $($positive.Output)")
} else {
    Write-Output 'PASS positive_structure'
}

$systemTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$testRoot = Join-Path $systemTemp ("baby-growth-rules-test-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null

function New-TestCase {
    param([string]$Name)
    $caseRoot = Join-Path $testRoot $Name
    New-Item -ItemType Directory -Path $caseRoot | Out-Null
    Copy-Item -Path (Join-Path $root '*') -Destination $caseRoot -Recurse -Force
    return $caseRoot
}

function Assert-NegativeCase {
    param(
        [string]$Name,
        [scriptblock]$Mutate
    )
    $caseRoot = New-TestCase $Name
    & $Mutate $caseRoot
    $result = Invoke-RulesValidator $caseRoot
    if ($result.ExitCode -eq 0) {
        $failures.Add("$Name was not rejected")
    } else {
        Write-Output "PASS $Name"
    }
}

function New-ModernPlanFixture {
    param([string]$CaseRoot,[string]$PlanId='PLAN-20260908-01234567')
    $dir=Join-Path $CaseRoot "docs\plans\$PlanId";New-Item -ItemType Directory -Path $dir -Force|Out-Null
    $utf8=New-Object Text.UTF8Encoding($false)
    $plan="---`nid: $PlanId`ntype: plan`ntitle: Test modern plan`nstatus: confirmed`ncreated_at: 2026-09-08T12:00:00+08:00`nupdated_at: 2026-09-08T12:00:00+08:00`nrelated_ids: []`nsupersedes: []`nsuperseded_by: []`napplicable_rules: []`n---`n`n# Test`n"
    $state="---`nid: $PlanId-STATE`ntype: plan_state`nplan_id: $PlanId`nstatus: in_progress`nrepository_mode: non_git`nremote_name: null`nintegration_target: null`nwork_branch: null`nbase_commit: null`nremote_freshness: not_applicable`nworking_tree_state: not_applicable`nowned_paths: [sandbox/test.txt]`noverlapping_plan_ids: []`nreviewed_commit: null`nreviewed_scope_digest: null`naccepted_commit: null`naccepted_scope_digest: null`nintegrated_commit: null`nintegrated_scope_digest: null`n---`n"
    $exec="---`nid: $PlanId-EXEC`ntype: execution_log`ntitle: Test execution`nstatus: open`ncreated_at: 2026-09-08T12:00:00+08:00`nupdated_at: 2026-09-08T12:00:00+08:00`nrelated_ids: [$PlanId]`nsupersedes: []`nsuperseded_by: []`n---`n"
    $review="---`nid: $PlanId-REVIEW`ntype: review_report`ntitle: Test review`nstatus: pending`ncreated_at: 2026-09-08T12:00:00+08:00`nupdated_at: 2026-09-08T12:00:00+08:00`nrelated_ids: [$PlanId]`nsupersedes: []`nsuperseded_by: []`n---`n"
    $reg="---`nid: $PlanId-REGRESSION`ntype: regression_report`ntitle: Test regression`nstatus: pending`nci_status: not_configured`ncreated_at: 2026-09-08T12:00:00+08:00`nupdated_at: 2026-09-08T12:00:00+08:00`nrelated_ids: [$PlanId]`nsupersedes: []`nsuperseded_by: []`n---`n"
    $accept="---`nid: $PlanId-ACCEPTANCE`ntype: acceptance_record`ntitle: Test acceptance`nstatus: pending`nacceptance_status: pending`ncreated_at: 2026-09-08T12:00:00+08:00`nupdated_at: 2026-09-08T12:00:00+08:00`nrelated_ids: [$PlanId]`nsupersedes: []`nsuperseded_by: []`n---`n"
    [IO.File]::WriteAllText((Join-Path $dir 'plan.md'),$plan,$utf8);[IO.File]::WriteAllText((Join-Path $dir 'state.md'),$state,$utf8);[IO.File]::WriteAllText((Join-Path $dir 'execution-log.md'),$exec,$utf8);[IO.File]::WriteAllText((Join-Path $dir 'review-report.md'),$review,$utf8);[IO.File]::WriteAllText((Join-Path $dir 'regression-report.md'),$reg,$utf8);[IO.File]::WriteAllText((Join-Path $dir 'acceptance-record.md'),$accept,$utf8)
    return $dir
}

$modernPositiveRoot=New-TestCase 'positive_modern_plan'
[void](New-ModernPlanFixture $modernPositiveRoot)
$modernPositive=Invoke-RulesValidator $modernPositiveRoot
if($modernPositive.ExitCode-ne0){$failures.Add("positive_modern_plan unexpectedly failed: $($modernPositive.Output)")}else{Write-Output 'PASS positive_modern_plan'}

try {
    Assert-NegativeCase 'duplicate_rule_id' {
        param($caseRoot)
        Replace-FirstText (Join-Path $caseRoot 'rules\modules\repository-safety.md') '^## REPO-001 \u2014' ('## SRC-001 ' + [char]0x2014)
    }

    Assert-NegativeCase 'missing_ruleset_reference' {
        param($caseRoot)
        Replace-FirstText (Join-Path $caseRoot 'docs\plans\PLAN-20260907-001\plan.md') 'RULESET-SOURCE-EVIDENCE' 'RULESET-MISSING'
    }

    Assert-NegativeCase 'invalid_ruleset_status' {
        param($caseRoot)
        Replace-FirstText (Join-Path $caseRoot 'rules\modules\source-and-evidence.md') '^status: active$' 'status: invalid'
    }

    Assert-NegativeCase 'must_without_verification' {
        param($caseRoot)
        Replace-FirstText (Join-Path $caseRoot 'rules\modules\security-and-privacy.md') '^- Verification modes: `review`\r?\n' ''
    }

    Assert-NegativeCase 'stage_missing_module' {
        param($caseRoot)
        $path = Join-Path $caseRoot 'rules\stages\development.md'
        [IO.File]::AppendAllText($path, "`r`n[Missing module](../modules/does-not-exist.md)`r`n")
    }

    Assert-NegativeCase 'invalid_plan_rule_version' {
        param($caseRoot)
        Replace-FirstText (Join-Path $caseRoot 'docs\plans\PLAN-20260907-001\plan.md') '^    version: 1$' '    version: 99'
    }

    Assert-NegativeCase 'review_omits_rule' {
        param($caseRoot)
        Replace-FirstText (Join-Path $caseRoot 'docs\plans\PLAN-20260907-001\review-report.md') '^\| `SRC-001` \|.*\r?\n' ''
    }

    Assert-NegativeCase 'archived_plan_missing_achievement' {
        param($caseRoot)
        $target = Join-Path $caseRoot 'docs\achievements\ACH-20260904-001-docs-evidence-chain.md'
        Remove-Item -LiteralPath $target -Force
    }

    Assert-NegativeCase 'archive_hash_changed' {
        param($caseRoot)
        $archiveRoot = Join-Path $caseRoot 'rules\archive'
        $snapshotDirectory = Join-Path $archiveRoot 'RULESET-TEST-SNAPSHOT'
        New-Item -ItemType Directory -Path $snapshotDirectory | Out-Null
        $snapshot = Join-Path $snapshotDirectory 'v001-20260907.md'
        [IO.File]::WriteAllText($snapshot, "# Test snapshot`r`n")
        $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $snapshot).Hash
        $manifest = Join-Path $archiveRoot 'MANIFEST.sha256'
        [IO.File]::WriteAllText($manifest, "$hash  RULESET-TEST-SNAPSHOT/v001-20260907.md`r`n")
        [IO.File]::AppendAllText($snapshot, "tampered`r`n")
    }

    Assert-NegativeCase 'broken_markdown_link' {
        param($caseRoot)
        $path = Join-Path $caseRoot 'rules\README.md'
        [IO.File]::AppendAllText($path, "`r`n[Broken](./missing-document.md)`r`n")
    }

    Assert-NegativeCase 'new_legacy_id_forbidden' {
        param($caseRoot)
        $dir=New-ModernPlanFixture $caseRoot 'PLAN-20260908-002'
    }

    Assert-NegativeCase 'modern_plan_missing_state' {
        param($caseRoot)
        $dir=New-ModernPlanFixture $caseRoot
        Remove-Item (Join-Path $dir 'state.md') -Force
    }

    Assert-NegativeCase 'git_plan_missing_base' {
        param($caseRoot)
        $dir=New-ModernPlanFixture $caseRoot
        Replace-FirstText (Join-Path $dir 'state.md') '^repository_mode: non_git$' 'repository_mode: git_remote'
        Replace-FirstText (Join-Path $dir 'state.md') '^remote_name: null$' 'remote_name: origin'
        Replace-FirstText (Join-Path $dir 'state.md') '^integration_target: null$' 'integration_target: origin/main'
    }

    Assert-NegativeCase 'configured_ci_failed' {
        param($caseRoot)
        $dir=New-ModernPlanFixture $caseRoot
        Replace-FirstText (Join-Path $dir 'regression-report.md') '^ci_status: not_configured$' 'ci_status: failed'
    }

    Assert-NegativeCase 'docs_archive_hash_changed' {
        param($caseRoot)
        $path=Join-Path $caseRoot 'docs\achievements\ACH-20260904-001-docs-evidence-chain.md'
        [IO.File]::AppendAllText($path,"`nchanged`n")
    }
} finally {
    $resolvedTestRoot = [IO.Path]::GetFullPath($testRoot)
    if (-not $resolvedTestRoot.StartsWith($systemTemp, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove test directory outside system temp: $resolvedTestRoot"
    }
    if (Test-Path -LiteralPath $resolvedTestRoot) {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}

if ($failures.Count -gt 0) {
    Write-Output 'RULES_VALIDATOR_TESTS=FAILED'
    foreach ($failure in $failures) {
        Write-Output "FAIL $failure"
    }
    exit 1
}

Write-Output 'RULES_VALIDATOR_TESTS=PASSED'
Write-Output 'POSITIVE_CASES=2'
Write-Output 'NEGATIVE_CASES=15'
exit 0
