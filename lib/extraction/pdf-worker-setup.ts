import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

// pdfjs-dist, Node.js'te "fake worker" kurulumu için worker modülünü
// bağıl bir yoldan dinamik import() ile bulmaya çalışır. Next.js/Turbopack
// bu dosyayı farklı bir chunk konumuna taşıdığından bağıl yol kırılır.
// Resmi kaçış yolu: worker modülünü burada önceden yükleyip globalThis
// üzerinden vermek; pdfjs bunu bulunca dinamik import() denemez.
declare global {
  var pdfjsWorker: typeof import("pdfjs-dist/legacy/build/pdf.worker.mjs") | undefined;
}

if (!globalThis.pdfjsWorker) {
  globalThis.pdfjsWorker = pdfjsWorker;
}
