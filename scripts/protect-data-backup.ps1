param([Parameter(Mandatory=$true)][string]$CsvPath,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$sourcePath = (Resolve-Path -LiteralPath $CsvPath).Path
$rows = @(Import-Csv -LiteralPath $sourcePath)
if ($rows.Count -ne 1 -or -not $rows[0].backup) { throw 'Expected the single-row Ricomates application export.' }
$json = $rows[0].backup
$data = $json | ConvertFrom-Json
if ($data.format -ne 'ricomates-application-data-v1') { throw 'Unexpected backup format.' }
$bytes = [Text.Encoding]::UTF8.GetBytes($json)
$encrypted = [Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$check = [Security.Cryptography.ProtectedData]::Unprotect($encrypted,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$sha = [Security.Cryptography.SHA256]::Create()
$before = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
$after = [BitConverter]::ToString($sha.ComputeHash($check)).Replace('-','').ToLowerInvariant()
if ($before -ne $after) { throw 'Encrypted backup round-trip verification failed.' }
[IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$target = Join-Path $OutputDirectory ('asktony-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '.dpapi')
[IO.File]::WriteAllBytes($target,$encrypted)
$receipt = @{ format=$data.format; createdAt=$data.created_at; encryptedFile=$target; encryptedBytes=$encrypted.Length; sha256=$before; users=@($data.users).Count; conversations=@($data.conversations).Count; careerResults=@($data.career_results).Count; encryption='Windows DPAPI CurrentUser'; verified=$true; scope='Application records only; excludes Clerk authentication, Supabase project settings and storage objects'; recoveryRequirement='This Windows user profile is required to decrypt; retain access to the profile.' }
$receipt | ConvertTo-Json | Set-Content -LiteralPath ($target + '.receipt.json') -Encoding UTF8
$receipt | ConvertTo-Json
