param([string]$MySQLBin = 'C:\Program Files\MySQL\MySQL Server 8.0\bin')
$ErrorActionPreference = 'Stop'
# Restart only the isolated instance already initialized during this build.
# This script never initializes, resets, or deletes database files.
$taskWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$dataDirectory = Join-Path $taskWorkspace 'work/mysql-data'
$serverExecutable = Join-Path $MySQLBin 'mysqld.exe'
if (!(Test-Path -LiteralPath (Join-Path $dataDirectory 'auto.cnf'))) {
  throw 'The preconfigured workspace database is missing. Follow the README to set up MySQL or Docker.'
}
if (!(Test-Path -LiteralPath $serverExecutable)) { throw 'MySQL executable not found. Pass -MySQLBin with your MySQL bin folder.' }
$connection = New-Object Net.Sockets.TcpClient
try {
  $attempt = $connection.ConnectAsync('127.0.0.1',3308)
  if ($attempt.Wait(1000) -and $connection.Connected) {
    Write-Output 'Port 3308 is already listening. Check /api/health after starting TrialGuard.'
    exit 0
  }
} catch { } finally { $connection.Dispose() }
$baseDirectory = Split-Path $MySQLBin -Parent
$arguments = @('--no-defaults', "--basedir=`"$baseDirectory`"", "--datadir=`"$dataDirectory`"", '--port=3308', '--bind-address=127.0.0.1', '--mysqlx=0', '--console')
$mysqlProcess = Start-Process -FilePath $serverExecutable -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskWorkspace 'work/mysql-stdout.log') -RedirectStandardError (Join-Path $taskWorkspace 'work/mysql-stderr.log')
Write-Output "Workspace MySQL starting on 127.0.0.1:3308 (PID $($mysqlProcess.Id)). Logs are under work/."
