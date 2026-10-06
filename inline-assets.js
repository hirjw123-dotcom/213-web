import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

function removeComments(code) {
    // 1. 문자열 (", ', `) 패턴: 이 안의 내용은 주석 기호가 있어도 무시해야 함
    // 2. 블록 주석 (/* ... */) 패턴
    // 3. 라인 주석 (// ...) 패턴
    const regex = /("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`)|(\/\*[\s\S]*?\*\/|\/\/.*)/g;

    return code.replace(regex, (match, stringGroup, commentGroup) => {
        // 문자열 그룹이 감지되면(stringGroup이 존재하면) 그대로 반환 (삭제 X)
        if (stringGroup) {
            return stringGroup;
        }
        // 주석 그룹이면 빈 문자열 반환 (삭제 O)
        return "";
    });
}

const DIST_DIR = './dist';
const OUTPUT_FILE = './dist/final.html';

async function buildSingleHtml() {
    console.log('📦 경로 ID 단순화 및 통합 시작...');

    const jsFiles = await glob(`${DIST_DIR}/**/*.js`, { nodir: true });

    jsFiles.sort((a, b) => a.localeCompare(b)); // 안정적 순서 보장 (선택사항)

    let scriptsData = '';
    let entryFile = null;

    // 헬퍼: 파일 경로를 "단순 ID"로 변환
    const getModuleId = (filePath) => {
        let relative = path.relative(DIST_DIR, filePath).replace(/\\/g, '/');
        if (relative.startsWith('/')) relative = relative.substring(1);
        return relative;
    };

    for (const file of jsFiles) {
        console.log('file', file);
        let code = fs.readFileSync(file, 'utf-8');
        const currentModuleId = getModuleId(file);
        const currentFileDir = path.dirname(file);

        // 1. 엔트리 파일(시작점) 찾기 로직 개선
        // index.js 또는 main.js가 있으면 그걸 엔트리로 설정
        if (!entryFile) {
            if (currentModuleId === 'index.js' || currentModuleId === 'main.js') {
                entryFile = currentModuleId;
            }
        } else {
            // 만약 이미 main.js 등을 찾았더라도, index.js가 있다면 그걸 우선순위로 둠 (선택사항)
            if (currentModuleId === 'index.js') entryFile = currentModuleId;
        }

        // 2. import 경로 치환 (상대 경로 -> 단순 ID)
        code = code.replace(/((?:from|import)\s*['"])([.][^'"]+)(['"])/g, (match, prefix, importPath, suffix) => {
            const absolutePath = path.resolve(currentFileDir, importPath);
            let newId = path.relative(DIST_DIR, absolutePath).replace(/\\/g, '/');
            return `${prefix}${newId}${suffix}`;
        });


        scriptsData += `
    <script type="text/plain" id="${currentModuleId}">
        ${code}
    </script>
`;
    }

    // 엔트리 파일을 못 찾았을 경우 대비
    if (!entryFile) {
        console.warn("⚠️ 경고: index.js나 main.js를 찾지 못했습니다. 첫 번째 파일을 엔트리로 사용합니다.");
        entryFile = getModuleId(jsFiles[0]);
    }
    console.log(`🎯 Entry File detected: [${entryFile}]`);

    // CSS 처리
    const cssFiles = await glob(`${DIST_DIR}/**/*.css`);
    let cssStyle = '';
    for (const file of cssFiles) {
        cssStyle += `<style>/* ${path.basename(file)} */\n${fs.readFileSync(file, 'utf-8')}</style>\n`;
    }

    // 3. 부트로더 개선 (상태 로그 추가)
    const bootloader = `
    <script>
      (function() {
        console.log("🚀 Bootloader started...");
        const scripts = document.querySelectorAll('script[type="text/plain"]');
        const importMap = { imports: {} };

        scripts.forEach(script => {
          const code = script.textContent;
          const moduleId = script.id;
          const blob = new Blob([code], { type: 'text/javascript' });
          const url = URL.createObjectURL(blob);
          importMap.imports[moduleId] = url;
        });

        const mapEl = document.createElement('script');
        mapEl.type = "importmap";
        mapEl.textContent = JSON.stringify(importMap);
        document.head.appendChild(mapEl);

        console.log("🗺️ Import Map ready. Total modules:", Object.keys(importMap.imports).length);

        const entry = "${entryFile}";
        
        if(importMap.imports[entry]) {
            console.log("▶️ Executing Entry Point: " + entry);
            import(entry)
                .then(() => console.log("✅ App Loaded Successfully"))
                .catch(e => {
                    console.error("❌ App Crash:", e);
                    document.body.innerHTML += '<h1 style="color:red">ERROR: ' + e.message + '</h1>';
                }); 
        } else {
            console.error("❌ Entry file not found in Map: " + entry);
            console.log("Available keys:", Object.keys(importMap.imports));
        }
      })();
    </script>
  `;

    const finalHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>1대대 홈페이지</title>
    ${cssStyle}
</head>
<body>
    <div id="app"></div>
    ${scriptsData}
    ${bootloader}
</body>
</html>`.replaceAll('\r\n', '\n');

    fs.writeFileSync(OUTPUT_FILE, finalHtml);
    console.log(`✅ Success! Created ${OUTPUT_FILE} (Entry: ${entryFile})`);
}

buildSingleHtml();