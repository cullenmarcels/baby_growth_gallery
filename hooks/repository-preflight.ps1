[CmdletBinding()]
param(
    [string]$RootPath = (Split-Path -Parent $PSScriptRoot),
    [string[]]$OwnedPaths = @(),
    [string]$CurrentPlanId,
    [switch]$Remote,
    [switch]$AsJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot 'project-library.ps1')

$result = [ordered]@{
    repository_mode = 'non_git'; repository_root = $null; head_commit = $null; work_branch = $null
    remote_name = $null; integration_target = $null; remote_freshness = 'not_applicable'
    working_tree_state = 'not_applicable'; overlapping_plan_ids = @(); blocking_reasons = @()
}
$exitCode = 0
try {
    $root = (Resolve-Path -LiteralPath $RootPath).Path
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git runtime is unavailable' }
    $gitRoot = @(& git -C $root rev-parse --show-toplevel 2>$null)
    if ($LASTEXITCODE -ne 0 -or $gitRoot.Count -eq 0) {
        if ($AsJson) { [pscustomobject]$result | ConvertTo-Json -Depth 5 } else { [pscustomobject]$result | Format-List | Out-String }
        exit 0
    }
    $repo = (Resolve-Path -LiteralPath $gitRoot[0]).Path
    $result.repository_root = '.'
    $head = @(& git -C $repo rev-parse HEAD 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Cannot resolve HEAD: $($head -join ' ')" }
    $result.head_commit = $head[0].Trim()
    $branch = @(& git -C $repo symbolic-ref --quiet --short HEAD 2>$null)
    if ($LASTEXITCODE -ne 0) {
        $result.work_branch = $null
        $result.blocking_reasons += 'detached'
    } else { $result.work_branch = $branch[0].Trim() }

    $remotes = @(& git -C $repo remote 2>$null | Where-Object { $_ })
    if ($remotes.Count -eq 0) {
        $result.repository_mode = 'git_local'
        $result.remote_freshness = 'not_applicable'
    } else {
        $result.repository_mode = 'git_remote'
        $upstream = @(& git -C $repo rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>$null)
        if ($LASTEXITCODE -eq 0 -and $upstream.Count -gt 0) { $result.remote_name = $upstream[0].Split('/')[0] }
        elseif ($remotes.Count -eq 1) { $result.remote_name = $remotes[0] }
        if ($result.remote_name) {
            $defaultRef = @(& git -C $repo symbolic-ref --quiet --short "refs/remotes/$($result.remote_name)/HEAD" 2>$null)
            if ($LASTEXITCODE -eq 0 -and $defaultRef.Count -gt 0) { $result.integration_target = $defaultRef[0].Trim() }
        }
        if ($Remote) {
            if (-not $result.remote_name) { $result.remote_freshness = 'unverified'; $result.blocking_reasons += 'remote_not_configured' }
            else {
                $fetch = @(& git -C $repo fetch --prune $result.remote_name 2>&1)
                if ($LASTEXITCODE -ne 0) { $result.remote_freshness = 'unverified'; $result.blocking_reasons += 'remote_unverified'; $exitCode = 2 }
                elseif ($upstream.Count -gt 0) {
                    $counts = @(& git -C $repo rev-list --left-right --count "HEAD...$($upstream[0])" 2>&1)
                    if ($LASTEXITCODE -ne 0 -or $counts.Count -eq 0) { $result.remote_freshness = 'unverified'; $result.blocking_reasons += 'remote_unverified' }
                    else {
                        $parts = $counts[0].Trim() -split '\s+'
                        $ahead = [int]$parts[0]; $behind = [int]$parts[1]
                        if ($ahead -gt 0 -and $behind -gt 0) { $result.remote_freshness = 'diverged'; $result.blocking_reasons += 'diverged' }
                        elseif ($behind -gt 0) { $result.remote_freshness = 'stale'; $result.blocking_reasons += 'stale' }
                        else { $result.remote_freshness = 'verified' }
                    }
                } else { $result.remote_freshness = 'unverified'; $result.blocking_reasons += 'upstream_not_configured' }
            }
        } else { $result.remote_freshness = 'unverified' }
    }

    $dirty = @(& git -C $repo status --porcelain=v1 --untracked-files=all 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Cannot inspect working tree: $($dirty -join ' ')" }
    $dirtyPaths = @($dirty | Where-Object { $_.Length -ge 4 } | ForEach-Object {
        $p = $_.Substring(3); if ($p.Contains(' -> ')) { $p = $p.Split(' -> ')[-1] }; $p.Replace('\','/')
    })
    if ($dirtyPaths.Count -eq 0) { $result.working_tree_state = 'clean' }
    else {
        $overlap = $false
        foreach ($changed in $dirtyPaths) { foreach ($owned in $OwnedPaths) { if (Test-ProjectPathOverlap $changed $owned) { $overlap = $true } } }
        if ($overlap) { $result.working_tree_state = 'dirty_overlap'; $result.blocking_reasons += 'dirty_overlap' }
        else { $result.working_tree_state = 'dirty_nonoverlap' }
    }

    $activePlans = Join-Path $repo 'docs/plans'
    if (Test-Path -LiteralPath $activePlans) {
        foreach ($stateFile in @(Get-ChildItem -LiteralPath $activePlans -Filter state.md -File -Recurse -ErrorAction SilentlyContinue)) {
            $meta = Get-ProjectFrontMatter $stateFile.FullName
            if ($meta.status -in @('archived','cancelled','superseded')) { continue }
            $otherPaths = ConvertFrom-InlineList $meta.owned_paths
            $hit = $false
            foreach ($left in $OwnedPaths) { foreach ($right in $otherPaths) { if (Test-ProjectPathOverlap $left $right) { $hit = $true } } }
            if ($hit -and $meta.plan_id -and $meta.plan_id -ne $CurrentPlanId) { $result.overlapping_plan_ids += $meta.plan_id }
        }
    }
    $result.overlapping_plan_ids = @($result.overlapping_plan_ids | Sort-Object -Unique)
    if ($result.overlapping_plan_ids.Count -gt 0) { $result.blocking_reasons += 'plan_overlap' }
    $result.blocking_reasons = @($result.blocking_reasons | Sort-Object -Unique)
    if ($result.blocking_reasons.Count -gt 0 -and $exitCode -eq 0) { $exitCode = 1 }
} catch {
    $result.blocking_reasons = @("environment_unavailable: $($_.Exception.Message)")
    $exitCode = 2
}
if ($AsJson) { [pscustomobject]$result | ConvertTo-Json -Depth 5 } else { [pscustomobject]$result | Format-List | Out-String }
exit $exitCode
