Set-StrictMode -Version Latest

function Get-ProjectFrontMatter {
    param([Parameter(Mandatory)][string]$Path)
    $result = @{}
    $lines = @([IO.File]::ReadAllLines($Path, [Text.Encoding]::UTF8))
    if ($lines.Count -lt 3 -or $lines[0].Trim() -ne '---') { return $result }
    for ($i = 1; $i -lt $lines.Count; $i++) {
        if ($lines[$i].Trim() -eq '---') { break }
        if ($lines[$i] -match '^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$') {
            $value = $Matches[2].Trim()
            if ($value.Length -ge 2 -and $value[0] -eq '"' -and $value[$value.Length - 1] -eq '"') {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $result[$Matches[1]] = $value
        }
    }
    return $result
}

function ConvertTo-ProjectRelativePath {
    param([Parameter(Mandatory)][string]$Root, [Parameter(Mandatory)][string]$Path)
    $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $pathFull = [IO.Path]::GetFullPath($Path)
    if (-not $pathFull.StartsWith($rootFull + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside project root: $Path"
    }
    return $pathFull.Substring($rootFull.Length + 1).Replace('\', '/')
}

function Get-NormalizedUtf8Bytes {
    param([Parameter(Mandatory)][string]$Path)
    $utf8Strict = New-Object Text.UTF8Encoding($false, $true)
    $text = $utf8Strict.GetString([IO.File]::ReadAllBytes($Path))
    $text = $text.Replace("`r`n", "`n").Replace("`r", "`n")
    return (New-Object Text.UTF8Encoding($false)).GetBytes($text)
}

function Get-NormalizedSha256 {
    param([Parameter(Mandatory)][string]$Path)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash((Get-NormalizedUtf8Bytes $Path)))).Replace('-', '').ToUpperInvariant() }
    finally { $sha.Dispose() }
}

function Get-StringSha256 {
    param([Parameter(Mandatory)][string]$Text)
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = (New-Object Text.UTF8Encoding($false)).GetBytes($Text.Replace("`r`n", "`n").Replace("`r", "`n"))
        return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToUpperInvariant()
    } finally { $sha.Dispose() }
}

function ConvertFrom-InlineList {
    param([AllowNull()][string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return @() }
    $trimmed = $Value.Trim()
    if ($trimmed.StartsWith('[') -and $trimmed.EndsWith(']')) { $trimmed = $trimmed.Substring(1, $trimmed.Length - 2) }
    if ([string]::IsNullOrWhiteSpace($trimmed)) { return @() }
    return @($trimmed.Split(',') | ForEach-Object { $_.Trim().Trim('"').Trim("'") } | Where-Object { $_ })
}

function Test-ProjectPathOverlap {
    param([Parameter(Mandatory)][string]$Left, [Parameter(Mandatory)][string]$Right)
    $a = Normalize-ProjectRepositoryPath $Left
    $b = Normalize-ProjectRepositoryPath $Right
    return $a -eq $b -or $a.StartsWith($b + '/', [StringComparison]::OrdinalIgnoreCase) -or $b.StartsWith($a + '/', [StringComparison]::OrdinalIgnoreCase)
}

function Normalize-ProjectRepositoryPath {
    param([Parameter(Mandatory)][string]$Path)
    $normalized = $Path.Replace('\', '/')
    while ($normalized.StartsWith('./', [StringComparison]::Ordinal)) { $normalized = $normalized.Substring(2) }
    return $normalized.TrimEnd('/')
}

function Get-GitScopeDigest {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Commit,
        [Parameter(Mandatory)][string[]]$OwnedPaths,
        [ValidateSet(1, 2)][int]$Version = 1
    )
    $records = [System.Collections.Generic.List[string]]::new()
    foreach ($owned in @($OwnedPaths | Sort-Object -Unique)) {
        $path = if ($Version -eq 1) { $owned.Replace('\', '/').TrimStart('./') } else { Normalize-ProjectRepositoryPath $owned }
        $lines = @(& git -C $RepositoryRoot ls-tree -r $Commit -- $path 2>&1)
        if ($LASTEXITCODE -ne 0) { throw "Cannot read Git tree for $Commit/${path}: $($lines -join ' ')" }
        foreach ($line in $lines) { if ($line) { $records.Add([string]$line) } }
    }
    return Get-StringSha256 (($records | Sort-Object -Unique) -join "`n")
}
