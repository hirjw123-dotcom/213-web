# ============================================
# ps-http.ps 자동 시작 등록 (Windows 시작 시)
# Task Scheduler에 등록합니다.
# 관리자 권한으로 실행하세요.
# ============================================

$taskName = "ProxyServer-6324"
$scriptPath = Join-Path $PSScriptRoot "ps-http.ps"

# 스크립트 파일 존재 확인
if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: ps-http.ps not found at $scriptPath" -ForegroundColor Red
    exit 1
}

# 이미 등록된 작업이 있으면 알림
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Task '$taskName' already exists. Removing and re-creating..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# 작업 생성
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

# 1. SYSTEM 계정으로 실행하기 위한 권한(Principal) 설정 객체 추가
$principal = New-ScheduledTaskPrincipal `
    -UserId "NT AUTHORITY\SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

# 2. Register-ScheduledTask 부분 수정 (기존 -RunLevel Highest를 빼고 -Principal 추가)
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "HTTP Proxy Server on port 6324 (auto-start)" | Out-Null

Write-Host "SUCCESS: '$taskName' registered. Proxy will start at logon." -ForegroundColor Green
Write-Host "Script: $scriptPath" -ForegroundColor Cyan