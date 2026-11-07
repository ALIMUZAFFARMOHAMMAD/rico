param([Parameter(Mandatory=$true)][string]$ConfigPath)
$ErrorActionPreference='Stop'
$config=Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
[IO.Directory]::CreateDirectory($config.outputDirectory) | Out-Null
Write-Host 'Ricomates encrypted local backups'
Write-Host 'Paste the existing asktony Supabase service_role key below. It stays encrypted on this Windows profile.'
Write-Host 'Do not use the anon/publishable key. Input will be hidden. No key is sent to chat or GitHub.'
$secret=Read-Host 'Supabase service_role key' -AsSecureString
if($secret.Length -lt 30){throw 'Key was empty or too short. Nothing was saved.'}
$keyFile=Join-Path $config.outputDirectory 'service-key.dpapi'
$secret | ConvertFrom-SecureString | Set-Content -LiteralPath $keyFile -Encoding UTF8
$config | Add-Member -Force -NotePropertyName credentialFile -NotePropertyValue $keyFile
$config | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
Write-Host 'Key saved with Windows encryption. Testing the first backup now...'
& (Join-Path $PSScriptRoot 'run-encrypted.ps1') -ConfigPath $ConfigPath
Write-Host 'If a verified receipt appeared above, setup is complete.'
