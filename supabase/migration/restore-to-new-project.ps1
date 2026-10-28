# RealRates -> NEW Supabase project (shiftrates, ref ikjzwuapnkyltlktkoyl). Windows PowerShell.
# Writes ONLY to the new project. Refuses to run against the old project or a non-empty database.
# Everything is restored in ONE transaction: if any step fails, nothing is kept.
# Usage (from this folder):  powershell -ExecutionPolicy Bypass -File .\restore-to-new-project.ps1

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetRef = 'ikjzwuapnkyltlktkoyl'
$oldRef = 'qetlynfcssdkmlhpwbug'

$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
$psql = "$pgBin\psql.exe"; $pgRestore = "$pgBin\pg_restore.exe"
if (-not (Test-Path $psql)) { throw "PostgreSQL 17 tools not found in $pgBin." }

# Use the most recent backup folder next to this script
$bk = Get-ChildItem $here -Directory -Filter 'realrates-backup-*' | Sort-Object Name | Select-Object -Last 1
if (-not $bk) { throw 'No realrates-backup-* folder found next to this script.' }
$bk = $bk.FullName
Write-Host "Using backup: $bk"

# 1. Checksums must still match
Get-Content "$bk\SHA256SUMS.txt" | Where-Object { $_ -match '\S' } | ForEach-Object {
  $hash, $name = $_ -split '\s+', 2
  $actual = (Get-FileHash -Algorithm SHA256 (Join-Path $bk $name.Trim())).Hash.ToLower()
  if ($actual -ne $hash) { throw "Checksum mismatch on $name - backup damaged, stopping." }
}
Write-Host 'Checksums OK'

# 2. Build the restore SQL locally (no connection needed). Skips Supabase-managed defaults the new project already has.
$work = Join-Path $bk 'restore-work'
New-Item -ItemType Directory -Force -Path $work | Out-Null
& $pgRestore -f "$work\auth-users.sql" "$bk\auth-users.dump"; if ($LASTEXITCODE) { throw 'Could not read auth-users.dump' }
& $pgRestore -l "$bk\public.dump" | Where-Object { $_ -notmatch 'SCHEMA - public|COMMENT - SCHEMA public|DEFAULT ACL|ACL - SCHEMA public' } |
  Out-File -Encoding ascii "$work\public.list"
& $pgRestore -f "$work\public.sql" -L "$work\public.list" "$bk\public.dump"; if ($LASTEXITCODE) { throw 'Could not read public.dump' }

# 3. Connect to the NEW project
$poolerHost = Read-Host 'NEW project session pooler host (from Connect > Direct > Session pooler)'
$dbUser = "postgres.$targetRef"
if ($dbUser -match $oldRef) { throw 'That is the OLD project. Stopping.' }
$sec = Read-Host 'Database password for the NEW shiftrates project (typing is hidden)' -AsSecureString
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$env:PGSSLMODE = 'require'
$conn = @('--host', $poolerHost, '--port', '5432', '--username', $dbUser, '--dbname', 'postgres')

try {
  # 4. Pre-flight: must be the new, empty project, and we must be allowed to load sign-in accounts
  $pre = & $psql @conn -At -F '|' -c "select (select count(*) from pg_tables where schemaname='public'), (select count(*) from auth.users), has_table_privilege('auth.users','INSERT')::text, has_table_privilege('auth.identities','INSERT')::text"
  if ($LASTEXITCODE -or -not $pre) { throw "Could not log in to the new project (wrong password or host?). Nothing was changed." }
  $tablesNow, $usersNow, $canUsers, $canIdent = "$pre".Trim() -split '\|'
  Write-Host "Pre-flight: public tables=$tablesNow, auth users=$usersNow, can load users=$canUsers/$canIdent"
  if ($tablesNow -ne '0' -or $usersNow -ne '0') { throw 'The new project is not empty. Stopping so nothing is overwritten. Tell Claude.' }
  if ($canUsers -ne 'true' -or $canIdent -ne 'true') { throw 'Not allowed to load sign-in accounts. Nothing was changed. Tell Claude.' }

  # 5. Restore: accounts, then tables/functions/policies/data, then exact function permissions. One transaction.
  & $psql @conn -q -v ON_ERROR_STOP=1 --single-transaction `
      -c 'set session_replication_role = replica' `
      -f "$work\auth-users.sql" -f "$work\public.sql" -f "$bk\function-grants.sql" | Out-Null
  if ($LASTEXITCODE) { throw 'Restore failed and was rolled back - the new project is still empty. Send Claude the error above.' }
  Write-Host 'Restore committed.' -ForegroundColor Green
  # The restore pauses event triggers, so tell the Data API to reload its list of tables/functions.
  & $psql @conn -q -c "notify pgrst, 'reload schema'" | Out-Null

  # 6. Verify: same 17-line inventory as the live project
  & $psql @conn -At -f "$here\inventory.sql" -o "$bk\target-inventory.txt"
  if ($LASTEXITCODE) { throw 'Inventory on new project failed.' }
  $src = Get-Content "$bk\source-inventory.txt" | Where-Object { $_ -match '\S' }
  $dst = Get-Content "$bk\target-inventory.txt" | Where-Object { $_ -match '\S' }
  Write-Host ''; Write-Host 'New project inventory:'; $dst
  $diff = Compare-Object $src $dst
  Write-Host ''
  if ($diff) { Write-Host 'MISMATCH - do not switch the site over. Send Claude everything above.' -ForegroundColor Red; $diff | Format-Table -AutoSize }
  else { Write-Host 'MATCH: new project is identical to the live project on all checks.' -ForegroundColor Green }
  Write-Host 'The old project was not touched.'
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
}
