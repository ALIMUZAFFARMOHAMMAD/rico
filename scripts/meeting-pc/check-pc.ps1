# Read-only preflight. Use -StorageDrive D when Docker/WSL data is installed on D:.
param([ValidatePattern('^[A-Za-z]$')][string]$StorageDrive = 'C')
$ErrorActionPreference = 'Stop'
$issues = @()
try {
    $free = [System.IO.DriveInfo]::new($StorageDrive + ':\').AvailableFreeSpace
    Write-Output ('{0}: free space: {1:N1} GB' -f $StorageDrive, ($free / 1GB))
    if ($free -lt 20GB) { $issues += 'Free at least 20 GB on the drive storing Docker/WSL data before continuing.' }
} catch { $issues += 'Disk space could not be read. Check at least 20 GB is free on the Docker/WSL data drive.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { $issues += 'Install Docker Desktop and enable WSL 2 / Ubuntu integration.' }
else {
    $dockerState = ''
    try { $dockerState = & docker info --format '{{.OSType}}' 2>$null } catch {}
    if ($LASTEXITCODE -ne 0 -or $dockerState -ne 'linux') { $issues += 'Start Docker Desktop with Linux containers.' }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $issues += 'Install Node.js 20 or newer.' }
else { $nodeVersion = & node --version; if ($nodeVersion -notmatch '^v(\d+)\.' -or [int]$Matches[1] -lt 20) { $issues += 'Upgrade Node.js to 20 or newer.' } }
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) { $issues += 'Install WSL 2 and Ubuntu.' }
else {
    $wslStatus = @()
    try { $wslStatus = & wsl --list --quiet 2>$null } catch {}
    if ($LASTEXITCODE -ne 0 -or -not ($wslStatus -join '').Replace([string][char]0, '').Contains('Ubuntu')) { $issues += 'Install and initialize Ubuntu in WSL 2.' }
}
if ($issues.Count) { $issues | ForEach-Object { Write-Output ('Needs setup: ' + $_) }; exit 1 }
Write-Output 'Basic checks passed. Run setup-vexa.sh inside Ubuntu, then verify transcription health before pairing.'
