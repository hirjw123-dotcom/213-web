import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module 환경에서 __dirname 사용 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 경로 설정
const SOURCE_FILE = path.join(__dirname, 'dist', 'final.html');
const TARGET_DIR = path.join(__dirname, '$publish');
const TARGET_FILE = path.join(TARGET_DIR, 'final.html');

function copyDist() {
    console.log('🚀 복사 프로세스 시작...');

    // 1. 원본(final.html) 파일 확인
    if (!fs.existsSync(SOURCE_FILE)) {
        console.error(`❌ 오류: '${SOURCE_FILE}' 파일이 없습니다. 먼저 빌드(npm run build)를 실행하세요.`);
        process.exit(1);
    }

    try {
        // 2. 대상 폴더($publish)가 있다면 기존 내용물 전체 삭제 후 새로 생성
        if (fs.existsSync(TARGET_DIR)) {
            console.log(`🗑️  기존 '${TARGET_DIR}' 폴더 내용물 정리 중...`);
            fs.rmSync(TARGET_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TARGET_DIR, { recursive: true });

        // 3. 복사 실행 (dist/final.html -> $publish/final.html)
        console.log(`📂 '${SOURCE_FILE}'을(를) '${TARGET_FILE}'(으)로 복사 중...`);
        fs.copyFileSync(SOURCE_FILE, TARGET_FILE);

        console.log('✅ 복사 완료! $publish 폴더에 final.html만 남겼습니다.');

    } catch (error) {
        console.error('❌ 처리 중 오류 발생:', error);
        process.exit(1);
    }
}

copyDist();