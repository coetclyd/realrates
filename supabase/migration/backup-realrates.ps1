# RealRates backup - READ-ONLY against the live project. Windows PowerShell.
# Based on ChatGPT's backup-realrates.sh, with three fixes found in a restore rehearsal:
#   1. Keeps permissions (no --no-acl). Without them the admin-only merge function became callable by anyone.
#   2. Saves sign-in accounts as a data-only dump of auth.users + auth.identities, restorable in the right order.
#   3. Saves the exact function permissions and a source inventory to compare against after restore.
# Nothing in here writes to, pauses or changes the live database.
# Usage (from this folder):  powershell -ExecutionPolicy Bypass -File .\backup-realrates.ps1

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# Find PostgreSQL 17 client tools
$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
if (-not (Test-Path "$pgBin\pg_dump.exe")) { throw "PostgreSQL 17 tools not found in $pgBin. Install them first (see the instructions)." }
$pgDump = "$pgBin\pg_dump.exe"; $pgRestore = "$pgBin\pg_restore.exe"; $psql = "$pgBin\psql.exe"
$ver = & $pgDump --version
if ($ver -notmatch ' 17\.') { throw "Need pg_dump 17, found: $ver" }

# Connection: Session pooler details from Supabase > Connect (project qetlynfcssdkmlhpwbug only)
$poolerHost = Read-Host 'Session pooler host (e.g. aws-0-eu-west-1.pooler.supabase.com)'
$dbUser = 'postgres.qetlynfcssdkmlhpwbug'
$sec = Read-Host 'Database password for the OLD RealRates project (typing is hidden)' -AsSecureString
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$env:PGSSLMODE = 'require'
$conn = @('--host', $poolerHost, '--port', '5432', '--username', $dbUser, '--dbname', 'postgres')

try {
  # Safety check: refuse to run against anything other than RealRates
  $tables = & $psql @conn -At -c "select string_agg(tablename, ',' order by tablename) from pg_tables where schemaname='public'"
  if ($LASTEXITCODE -or -not $tables) { throw "Could not log in (wrong password or host?). Nothing was backed up or changed. Don't retry more than twice - Supabase blocks repeated failed logins for a while." }
  $tables = "$tables".Trim()
  if ($tables -notmatch 'rate_reports' -or $tables -notmatch 'companies') { throw "This doesn't look like the RealRates database (tables: $tables). Stopping." }

  $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
  $out = Join-Path $here "realrates-backup-$stamp"
  New-Item -ItemType Directory -Path $out | Out-Null
  Write-Host "Backing up to $out"

  & $pgDump @conn -Fc --no-owner --schema=public --file="$out\public.dump";                                   if ($LASTEXITCODE) { throw 'public dump failed' }
  & $pgDump @conn -Fc --no-owner --data-only --table=auth.users --table=auth.identities --file="$out\auth-users.dump"; if ($LASTEXITCODE) { throw 'auth users dump failed' }
  # Extra reference copy of the whole auth schema. Supabase may deny reading some internal auth tables;
  # that's fine (not needed for restore), so this one only warns.
  & $pgDump @conn -Fc --no-owner --schema=auth --file="$out\auth-archive.dump"
  if ($LASTEXITCODE) { Write-Warning 'Full auth archive not permitted (optional extra) - continuing.'; Remove-Item "$out\auth-archive.dump" -ErrorAction SilentlyContinue }
  & $psql @conn -At -f "$here\export-function-grants.sql" -o "$out\function-grants.sql";                        if ($LASTEXITCODE) { throw 'grant export failed' }
  & $psql @conn -At -f "$here\inventory.sql" -o "$out\source-inventory.txt";                                    if ($LASTEXITCODE) { throw 'inventory failed' }

  Get-ChildItem "$out\*.dump" | ForEach-Object {
    & $pgRestore --list $_.FullName | Out-File -Encoding ascii "$($_.FullName).toc"
    if ($LASTEXITCODE) { throw "Archive unreadable: $($_.Name)" }
  }
  Get-ChildItem $out -File | Where-Object Name -ne 'SHA256SUMS.txt' | Get-FileHash -Algorithm SHA256 |
    ForEach-Object { "$($_.Hash.ToLower())  $(Split-Path -Leaf $_.Path)" } | Out-File -Encoding ascii "$out\SHA256SUMS.txt"

@"
CONFIDENTIAL BACKUP of RealRates (Supabase project qetlynfcssdkmlhpwbug), taken $stamp UTC.
Contains email addresses of sign-in accounts. Do not commit to GitHub or upload anywhere public.
Archives are readable and checksummed. This is NOT proof of a successful restore: a restore drill must pass first.
Not included (recreate by hand in the new project): Auth URL settings, email templates, SMTP, API keys.
"@ | Out-File -Encoding ascii "$out\IMPORTANT.txt"

  Write-Host ''
  Write-Host 'Source inventory:'; Get-Content "$out\source-inventory.txt"
  Write-Host ''
  Write-Host "DONE. Backup folder: $out" -ForegroundColor Green
  Write-Host 'Nothing on the live project was changed.'
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
