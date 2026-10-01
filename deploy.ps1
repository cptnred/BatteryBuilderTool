<#
.SYNOPSIS
  Baut den Akku-Konfigurator und lädt ihn per cwRsync nach https://apps.pev-point.de/battery/ hoch.

.DESCRIPTION
  Ablauf: Tests -> Lint -> Build -> rsync. Das Ziel "battery/" ist fest eingetragen, damit
  --delete nie andere Apps im Webroot erwischen kann.

  cwRsync-Ordner: Parameter -CwRsync, sonst $env:CWRSYNC_HOME, sonst C:\Tools\cwrsync.

.EXAMPLE
  .\deploy.ps1 -DryRun      # zeigt nur, was übertragen/gelöscht würde
  .\deploy.ps1              # echtes Deployment
#>
param(
  [string]$CwRsync = $(if ($env:CWRSYNC_HOME) { $env:CWRSYNC_HOME } else { 'C:\Tools\cwrsync' }),
  [string]$Key = (Join-Path $HOME '.ssh\id_ed25519'),
  [switch]$DryRun,
  [switch]$SkipChecks
)

$ErrorActionPreference = 'Stop'

$RemoteHost = 'deploy-apps@apps.pev-point.de'
$RemoteDir = 'battery/'   # NIE leer lassen: --delete würde sonst alle Apps löschen

function ConvertTo-CygPath([string]$path) {
  $full = [System.IO.Path]::GetFullPath($path)
  '/cygdrive/' + $full.Substring(0, 1).ToLower() + $full.Substring(2).Replace('\', '/')
}

$rsync = Join-Path $CwRsync 'bin\rsync.exe'
$ssh = Join-Path $CwRsync 'bin\ssh.exe'
if (-not (Test-Path $rsync) -or -not (Test-Path $ssh)) {
  throw "cwRsync nicht gefunden unter '$CwRsync' (erwartet bin\rsync.exe und bin\ssh.exe)."
}
if (-not (Test-Path $Key)) {
  throw "SSH-Schlüssel '$Key' fehlt. Erzeugen mit: ssh-keygen -t ed25519"
}

Push-Location $PSScriptRoot
try {
  if (-not $SkipChecks) {
    npm test; if ($LASTEXITCODE) { throw 'Tests fehlgeschlagen.' }
    npm run lint; if ($LASTEXITCODE) { throw 'Lint fehlgeschlagen.' }
  }
  npm run build; if ($LASTEXITCODE) { throw 'Build fehlgeschlagen.' }
  if (-not (Test-Path 'dist\index.html')) { throw 'dist\index.html fehlt nach dem Build.' }

  # cwRsync-DLLs müssen im PATH liegen; eigene ssh-Config (-F none) für reproduzierbares Verhalten
  $env:PATH = (Join-Path $CwRsync 'bin') + ';' + $env:PATH
  $sshCmd = "'$(ConvertTo-CygPath $ssh)' -F none -i '$(ConvertTo-CygPath $Key)'" +
    " -o IdentitiesOnly=yes -o UserKnownHostsFile='$(ConvertTo-CygPath (Join-Path $HOME '.ssh\known_hosts'))'"

  # -rlt statt -a: Besitzer/Gruppe kann der Deploy-Benutzer nicht setzen;
  # --chmod sorgt für lesbare Rechte statt der aus Windows-ACLs abgeleiteten
  $rsyncArgs = @('-rltvz', '--delete', '--chmod=D755,F644', '-e', $sshCmd)
  if ($DryRun) { $rsyncArgs += '--dry-run' }
  $rsyncArgs += @('dist/', "${RemoteHost}:$RemoteDir")

  & $rsync @rsyncArgs
  if ($LASTEXITCODE) { throw "rsync fehlgeschlagen (Exit $LASTEXITCODE)." }

  if ($DryRun) { Write-Host 'Probelauf beendet, nichts übertragen.' -ForegroundColor Yellow }
  else { Write-Host 'Live: https://apps.pev-point.de/battery/' -ForegroundColor Green }
}
finally {
  Pop-Location
}
