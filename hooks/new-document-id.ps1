[CmdletBinding(DefaultParameterSetName='New')]
param(
    [Parameter(Mandatory, ParameterSetName='New')][ValidateSet('DES','SPEC','PLAN')][string]$Type,
    [Parameter(Mandatory, ParameterSetName='Achievement')][string]$PlanId,
    [string]$RootPath = (Split-Path -Parent $PSScriptRoot),
    [string[]]$CandidateSuffixes = @(),
    [switch]$AsJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $RootPath).Path
$docs = Join-Path $root 'docs'
$alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

if ($PSCmdlet.ParameterSetName -eq 'Achievement') {
    if ($PlanId -notmatch '^PLAN-(\d{8})-([0-9A-HJKMNP-TV-Z]{8}|\d{3})$') { throw "Invalid Plan ID: $PlanId" }
    $id = "ACH-$($Matches[1])-$($Matches[2])"
} else {
    try { $zone = [TimeZoneInfo]::FindSystemTimeZoneById('Asia/Shanghai') }
    catch { $zone = [TimeZoneInfo]::FindSystemTimeZoneById('China Standard Time') }
    $date = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $zone).ToString('yyyyMMdd')
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $candidateIndex = 0
    try {
        do {
            if ($candidateIndex -lt $CandidateSuffixes.Count) {
                $suffix = $CandidateSuffixes[$candidateIndex].ToUpperInvariant(); $candidateIndex++
                if ($suffix -notmatch '^[0-9A-HJKMNP-TV-Z]{8}$') { throw "Invalid test candidate suffix: $suffix" }
            } else {
                $bytes = New-Object byte[] 8
                $rng.GetBytes($bytes)
                $suffix = -join @($bytes | ForEach-Object { $alphabet[[int]$_ % 32] })
            }
            $id = "$Type-$date-$suffix"
            $collision = $false
            foreach ($file in @(Get-ChildItem -LiteralPath $docs -File -Recurse -ErrorAction SilentlyContinue)) {
                if ([IO.File]::ReadAllText($file.FullName).Contains($id)) { $collision = $true; break }
            }
        } while ($collision)
    } finally { $rng.Dispose() }
}

if ($AsJson) { [pscustomobject]@{ id = $id } | ConvertTo-Json -Compress } else { $id }
