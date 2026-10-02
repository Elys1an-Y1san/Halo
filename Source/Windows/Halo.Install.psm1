Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Move-HaloDirectory([string]$Source, [string]$Destination) {
    [IO.Directory]::Move($Source, $Destination)
}

function Get-HaloPayload {
    param([Parameter(Mandatory=$true)][string]$PackageRoot)
    $root = [IO.Path]::GetFullPath($PackageRoot)
    $index = Get-Content -LiteralPath (Join-Path $root 'payload.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($index.product -ne 'Halo' -or $index.version -notmatch '^\d+\.\d+\.\d+$' -or $index.files.Count -lt 1) {
        throw 'The Halo package metadata is invalid.'
    }
    $seen = @{}
    foreach ($file in $index.files) {
        $relative = [string]$file.path
        if ($relative -notmatch '^Chrome/[a-zA-Z0-9_./ -]+$' -or $relative -match '(^|/)\.\.?(/|$)' -or $seen.ContainsKey($relative) -or $file.sha256 -notmatch '^[a-f0-9]{64}$') {
            throw 'The Halo package contains an invalid file path or hash.'
        }
        $seen[$relative] = $true
        $source = Join-Path $root $relative
        if (!(Test-Path -LiteralPath $source -PathType Leaf)) { throw "A package file is missing: $relative" }
        if ((Get-Item -LiteralPath $source).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked package files are not supported.' }
        if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) { throw "A package file is damaged: $relative" }
    }
    if (!$seen.ContainsKey('Chrome/manifest.json')) { throw 'The extension manifest is missing.' }
    $manifest = Get-Content -LiteralPath (Join-Path $root 'Chrome/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($manifest.version -ne $index.version -or $manifest.manifest_version -ne 3) { throw 'The extension version does not match the package.' }
    return $index
}

function Install-HaloFiles {
    param([Parameter(Mandatory=$true)][string]$PackageRoot, [Parameter(Mandatory=$true)][string]$InstallRoot)
    $index = Get-HaloPayload -PackageRoot $PackageRoot
    $destination = Join-Path ([IO.Path]::GetFullPath($InstallRoot)) 'Extension'
    $marker = Join-Path $destination '.halo-managed'
    if (Test-Path -LiteralPath $destination) {
        if (!(Test-Path -LiteralPath $marker -PathType Leaf) -or (Get-Content -LiteralPath $marker -Raw).Trim() -ne 'Halo extension files') {
            throw 'The destination contains files not managed by Halo. Nothing was replaced.'
        }
        if ((Get-Item -LiteralPath $destination).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'The destination cannot be a linked folder.' }
    }
    New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
    $stage = Join-Path $InstallRoot ('stage-' + [guid]::NewGuid().ToString('N'))
    $backup = Join-Path $InstallRoot ('backup-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $stage | Out-Null
    $moved = $false
    try {
        foreach ($file in $index.files) {
            $target = Join-Path $stage $file.path.Substring(7)
            New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
            Copy-Item -LiteralPath (Join-Path $PackageRoot $file.path) -Destination $target
            if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) { throw 'The installed file did not pass the integrity check.' }
        }
        Set-Content -LiteralPath (Join-Path $stage '.halo-managed') -Value 'Halo extension files' -Encoding UTF8
        if (Test-Path -LiteralPath $destination) { Move-HaloDirectory $destination $backup; $moved = $true }
        Move-HaloDirectory $stage $destination
    } catch {
        if ($moved -and !(Test-Path -LiteralPath $destination)) { Move-HaloDirectory $backup $destination }
        throw
    } finally {
        if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
    }
    if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
    return $destination
}

Export-ModuleMember -Function Get-HaloPayload, Install-HaloFiles
