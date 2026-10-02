param([ValidateSet('Standalone','Existing')][string]$Mode = 'Standalone')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
try {
    if ($env:OS -ne 'Windows_NT') { throw 'This installer requires Windows 10 or newer.' }
    if ([Environment]::OSVersion.Version.Major -lt 10) { throw 'This installer requires Windows 10 or newer.' }
    Import-Module (Join-Path $PSScriptRoot 'Halo.Install.psm1') -Force
    $installRoot = Join-Path $env:LOCALAPPDATA 'Halo'
    if ($Mode -eq 'Standalone') {
        $running = Get-Process -Name 'chrome' -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($installRoot + '\', [StringComparison]::OrdinalIgnoreCase) }
        if ($running) { throw 'Close the Halo browser before installing or updating, then run this installer again.' }
    }
    $extension = Install-HaloFiles -PackageRoot $PSScriptRoot -InstallRoot $installRoot
    Write-Host 'Halo extension files installed.' -ForegroundColor Yellow
    if ($Mode -eq 'Existing') {
        $candidates = @(
            (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
            (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe')
        )
        if ($env:ProgramW6432) { $candidates += Join-Path $env:ProgramW6432 'Google\Chrome\Application\chrome.exe' }
        if (${env:ProgramFiles(x86)}) { $candidates += Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe' }
        $chrome = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
        if (!$chrome) { throw 'Google Chrome was not found. Install Chrome, then run this installer again.' }
        Add-Type -AssemblyName System.Windows.Forms
        [Windows.Forms.Clipboard]::SetText($extension)
        Write-Host 'Chrome will open its Extensions page.'
        Write-Host 'Enable Developer mode, choose Load unpacked, and paste this folder:'
        Write-Host $extension -ForegroundColor Yellow
        Start-Process -FilePath $chrome -ArgumentList 'chrome://extensions/'
        Start-Process -FilePath 'explorer.exe' -ArgumentList ('"' + $extension + '"')
        Write-Host 'The folder path is on your clipboard. This step must be confirmed in Chrome.'
        Read-Host 'Press Enter to close' | Out-Null
        exit 0
    }
    if (![Environment]::Is64BitOperatingSystem) { throw 'The automatic browser option requires 64-bit Windows. Use the existing-Chrome installer instead.' }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Write-Host 'Fetching the official Chrome for Testing stable release...' -ForegroundColor Yellow
    $catalog = Invoke-RestMethod -Uri 'https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json'
    $release = $catalog.channels.Stable
    if ($release.version -notmatch '^\d+\.\d+\.\d+\.\d+$') { throw 'The browser release metadata is invalid.' }
    $download = $release.downloads.chrome | Where-Object { $_.platform -eq 'win64' } | Select-Object -First 1
    if (!$download) { throw 'The official Windows browser download is not available.' }
    $url = [uri]$download.url
    $expectedPath = '/chrome-for-testing-public/' + $release.version + '/win64/chrome-win64.zip'
    if ($url.Scheme -ne 'https' -or $url.Host -ne 'storage.googleapis.com' -or $url.AbsolutePath -ne $expectedPath -or $url.Query -or $url.Fragment -or $url.UserInfo) { throw 'The browser download URL was not accepted.' }
    $runtimeRoot = Join-Path $installRoot ('Browser-' + $release.version)
    $chrome = Join-Path $runtimeRoot 'chrome-win64\chrome.exe'
    $integrityPath = Join-Path $runtimeRoot 'halo-browser-integrity.json'
    if (!(Test-Path -LiteralPath $chrome)) {
        $stage = Join-Path $installRoot ('browser-stage-' + [guid]::NewGuid().ToString('N'))
        $zip = Join-Path $installRoot ('browser-download-' + [guid]::NewGuid().ToString('N') + '.zip')
        try {
            Write-Host 'Downloading the separate browser. This may take several minutes...'
            $request = [Net.HttpWebRequest]::Create($url.AbsoluteUri)
            $request.Method = 'HEAD'; $request.AllowAutoRedirect = $false
            $response = $request.GetResponse()
            try { $hashHeader = $response.Headers['x-goog-hash'] } finally { $response.Dispose() }
            if ($hashHeader -notmatch '(^|,\s*)md5=([A-Za-z0-9+/=]+)') { throw 'The official archive integrity value is missing.' }
            $expectedHash = $Matches[2]
            Invoke-WebRequest -Uri $url.AbsoluteUri -OutFile $zip -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 1800
            $stream = [IO.File]::OpenRead($zip); $md5 = [Security.Cryptography.MD5]::Create()
            try { $actualHash = [Convert]::ToBase64String($md5.ComputeHash($stream)) } finally { $stream.Dispose(); $md5.Dispose() }
            if ($actualHash -ne $expectedHash) { throw 'The official browser archive integrity check failed.' }
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            $archive = [IO.Compression.ZipFile]::OpenRead($zip)
            try {
                foreach ($entry in $archive.Entries) {
                    if ($entry.FullName -notmatch '^chrome-win64/' -or $entry.FullName -match '(^|[\\/])\.\.([\\/]|$)' -or $entry.FullName.Contains(':')) { throw 'The browser archive contains an invalid path.' }
                }
            } finally { $archive.Dispose() }
            [IO.Compression.ZipFile]::ExtractToDirectory($zip, $stage)
            $binary = Join-Path $stage 'chrome-win64\chrome.exe'
            if (!(Test-Path -LiteralPath $binary -PathType Leaf)) { throw 'The official browser executable is missing.' }
            $browserIndex = @{version=$release.version; exeHash=(Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash}
            $browserIndex | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stage 'halo-browser-integrity.json') -Encoding UTF8
            if (Test-Path -LiteralPath $runtimeRoot) { throw 'An incomplete browser folder exists. Remove that Halo browser folder and try again.' }
            [IO.Directory]::Move($stage, $runtimeRoot)
        } finally {
            if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
            if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
        }
    }
    $browserIndex = Get-Content -LiteralPath $integrityPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($browserIndex.version -ne $release.version -or $browserIndex.exeHash -ne (Get-FileHash -LiteralPath $chrome -Algorithm SHA256).Hash) { throw 'The installed Halo browser failed its integrity check.' }
    $profile = Join-Path $installRoot 'BrowserProfile'
    $arguments = '--user-data-dir="' + $profile + '" --load-extension="' + $extension + '" --no-first-run --no-default-browser-check https://www.bilibili.com/'
    $shell = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath('Desktop')
    $shortcut = $shell.CreateShortcut((Join-Path $desktop '映光 Halo.lnk'))
    $shortcut.TargetPath = $chrome
    $shortcut.Arguments = $arguments
    $shortcut.WorkingDirectory = Split-Path $chrome
    $shortcut.Description = '映光 Halo：带环境光插件的独立浏览器'
    $shortcut.IconLocation = $chrome + ',0'
    $shortcut.Save()
    Write-Host 'Installed. Use the Halo desktop shortcut to open this browser.' -ForegroundColor Green
    Start-Process -FilePath $chrome -ArgumentList $arguments
} catch {
    Write-Host ('Installation failed: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'You can install manually: read the Manual installation section in the guide included in this folder.'
    Write-Host 'Open chrome://extensions/, enable Developer mode, choose Load unpacked, and select the Chrome folder beside this script.'
    Read-Host 'Press Enter to close' | Out-Null
    exit 1
}
