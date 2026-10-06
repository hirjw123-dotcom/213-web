import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { minify } from 'terser'; // 플러그인 대신 엔진을 직접 가져옵니다.

// ✅ 특정 파일만 난독화하는 커스텀 플러그인 정의
function minifySpecificFile() {
  return {
    name: 'minify-specific-file',
    apply: 'build',
    async renderChunk(code, chunk) {
      // 파일 이름에 'TabMilitary'가 포함된 경우에만 압축 실행
      if (chunk.fileName.includes('TabMilitary')) {
        try {
          const result = await minify(code, {
            mangle: true, // 변수명 난독화 (a, b 등으로 변경)
            compress: {
              drop_console: true, // console.log 제거
              drop_debugger: true,
            },
            format: {
              comments: false, // 주석 제거
            },
          });
          return {
            code: result.code,
            map: result.map,
          };
        } catch (e) {
          console.error(`Error minifying ${chunk.fileName}:`, e);
        }
      }
      return null; // 다른 파일은 건드리지 않음 (원본 유지)
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [preact()],
  build: {
    target: 'esnext',
    minify: false, // Vite 전역 압축 끄기
    modulePreload: { polyfill: false },
    cssCodeSplit: false,
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      // ✅ 여기서 위에서 만든 커스텀 플러그인을 추가합니다.
      plugins: [minifySpecificFile()],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/style-9tRT3KTz.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});