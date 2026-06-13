// Native (iOS/Android) fallback. Resolved by Metro on non-web platforms;
// the web implementation lives in engine.web.ts. On-device OCR for native
// (e.g. ML Kit via a dev client) is a follow-up — Expo Go cannot run it.
import { OcrUnavailableError, type OcrEngine, type OcrResult } from './types';

export const ocrEngine: OcrEngine = {
  isSupported: false,
  async recognize(): Promise<OcrResult> {
    throw new OcrUnavailableError();
  },
};
