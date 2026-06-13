// Web OCR via tesseract.js (WASM). Loaded lazily so the model and worker
// are only fetched when the user actually scans a receipt.
import type { OcrEngine, OcrResult } from './types';

export const ocrEngine: OcrEngine = {
  isSupported: true,
  async recognize(imageUri, onProgress): Promise<OcrResult> {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress);
        }
      },
    });
    try {
      const { data } = await worker.recognize(imageUri);
      return { text: data.text };
    } finally {
      await worker.terminate();
    }
  },
};
