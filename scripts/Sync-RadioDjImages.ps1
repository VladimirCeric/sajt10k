[CmdletBinding(SupportsShouldProcess=$true)]
param(
  [string]$LocalRoot = 'C:\RadioDJv2\Images',
  [string]$RemoteUser,
  [string]$RemoteHost,
  [string]$RemoteRoot = '/opt/radio10k-cms/uploads/radiodj',
  [string]$SshKey = '',
  [string]$Password = '',
  [string]$HostKey = '',
  [string]$LogPath = '.\radiodj-sync.log'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Log {
  param([string]$Message)
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Write-Host $line
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
}

function Quote-BashDouble {
  param([string]$Value)
  $v = $Value -replace '\\','\\\\'
  $v = $v -replace '"','\"'
  $v = $v -replace '\$','\\$'
  return '"' + $v + '"'
}

if (-not $RemoteUser -or -not $RemoteHost) {
  throw 'Pass -RemoteUser and -RemoteHost (example: -RemoteUser srvadmin -RemoteHost 10k.viser.edu.rs).'
}
if (-not (Test-Path -LiteralPath $LocalRoot)) {
  throw "Local folder not found: $LocalRoot"
}

$usePassword = -not [string]::IsNullOrWhiteSpace($Password)
$sshArgsBase = @()
$scpArgsBase = @()
$scpNeedsDoubleDash = $true

if ($usePassword) {
  $plinkCmd = Get-Command plink -ErrorAction SilentlyContinue
  $pscpCmd = Get-Command pscp -ErrorAction SilentlyContinue
  if (-not $plinkCmd -or -not $pscpCmd) {
    throw 'Password mode requires PuTTY tools (plink.exe and pscp.exe) in PATH.'
  }
  $sshExe = $plinkCmd.Path
  $scpExe = $pscpCmd.Path
  $sshArgsBase += @('-ssh','-batch','-no-antispoof','-pw',$Password)
  $scpArgsBase += @('-batch','-pw',$Password)
  if ($HostKey) { $sshArgsBase += @('-hostkey',$HostKey); $scpArgsBase += @('-hostkey',$HostKey) }
  $scpNeedsDoubleDash = $false
} else {
  $sshCmd = Get-Command ssh -ErrorAction SilentlyContinue
  $scpCmd = Get-Command scp -ErrorAction SilentlyContinue
  if (-not $sshCmd -or -not $scpCmd) {
    throw 'OpenSSH ssh/scp not found. Enable OpenSSH Client in Windows Features.'
  }
  $sshExe = $sshCmd.Path
  $scpExe = $scpCmd.Path
  if ($SshKey) { $sshArgsBase += @('-i', $SshKey); $scpArgsBase += @('-i', $SshKey) }
  if ($HostKey) { $sshArgsBase += @('-o', "HostKeyAlgorithms=+ssh-ed25519", '-o', "StrictHostKeyChecking=yes", '-o', "UserKnownHostsFile=$env:USERPROFILE\.ssh\known_hosts") }
  else { $sshArgsBase += @('-o', 'StrictHostKeyChecking=accept-new') }
  $sshArgsBase += @('-o', 'BatchMode=yes')
  $scpArgsBase += @('-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new')
}

$localRootResolved = (Resolve-Path -LiteralPath $LocalRoot).Path.TrimEnd('\','/')
$images = Get-ChildItem -LiteralPath $localRootResolved -File -Recurse |
  Where-Object { $_.Extension -match '^(?i)\.(jpg|jpeg|png|webp)$' }

if (-not $images) {
  Write-Log "No images found in: $localRootResolved"
  exit 0
}

Write-Log "Start sync: $($images.Count) local images"

# Read remote file list once (much faster and avoids per-file quote issues).
$scanCmd = 'find ' + (Quote-BashDouble $RemoteRoot) + ' -type f -print 2>/dev/null'
$remoteLines = (& $sshExe @sshArgsBase "$RemoteUser@$RemoteHost" $scanCmd 2>$null)
$remoteSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($line in $remoteLines) {
  $p = [string]$line
  if (-not [string]::IsNullOrWhiteSpace($p)) { [void]$remoteSet.Add($p.Trim()) }
}

[int]$checked = 0
[int]$uploaded = 0
[int]$skipped = 0
[int]$failed = 0

foreach ($file in $images) {
  $checked++
  $relative = $file.FullName.Substring($localRootResolved.Length).TrimStart('\','/')
  $remoteRel = $relative -replace '\\', '/'
  $remoteFile = "$RemoteRoot/$remoteRel"
  $remoteDir = [System.IO.Path]::GetDirectoryName($remoteFile).Replace('\\','/')

  if ($remoteSet.Contains($remoteFile)) {
    $skipped++
    Write-Log "SKIP  $remoteRel"
    continue
  }

  if ($PSCmdlet.ShouldProcess($remoteFile, 'Upload missing image')) {
    $mkdirCmd = 'mkdir -p ' + (Quote-BashDouble $remoteDir)
    & $sshExe @sshArgsBase "$RemoteUser@$RemoteHost" $mkdirCmd 2>$null
    if ($LASTEXITCODE -ne 0) {
      $failed++
      Write-Log "FAIL mkdir $remoteDir"
      continue
    }

    $remoteSpec = "${RemoteUser}@${RemoteHost}:$remoteFile"
    if ($scpNeedsDoubleDash) {
      & $scpExe @scpArgsBase -- $file.FullName $remoteSpec
    } else {
      & $scpExe @scpArgsBase $file.FullName $remoteSpec
    }

    if ($LASTEXITCODE -eq 0) {
      $uploaded++
      Write-Log "PUT   $remoteRel"
      [void]$remoteSet.Add($remoteFile)
    } else {
      $failed++
      Write-Log "FAIL  $remoteRel"
    }
  }
}

Write-Log "Done checked=$checked uploaded=$uploaded skipped=$skipped failed=$failed"
if ($failed -gt 0) { exit 2 }

