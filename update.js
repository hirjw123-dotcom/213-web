import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import DiffMatchPatch from 'diff-match-patch';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLISH_DIR = path.join(ROOT_DIR, '$publish');
const SAMPLE_DIR = path.join(ROOT_DIR, '$sample');

const INPUTS = {
    previous: path.join(PUBLISH_DIR, 'prev.html'),
    final: path.join(PUBLISH_DIR, 'final.html'),
    compareTemplate: path.join(SAMPLE_DIR, 'code-compare.html'),
    printTemplate: path.join(SAMPLE_DIR, 'print.html'),
};

const OUTPUTS = {
    patch: path.join(PUBLISH_DIR, 'updates.json'),
    verified: path.join(PUBLISH_DIR, 'final.html-비교본'),
    compare: path.join(PUBLISH_DIR, 'compare.html'),
    print: path.join(PUBLISH_DIR, 'print.html'),
};

const BASE32_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DATA_LENGTH_PER_LINE = 57;

function readText(filePath) {
    return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function assertInputsExist() {
    const missing = Object.values(INPUTS).filter((filePath) => !fs.existsSync(filePath));
    if (missing.length === 0) return;

    const list = missing.map((filePath) => `  - ${path.relative(ROOT_DIR, filePath)}`).join('\n');
    throw new Error(`필요한 파일이 없습니다:\n${list}\n먼저 npm run build를 실행하고 $publish/prev.html을 준비하세요.`);
}

function makePatch(previousText, finalText) {
    const dmp = new DiffMatchPatch();
    dmp.Patch_Margin = 2;

    const lineDiff = dmp.diff_linesToChars_(previousText, finalText);
    const diffs = dmp.diff_main(lineDiff.chars1, lineDiff.chars2, false);
    dmp.diff_charsToLines_(diffs, lineDiff.lineArray);
    dmp.diff_cleanupSemantic(diffs);

    const patches = dmp.patch_make(previousText, diffs);
    return JSON.stringify(patches.map((patch) => [
        patch.start1,
        patch.length1,
        patch.start2,
        patch.length2,
        patch.diffs,
    ]));
}

function applyPatch(previousText, patchText) {
    const compactPatches = JSON.parse(patchText);
    const patches = compactPatches.map((data) => {
        const patch = new DiffMatchPatch.patch_obj();
        patch.start1 = data[0];
        patch.length1 = data[1];
        patch.start2 = data[2];
        patch.length2 = data[3];
        patch.diffs = data[4];
        return patch;
    });

    const dmp = new DiffMatchPatch();
    const [updatedText, results] = dmp.patch_apply(patches, previousText);
    const failedCount = results.filter((result) => result === false).length;

    if (failedCount > 0) {
        throw new Error(`${failedCount}개의 업데이트 조각을 prev.html에 적용하지 못했습니다.`);
    }

    return updatedText;
}

function encodeBase32(buffer) {
    let bits = 0;
    let value = 0;
    let output = '';

    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32_MAP[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) output += BASE32_MAP[(value << (5 - bits)) & 31];
    return output;
}

function getChecksum(text) {
    let total = 0;

    for (const character of text) {
        const code = character.charCodeAt(0);
        if (code >= 48 && code <= 57) total += code - 48;
        else if (code >= 65 && code <= 90) total += code - 55;
        else if (code >= 97 && code <= 122) total += code - 87;
    }

    return String(total % 1000)
        .padStart(3, '0')
        .split('')
        .map((digit) => String.fromCharCode(65 + Number(digit)))
        .join('');
}

function encodeForOcr(patchText) {
    const compressed = gzipSync(Buffer.from(patchText, 'utf8'));
    const base32 = encodeBase32(compressed);
    let encodedText = '';

    for (let index = 0; index < base32.length; index += DATA_LENGTH_PER_LINE) {
        const chunk = base32.slice(index, index + DATA_LENGTH_PER_LINE);
        encodedText += chunk + getChecksum(chunk);
    }

    return encodedText;
}

function decodeBase32(text) {
    let bits = 0;
    let value = 0;
    const bytes = [];

    for (const character of text) {
        const index = BASE32_MAP.indexOf(character);
        if (index === -1) throw new Error(`Base32에 사용할 수 없는 문자입니다: ${character}`);

        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return Buffer.from(bytes);
}

function verifyOcrEncoding(encodedText, patchText) {
    let base32 = '';

    for (let index = 0; index < encodedText.length; index += DATA_LENGTH_PER_LINE + 3) {
        const line = encodedText.slice(index, index + DATA_LENGTH_PER_LINE + 3);
        if (line.length < 4) throw new Error('OCR 인코딩의 마지막 줄이 올바르지 않습니다.');

        const chunk = line.slice(0, -3);
        const checksum = line.slice(-3);
        if (getChecksum(chunk) !== checksum) {
            throw new Error(`OCR 인코딩 체크섬 검증에 실패했습니다: ${Math.floor(index / 60) + 1}번째 줄`);
        }
        base32 += chunk;
    }

    const decodedText = gunzipSync(decodeBase32(base32)).toString('utf8');
    if (decodedText !== patchText) throw new Error('OCR 인코딩을 되돌린 결과가 updates.json과 일치하지 않습니다.');
}

function replaceOnce(source, marker, replacement, templateName) {
    const firstIndex = source.indexOf(marker);
    if (firstIndex === -1) throw new Error(`${templateName}에서 데이터 삽입 위치를 찾지 못했습니다.`);
    if (source.indexOf(marker, firstIndex + marker.length) !== -1) {
        throw new Error(`${templateName}의 데이터 삽입 위치가 두 군데 이상입니다.`);
    }
    return source.slice(0, firstIndex) + replacement + source.slice(firstIndex + marker.length);
}

function makeCompareHtml(encodedText) {
    const template = readText(INPUTS.compareTemplate);
    return replaceOnce(
        template,
        '        let originText = "";',
        `        let originText = ${JSON.stringify(encodedText)};`,
        '$sample/code-compare.html',
    );
}

function makePrintHtml(encodedText) {
    const template = readText(INPUTS.printTemplate);
    const marker = [
        '        // 초기 예시 텍스트',
        '        output.textContent = "여기에 내용을 입력하면 미리보기가 표시됩니다.\\n\\n긴 내용을 입력해서 인쇄 버튼을 눌러보세요.\\n모든 페이지의 테두리에 균일한 여백이 생깁니다.";',
    ].join('\n');
    const replacement = [
        '        // npm run update에서 생성한 OCR 전송용 텍스트',
        `        const originText = ${JSON.stringify(encodedText)};`,
        '        textarea.value = originText;',
        '        output.textContent = originText;',
    ].join('\n');

    return replaceOnce(template, marker, replacement, '$sample/print.html');
}

function writeOutputs({ patchText, verifiedText, compareHtml, printHtml }) {
    fs.mkdirSync(PUBLISH_DIR, { recursive: true });
    fs.writeFileSync(OUTPUTS.patch, patchText, 'utf8');
    fs.writeFileSync(OUTPUTS.verified, verifiedText, 'utf8');
    fs.writeFileSync(OUTPUTS.compare, compareHtml, 'utf8');
    fs.writeFileSync(OUTPUTS.print, printHtml, 'utf8');
}

function formatBytes(byteLength) {
    if (byteLength < 1024) return `${byteLength} B`;
    return `${(byteLength / 1024).toFixed(2)} KB`;
}

function run() {
    console.log('업데이트 자료 생성을 시작합니다.');
    assertInputsExist();

    const previousText = readText(INPUTS.previous);
    const finalText = readText(INPUTS.final);

    console.log('1/3 prev.html과 final.html의 JSON 업데이트를 생성합니다.');
    const patchText = makePatch(previousText, finalText);

    console.log('2/3 JSON 업데이트를 prev.html에 다시 적용해 검증합니다.');
    const verifiedText = applyPatch(previousText, patchText);
    if (verifiedText !== finalText) {
        throw new Error('업데이트 적용 결과가 final.html과 일치하지 않습니다. 생성 파일은 저장하지 않았습니다.');
    }

    console.log('3/3 검증된 JSON을 OCR용으로 인코딩하고 HTML 파일을 만듭니다.');
    const encodedText = encodeForOcr(patchText);
    verifyOcrEncoding(encodedText, patchText);
    const compareHtml = makeCompareHtml(encodedText);
    const printHtml = makePrintHtml(encodedText);

    writeOutputs({ patchText, verifiedText, compareHtml, printHtml });

    console.log('완료: 업데이트 적용 결과가 final.html과 정확히 일치합니다.');
    console.log(`  - $publish/updates.json (${formatBytes(Buffer.byteLength(patchText))})`);
    console.log('  - $publish/final.html-비교본');
    console.log('  - $publish/compare.html');
    console.log('  - $publish/print.html (열어서 인쇄하기 버튼만 누르면 됩니다)');
    console.log(`  - OCR 인코딩 길이: ${encodedText.length.toLocaleString()}자`);
}

try {
    run();
} catch (error) {
    console.error(`오류: ${error.message}`);
    process.exitCode = 1;
}
