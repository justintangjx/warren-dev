import { parseReceiptText } from './receipt-parser';

const BEST_BUY_RECEIPT = `
BEST BUY #1432
1717 Harrison St
San Francisco CA 94103
Tel: (415) 555-0192

SAMSUNG QN65Q80B 65" QLED TV    1,299.99
HDMI CABLE 6FT                      19.99

SUBTOTAL                         1,319.98
TAX                                115.50
TOTAL                            1,435.48

VISA ************1234
01/15/2025 14:32
Thank you for shopping at Best Buy!
`;

const COURTS_RECEIPT = `
COURTS (Singapore) Pte Ltd
Tampines Mall #03-11
GST Reg No: M2-0089765-3

Date: 03/02/2024
Dyson V15 Detect Vacuum Cleaner
SV22                          S$949.00

Sub-Total                     S$949.00
GST 9%                        S$78.36
TOTAL                         S$949.00
`;

const PLAIN_RECEIPT = `
Tan Electronics
15 Jan 2025

Philips Hue Light Bulb x2    49.90
Total                        49.90
`;

describe('parseReceiptText', () => {
  describe('retailer', () => {
    it('matches a known retailer near the top', () => {
      expect(parseReceiptText(BEST_BUY_RECEIPT).retailer).toBe('Best Buy');
      expect(parseReceiptText(COURTS_RECEIPT).retailer).toBe('Courts');
    });

    it('falls back to the first headline-ish line for unknown shops', () => {
      expect(parseReceiptText(PLAIN_RECEIPT).retailer).toBe('Tan Electronics');
    });

    it('returns null for empty text', () => {
      expect(parseReceiptText('').retailer).toBeNull();
    });
  });

  describe('purchase date', () => {
    it('parses MM/DD/YYYY when day-first is impossible', () => {
      // 01/15/2025: 15 cannot be a month, so it must be Jan 15.
      expect(parseReceiptText(BEST_BUY_RECEIPT).purchaseDate).toBe('2025-01-15');
    });

    it('prefers a line labelled "Date" and reads day-first for ambiguous dates', () => {
      expect(parseReceiptText(COURTS_RECEIPT).purchaseDate).toBe('2024-02-03');
    });

    it('parses "15 Jan 2025" style dates', () => {
      expect(parseReceiptText(PLAIN_RECEIPT).purchaseDate).toBe('2025-01-15');
    });

    it('parses ISO dates', () => {
      expect(parseReceiptText('Date: 2024-11-30\nTotal 10.00').purchaseDate).toBe('2024-11-30');
    });

    it('parses 2-digit years', () => {
      expect(parseReceiptText('Date: 15/01/25').purchaseDate).toBe('2025-01-15');
      expect(parseReceiptText('15 Jan 25').purchaseDate).toBe('2025-01-15');
    });

    it('rejects future and impossible dates', () => {
      expect(parseReceiptText('Date: 2099-01-01').purchaseDate).toBeNull();
      expect(parseReceiptText('Date: 2024-13-45').purchaseDate).toBeNull();
    });
  });

  describe('total', () => {
    it('reads the grand total, not the subtotal', () => {
      expect(parseReceiptText(BEST_BUY_RECEIPT).totalCents).toBe(143548);
    });

    it('handles currency prefixes and ignores Sub-Total lines', () => {
      expect(parseReceiptText(COURTS_RECEIPT).totalCents).toBe(94900);
    });

    it('falls back to the largest amount when no total line exists', () => {
      const text = 'Shop\nItem A 12.00\nItem B 89.50\nItem C 5.00';
      expect(parseReceiptText(text).totalCents).toBe(8950);
    });

    it('returns null when no amounts are present', () => {
      expect(parseReceiptText('Shop\nNo prices here').totalCents).toBeNull();
    });
  });

  describe('brand and product type', () => {
    it('detects a known brand case-insensitively', () => {
      expect(parseReceiptText(BEST_BUY_RECEIPT).brand).toBe('Samsung');
      expect(parseReceiptText(COURTS_RECEIPT).brand).toBe('Dyson');
    });

    it('detects the product type from keywords', () => {
      expect(parseReceiptText(BEST_BUY_RECEIPT).productType).toBe('television');
      expect(parseReceiptText(COURTS_RECEIPT).productType).toBe('home_appliance');
      expect(parseReceiptText(PLAIN_RECEIPT).productType).toBe('lighting');
    });

    it('returns nulls when nothing matches', () => {
      const parsed = parseReceiptText('Mystery Shop\nUnbranded widget 9.99');
      expect(parsed.brand).toBeNull();
      expect(parsed.productType).toBeNull();
      expect(parsed.modelNumber).toBeNull();
    });
  });

  describe('model number', () => {
    it('extracts an alphanumeric model token from the product line', () => {
      expect(parseReceiptText(BEST_BUY_RECEIPT).modelNumber).toBe('QN65Q80B');
    });

    it('extracts short models and searches across multiple lines', () => {
      expect(parseReceiptText(COURTS_RECEIPT).modelNumber).toBe('V15');
    });
  });
});
