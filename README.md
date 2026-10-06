# 213 부대 용사/일정 관리 시스템

## 실행 방법

### 개발 모드
```powershell
npm run dev
```

### 프로덕션 빌드
```powershell
npm run build
```

### 서버 실행
```powershell
.\start.ps1
```

또는 직접 옵션 설정:
```powershell
.\server.ps1 -RootPath ".\dist" -Port 2131 -DataPath ".\data"
```

## API 사용법

### 파일 생성/수정
```javascript
fetch('http://localhost:2131/api/file', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    filename: 'soldiers.json',
    content: JSON.stringify({ data: [] })
  })
})
```

### 파일 읽기
```javascript
fetch('http://localhost:2131/api/file', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'read',
    filename: 'soldiers.json'
  })
})
```

### 파일 삭제
```javascript
fetch('http://localhost:2131/api/file', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'delete',
    filename: 'soldiers.json'
  })
})
```

### 파일 목록 조회
```javascript
fetch('http://localhost:2131/api/files')
```

## 서버 옵션

- `-RootPath`: 정적 파일 제공 경로 (기본값: `.\dist`)
- `-Port`: 서버 포트 (기본값: `2131`)
- `-DataPath`: 데이터 파일 저장 경로 (기본값: `.\data`)
