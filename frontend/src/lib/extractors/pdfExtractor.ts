const MAX_PDF_PAGES = 25;
const MAX_PDF_CHARACTERS = 12000;
const MIN_DIRECT_TEXT_CHARACTERS = 160;
const MAX_OCR_PAGES = 4;
const OCR_SCALE = 1.8;

type OCRWorker = {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text?: string } }>;
};

type PDFPageLike = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: unknown;
  }) => { promise: Promise<unknown> };
  getTextContent: () => Promise<{ items: Array<unknown> }>;
};

type PDFDocumentLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageLike>;
};

let pdfjsPromise: Promise<{ pdfjs: typeof import('pdfjs-dist') }> | null = null;
let ocrWorkerPromise: Promise<OCRWorker> | null = null;

const getPdfJs = async () => {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(
      ([pdfjs, workerModule]) => {
        pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
        return { pdfjs };
      },
    );
  }

  return pdfjsPromise;
};

const getOCRWorker = async (): Promise<OCRWorker> => {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
        logger: () => undefined,
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/tesseract-core.wasm.js',
        langPath: '/tesseract/lang-data',
      });
      return worker as OCRWorker;
    })();
  }

  return ocrWorkerPromise;
};

const loadPDFDocument = async (data: ArrayBuffer): Promise<PDFDocumentLike> => {
  const { pdfjs } = await getPdfJs();
  const document = await pdfjs.getDocument({ data }).promise;
  return document as PDFDocumentLike;
};

const runOCRForPage = async (page: PDFPageLike) => {
  const viewport = page.getViewport({ scale: OCR_SCALE });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas context unavailable for OCR.');
  }

  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  await page.render({ canvas, canvasContext: context, viewport }).promise;

  const worker = await getOCRWorker();
  const result = await worker.recognize(canvas);
  return (result.data.text ?? '').replace(/\s+/g, ' ').trim();
};

const trimForModel = (value: string) => value.slice(0, MAX_PDF_CHARACTERS).trim();

export const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await loadPDFDocument(arrayBuffer);
  let fullText = '';
  const pageLimit = Math.min(pdf.numPages, MAX_PDF_PAGES);

  for (let i = 1; i <= pageLimit; i += 1) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => {
        const entry = item as { str?: unknown };
        return typeof entry.str === 'string' ? entry.str : '';
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    fullText += `${pageText}\n`;
    if (fullText.length >= MAX_PDF_CHARACTERS) {
      break;
    }
  }

  const trimmedText = trimForModel(fullText);
  const wasTrimmed = pdf.numPages > pageLimit || fullText.length > MAX_PDF_CHARACTERS;
  const directTextIsStrong = trimmedText.length >= MIN_DIRECT_TEXT_CHARACTERS;

  if (directTextIsStrong) {
    if (!wasTrimmed) {
      return trimmedText;
    }

    return `${trimmedText}\n\n[PDF truncated for faster local inference: analyzed up to ${pageLimit} pages and ${MAX_PDF_CHARACTERS} characters.]`;
  }

  const ocrPageLimit = Math.min(pdf.numPages, MAX_OCR_PAGES);
  let ocrText = '';

  try {
    for (let i = 1; i <= ocrPageLimit; i += 1) {
      const page = await pdf.getPage(i);
      const pageText = await runOCRForPage(page);
      if (pageText) {
        ocrText += `${pageText}\n`;
      }

      if (ocrText.length >= MAX_PDF_CHARACTERS) {
        break;
      }
    }
  } catch (error) {
    if (trimmedText) {
      return `${trimmedText}\n\n[OCR fallback could not be completed. Continuing with extracted text only.]`;
    }
    throw error;
  }

  const mergedText = trimForModel([trimmedText, ocrText].filter(Boolean).join('\n\n'));
  if (!mergedText) {
    throw new Error('No readable text was found in this PDF, even after OCR.');
  }

  const ocrTrimmed = pdf.numPages > ocrPageLimit || ocrText.length > MAX_PDF_CHARACTERS;
  const ocrNote = `[OCR fallback used for scanned PDF pages: analyzed up to ${ocrPageLimit} pages${
    ocrTrimmed ? ` and ${MAX_PDF_CHARACTERS} characters` : ''
  }.]`;

  return `${mergedText}\n\n${ocrNote}`;
};
