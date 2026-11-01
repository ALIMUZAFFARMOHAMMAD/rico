$ErrorActionPreference = 'Stop'
$researchRoot = 'D:\RicomatesResearch'
$checkout = Join-Path $researchRoot 'MiroFish'
$expectedCommit = '7657031ac01184afe2cb220f5ee3545573b5e843'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Install Git for Windows before preparing MiroFish.' }
New-Item -ItemType Directory -Force -Path $researchRoot | Out-Null
if (-not (Test-Path -LiteralPath $checkout)) {
  New-Item -ItemType Directory -Path $checkout | Out-Null
  & git -C $checkout init
  if ($LASTEXITCODE -ne 0) { throw 'Could not initialize research checkout.' }
  & git -C $checkout remote add origin https://github.com/666ghj/MiroFish.git
  & git -C $checkout fetch --depth 1 origin $expectedCommit
  if ($LASTEXITCODE -ne 0) { throw 'Could not download the pinned MiroFish source.' }
  & git -C $checkout checkout --detach FETCH_HEAD
  if ($LASTEXITCODE -ne 0) { throw 'Could not check out MiroFish.' }
}
$actualCommit = & git -C $checkout rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $actualCommit.Trim() -ne $expectedCommit) { throw 'Existing research folder is not the expected revision. No files were reset.' }
$envPath = Join-Path $checkout '.env'
if (-not (Test-Path -LiteralPath $envPath)) {
  @'
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL_NAME=
ZEP_API_KEY=
'@ | Set-Content -LiteralPath $envPath -Encoding ascii
}
Write-Host 'Prepared original MiroFish. Fill in its local .env, then follow README.txt. No simulation has run.'
Write-Host 'Do not share API keys or put real user data into the research seed.'
