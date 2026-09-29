export type CsvValue = string | number | boolean | null | undefined;

export function escapeCsvField(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildCsv(headers: string[], rows: CsvValue[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\r\n");
}

export function sanitizeCsvFilenamePart(value: string, fallback: string): string {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  return sanitized || fallback;
}

export function buildRequestsCsvFilename(projectName: string, range: string): string {
  const project = sanitizeCsvFilenamePart(projectName, "project");
  const safeRange = sanitizeCsvFilenamePart(range, "range");
  return `inflowapm-requests-${project}-${safeRange}.csv`;
}
