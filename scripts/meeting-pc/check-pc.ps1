# Run in PowerShell. Read-only preflight; never installs or removes anything.
param([ValidatePattern('^[A-Za-z]
$issues = @()
$free = (Get-PSDrive -Name $StorageDrive).Free
Write-Output ('{0}: free space: {1:N1} GB' -f $StorageDrive, ($free / 1GB))
if ($free -lt 20GB) { $issues += 'Free at least 20 GB on the drive storing Docker/WSL data before continuing.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { $issues += 'Install Docker Desktop and enable WSL 2 / Ubuntu integration.' }
else {
    $dockerState = & docker info --format '{{.OSType}}' 2>$null
    if ($LASTEXITCODE -ne 0 -or $dockerState -ne 'linux') { $issues += 'Start Docker Desktop with Linux containers.' }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $issues += 'Install Node.js 20 or newer.' }
else { $nodeMajor = & node -p 'process.versions.node.split(".")[0]'; if ([int]$nodeMajor -lt 20) { $issues += 'Upgrade Node.js to 20 or newer.' } }
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) { $issues += 'Install WSL 2 and Ubuntu.' }
else { $wslStatus = & wsl --list --quiet 2>$null; if ($LASTEXITCODE -ne 0 -or -not ($wslStatus -join '').Replace([string][char]0, '').Contains('Ubuntu')) { $issues += 'Install and initialize Ubuntu in WSL 2.' } }
if ($issues.Count) { $issues | ForEach-Object { Write-Output ('Needs setup: ' + $_) }; exit 1 }
Write-Output 'Basic checks passed. Run setup-vexa.sh inside Ubuntu, then verify transcription health before pairing.'
)][string]$StorageDrive = 'C')
$ErrorActionPreference = 'Stop'
$issues = @()
$free = (Get-PSDrive -Name C).Free
Write-Output ('C: free space: {0:N1} GB' -f ($free / 1GB))
if ($free -lt 20GB) { $issues += 'Free at least 20 GB on the drive storing Docker/WSL data before continuing.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { $issues += 'Install Docker Desktop and enable WSL 2 / Ubuntu integration.' }
else {
    $dockerState = & docker info --format '{{.OSType}}' 2>$null
    if ($LASTEXITCODE -ne 0 -or $dockerState -ne 'linux') { $issues += 'Start Docker Desktop with Linux containers.' }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $issues += 'Install Node.js 20 or newer.' }
else { $nodeMajor = & node -p 'process.versions.node.split(".")[0]'; if ([int]$nodeMajor -lt 20) { $issues += 'Upgrade Node.js to 20 or newer.' } }
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) { $issues += 'Install WSL 2 and Ubuntu.' }
else { $wslStatus = & wsl --list --quiet 2>$null; if ($LASTEXITCODE -ne 0 -or -not ($wslStatus -join '').Replace([string][char]0, '').Contains('Ubuntu')) { $issues += 'Install and initialize Ubuntu in WSL 2.' } }
if ($issues.Count) { $issues | ForEach-Object { Write-Output ('Needs setup: ' + $_) }; exit 1 }
Write-Output 'Basic checks passed. Run setup-vexa.sh inside Ubuntu, then verify transcription health before pairing.'
