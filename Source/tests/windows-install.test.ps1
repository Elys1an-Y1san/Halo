Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$version = (Get-Content -LiteralPath (Join-Path $root 'Chrome/manifest.json') -Raw | ConvertFrom-Json).version
$package = Join-Path $root ('Releases/Halo-Windows-Chrome-' + $version)
$module = Import-Module (Join-Path $root 'Source/Windows/Halo.Install.psm1') -Force -PassThru
$temp = Join-Path ([IO.Path]::GetTempPath()) ('Halo installer tests ' + [guid]::NewGuid().ToString('N'))
$count = 0
function Check([string]$Name, [bool]$Pass) {
    if (!$Pass) { throw "FAIL: $Name" }
    $script:count++
    Write-Host "PASS: $Name"
}
function Must-Fail([scriptblock]$Action) {
    try { & $Action | Out-Null; return $false } catch { return $true }
}
try {
    New-Item -ItemType Directory -Path $temp | Out-Null
    foreach ($script in Get-ChildItem -LiteralPath (Join-Path $root 'Source/Windows') -Include '*.ps1','*.psm1' -Recurse) {
        $tokens = $null; $errors = $null
        [Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref]$tokens, [ref]$errors) | Out-Null
        Check ('PowerShell parser: ' + $script.Name) ($errors.Count -eq 0)
    }
    $index = Get-HaloPayload $package
    Check 'real package hashes and version' ($index.version -eq $version)
    $install = Join-Path $temp '安装 path with spaces'
    $profile = Join-Path $install 'BrowserProfile'
    New-Item -ItemType Directory -Path $profile -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $profile 'Preferences') -Value 'keep this profile'
    $destination = Install-HaloFiles $package $install
    Check 'first installation at a stable path' ($destination -eq (Join-Path $install 'Extension') -and (Test-Path -LiteralPath (Join-Path $destination 'manifest.json')))
    Set-Content -LiteralPath (Join-Path $destination 'old-unused-file.js') -Value 'old'
    $same = Install-HaloFiles $package $install
    Check 'updates remove stale files and keep the path' ($same -eq $destination -and !(Test-Path -LiteralPath (Join-Path $destination 'old-unused-file.js')))
    Check 'browser settings survive replacement' ((Get-Content -LiteralPath (Join-Path $profile 'Preferences') -Raw).Trim() -eq 'keep this profile')
    $unknown = Join-Path $temp 'unmanaged'
    New-Item -ItemType Directory -Path (Join-Path $unknown 'Extension') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $unknown 'Extension/keep.txt') -Value 'unrelated'
    Check 'foreign destination is refused' (Must-Fail { Install-HaloFiles $package $unknown })
    Check 'foreign files survive refusal' ((Get-Content -LiteralPath (Join-Path $unknown 'Extension/keep.txt') -Raw).Trim() -eq 'unrelated')
    $corrupt = Join-Path $temp 'corrupt'
    Copy-Item -LiteralPath $package -Destination $corrupt -Recurse
    Add-Content -LiteralPath (Join-Path $corrupt 'Chrome/manifest.json') -Value 'damaged'
    $before = (Get-FileHash -LiteralPath (Join-Path $destination 'manifest.json')).Hash
    Check 'damaged package is refused' (Must-Fail { Install-HaloFiles $corrupt $install })
    Check 'failed integrity check preserves installation' ((Get-FileHash -LiteralPath (Join-Path $destination 'manifest.json')).Hash -eq $before)
    $traversal = Join-Path $temp 'traversal'
    Copy-Item -LiteralPath $package -Destination $traversal -Recurse
    $meta = Get-Content -LiteralPath (Join-Path $traversal 'payload.json') -Raw | ConvertFrom-Json
    $meta.files[0].path = 'Chrome/../escape.js'
    $meta | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $traversal 'payload.json')
    Check 'parent directory traversal is refused' (Must-Fail { Get-HaloPayload $traversal })
    & $module {
        function script:Move-HaloDirectory([string]$Source, [string]$Destination) {
            if ([IO.Path]::GetFileName($Source).StartsWith('stage-')) { throw 'Simulated commit failure' }
            [IO.Directory]::Move($Source, $Destination)
        }
    }
    Check 'commit failure is reported' (Must-Fail { Install-HaloFiles $package $install })
    Check 'previous files roll back after commit failure' ((Get-FileHash -LiteralPath (Join-Path $destination 'manifest.json')).Hash -eq $before)
    Check 'failed staging folders are cleaned' (@(Get-ChildItem -LiteralPath $install -Filter 'stage-*').Count -eq 0)
    Write-Host "$count checks passed; Windows browser startup and COM APIs still require Windows runtime testing."
} finally {
    Remove-Module $module.Name
    if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
}
