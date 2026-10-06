# ============================================
# ps-http.ps 자동 시작 제거
# Task Scheduler에서 작업을 삭제합니다.
# 관리자 권한으로 실행하세요.
# ============================================

$taskName = "ProxyServer-6324"

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existing) {
    # 실행 중이면 먼저 중지
    if ($existing.State -eq "Running") {
        Stop-ScheduledTask -TaskName $taskName
        Write-Host "Stopped running task." -ForegroundColor Yellow
    }
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "SUCCESS: '$taskName' has been removed from Task Scheduler." -ForegroundColor Green
} else {
    Write-Host "Task '$taskName' not found. Nothing to remove." -ForegroundColor Yellow
}