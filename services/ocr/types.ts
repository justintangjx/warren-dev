export interface OcrResult {
  text: string;
}

export interface OcrEngine {
  /** Whether OCR can run on this platform. */
  readonly isSupported: boolean;
  /**
   * Run OCR on an image. `imageUri` may be a data URL, blob URL, or file URI.
   * `onProgress` reports recognition progress in the range 0..1.
   */
  recognize(imageUri: string, onProgress?: (progress: number) => void): Promise<OcrResult>;
}

export class OcrUnavailableError extends Error {
  constructor() {
    super('Receipt scanning is not available on this device yet. Please enter the details manually.');
    this.name = 'OcrUnavailableError';
  }
}
