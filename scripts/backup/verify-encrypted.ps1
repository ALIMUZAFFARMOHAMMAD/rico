param([Parameter(Mandatory=$true)][string]$BackupPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
try {
  $file=(Resolve-Path -LiteralPath $BackupPath).Path
  $receipt=Get-Content -LiteralPath ($file+'.receipt.json') -Raw | ConvertFrom-Json
  $bytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($file),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $sha=[Security.Cryptography.SHA256]::Create()
  $hash=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
  if($hash -ne $receipt.sha256){throw 'Digest mismatch'}
  $data=[Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
  if($data.format -ne 'ricomates-application-data-v2'){throw 'Format mismatch'}
  foreach($photo in $data.files){
    $photoHash=[BitConverter]::ToString($sha.ComputeHash([Convert]::FromBase64String($photo.base64))).Replace('-','').ToLowerInvariant()
    if($photoHash -ne $photo.sha256){throw 'Photo digest mismatch'}
  }
  @{verified=$true;conversations=@($data.tables.conversations).Count;photos=@($data.files).Count;scope=$data.scope} | ConvertTo-Json -Compress
}catch{throw 'Backup verification failed. No decrypted content was logged.'}
