/**
 * CSV Export utility with Formula Injection protection and proper escaping.
 */

/**
 * Escapes a cell value and neutralizes CSV / Spreadsheet formula injection.
 * Formula characters: '=', '+', '-', '@', '\t', '\r'
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Formula injection check: if cell starts with dangerous formula prefixes, neutralize with a leading single quote
  const formulaPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaPrefixes.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // If string contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates CSV string from headers and data rows. Includes UTF-8 BOM.
 */
export function generateCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const BOM = '\uFEFF';
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(sanitizeCsvCell).join(','));
  return BOM + [headerLine, ...rowLines].join('\r\n');
}
