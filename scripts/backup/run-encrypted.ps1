param([Parameter(Mandatory=$true)][string]$ConfigPath,[string]$FixturePath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$config=Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$output=[IO.Path]::GetFullPath($config.outputDirectory)
[IO.Directory]::CreateDirectory($output) | Out-Null
$lock=$null
try {
  $lock=[IO.File]::Open((Join-Path $output 'backup.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
  if ($FixturePath) { $json=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $FixturePath).Path) }
  else {
    if ($config.credentialFile -and (Test-Path -LiteralPath $config.credentialFile)) {
      $secret=Get-Content -LiteralPath $config.credentialFile -Raw | ConvertTo-SecureString
      $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
      try { $env:RICO_BACKUP_SERVICE_KEY=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
      finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    }
    $env:RICO_ENCRYPTED_BACKUP_WRAPPER='1'
    $json=(& $config.nodePath (Join-Path $PSScriptRoot 'collect.cjs') $ConfigPath | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Collection failed; previous backups retained.' }
  }
  $data=$json | ConvertFrom-Json
  if ($data.format -ne 'ricomates-application-data-v2' -or $null -eq $data.tables.conversations) { throw 'Invalid backup format.' }
  $bytes=[Text.Encoding]::UTF8.GetBytes($json)
  $encrypted=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $check=[Security.Cryptography.ProtectedData]::Unprotect($encrypted,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $sha=[Security.Cryptography.SHA256]::Create()
  $hash=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
  if ($hash -ne [BitConverter]::ToString($sha.ComputeHash($check)).Replace('-','').ToLowerInvariant()) { throw 'Encrypted round-trip failed.' }
  $prefix=if($FixturePath){'fixture-'}else{'asktony-'}
  $target=Join-Path $output ($prefix+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssfff')+'.dpapi')
  [IO.File]::WriteAllBytes($target+'.partial',$encrypted)
  [IO.File]::Move($target+'.partial',$target)
  $receipt=@{createdAt=[DateTime]::UtcNow.ToString('o');file=[IO.Path]::GetFileName($target);sha256=$hash;verified=$true;encryptedBytes=$encrypted.Length;conversations=@($data.tables.conversations).Count;careerResults=@($data.tables.career_results).Count;users=@($data.tables.users).Count;photos=@($data.files).Count;encryption='Windows DPAPI CurrentUser';fixture=[bool]$FixturePath;scope=$data.scope}
  $receipt | ConvertTo-Json | Set-Content -LiteralPath ($target+'.receipt.json') -Encoding UTF8
  if (-not $FixturePath) {
    $receipt | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'latest-success.json') -Encoding UTF8
    # Retain 14 verified daily snapshots. Resolve and verify each exact child path.
    $old=Get-ChildItem -LiteralPath $output -Filter 'asktony-*.dpapi' -File | Sort-Object Name -Descending | Select-Object -Skip 14
    foreach($file in $old){
      if ($file.DirectoryName -ne $output -or -not (Test-Path -LiteralPath ($file.FullName+'.receipt.json'))) { throw 'Unsafe retention target.' }
      $prior=Get-Content -LiteralPath ($file.FullName+'.receipt.json') -Raw | ConvertFrom-Json
      if ($prior.verified -ne $true) { continue }
      Remove-Item -LiteralPath $file.FullName
      Remove-Item -LiteralPath ($file.FullName+'.receipt.json')
    }
  }
  $receipt | ConvertTo-Json -Compress
} catch {
  throw 'Encrypted backup failed; previous snapshots were retained. Check login, permissions, snapshot RPC and free disk space. Private source data was not logged.'
} finally {
  if ($lock) { $lock.Dispose() }
  Remove-Item Env:RICO_ENCRYPTED_BACKUP_WRAPPER -ErrorAction SilentlyContinue
  Remove-Item Env:RICO_BACKUP_SERVICE_KEY -ErrorAction SilentlyContinue
}
