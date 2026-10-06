import DB from "./db";

export const plugins = {
    print: (el, opts = {}) => {
        const {
            landscape = false,
            pageSize = 'A4',
            extraPrintCss = '',
        } = opts;

        const w = window.open('', '', 'width=900,height=700');
        if (!w) return;

        // 1) 현재 페이지의 스타일 태그/스타일시트 링크 복사
        const styleTags = Array.from(document.querySelectorAll('style'))
            .map((n) => n.outerHTML)
            .join('\n');

        const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map((n) => n.outerHTML)
            .join('\n');

        // 2) html/body의 클래스/인라인 스타일(테마, CSS 변수)도 유지
        const htmlClass = document.documentElement.className || '';
        const bodyClass = document.body.className || '';
        const htmlStyle = document.documentElement.getAttribute('style') || '';
        const bodyStyle = document.body.getAttribute('style') || '';

        // 3) 상대경로 리소스(이미지/폰트/CSS) 깨짐 방지용 base
        const baseHref = document.baseURI || location.href;

        const pageSizeCss = landscape ? `${pageSize} landscape` : pageSize;

        const printCss = `
          @page { size: ${pageSizeCss}; margin: 0mm; }
          html, body { margin: 0; padding: 0; }

          @media print {
            body { padding: 0; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            a { color: inherit; text-decoration: none; }
          }
          ${extraPrintCss}
        `;

        const html = `<!doctype html>
    <html class="${escapeHtmlAttr(htmlClass)}" style="${escapeHtmlAttr(htmlStyle)}">
    <head>
      <meta charset="utf-8" />
      <title></title>
      <base href="${escapeHtmlAttr(baseHref)}" />
      ${cssLinks}
      ${styleTags}
      <sty${''}le>${printCss}</style>
    </head>
    <body class="${escapeHtmlAttr(bodyClass)}" style="${escapeHtmlAttr(bodyStyle)}">
      ${el.outerHTML}
      <scr${''}ipt>
        (function () {
          function waitForImages() {
            var imgs = Array.prototype.slice.call(document.images || []);
            if (!imgs.length) return Promise.resolve();
            return Promise.all(imgs.map(function(img){
              if (img.complete) return Promise.resolve();
              return new Promise(function(res){ img.onload = img.onerror = function(){ res(); }; });
            }));
          }
    
          function waitForFonts() {
            try {
              return document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
            } catch(e) {
              return Promise.resolve();
            }
          }
    
          Promise.all([waitForImages(), waitForFonts()]).then(function(){
            try { window.focus(); } catch(e) {}
            window.print();
          });
    
          window.onafterprint = function () {
            try { window.close(); } catch(e) {}
          };
        })();
      </scr${''}ipt>
    </body>
    </html>`;

        w.document.open();
        w.document.write(html);
        w.document.close();

        // --- helpers ---
        function escapeHtmlAttr(str) {
            return String(str)
                .replaceAll('&', '&amp;')
                .replaceAll('"', '&quot;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;');
        }
    },
    saveImg: (el) => new Promise(r => {
        const f = el.files[0];
        if (!f) return r(null);
        const rd = new FileReader();
        rd.onload = async (e) => { const id = 'img_' + Date.now(); await DB.save(id, e.target.result); r(id); };
        rd.readAsDataURL(f);
    }),
    getImg: (id) => DB.get(id),
    delImg: (id) => DB.del(id)
};