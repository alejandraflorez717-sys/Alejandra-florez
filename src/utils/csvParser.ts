import { SurveyRecord, SurveyValue } from '../types/survey';

function detectDelimiter(headerLine: string): string {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let maxCount = 0;
  for (const delim of candidates) {
    const count = headerLine.split(delim).length - 1;
    if (count > maxCount) {
      maxCount = count;
      best = delim;
    }
  }
  return best;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCell(raw: string): SurveyValue {
  const trimmed = raw.replace(/^"(.*)"$/, '$1').trim();
  if (trimmed === '') return '';

  // Try numeric parsing (supports $, €, spaces, and European comma decimals like "45,50")
  let normalized = trimmed.replace(/[$€£%]/g, '').trim();
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)$/.test(normalized)) {
    // Format like 1.234,56
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d+,\d+$/.test(normalized)) {
    // Format like 48,50
    normalized = normalized.replace(',', '.');
  } else {
    normalized = normalized.replace(/,/g, '');
  }

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const num = Number(normalized);
    if (Number.isFinite(num)) return num;
  }

  return trimmed;
}

export function parseSurveyFileContent(content: string, fileName: string): SurveyRecord[] {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('El archivo está vacío.');
  }

  if (fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.data) ? parsed.data : null;
    if (!arr || arr.length === 0) {
      throw new Error('El archivo JSON debe contener un arreglo de registros.');
    }
    return arr.map((row: Record<string, unknown>, idx: number) => {
      const clean: SurveyRecord = {};
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'number' || typeof v === 'string') {
          clean[k] = typeof v === 'string' ? parseCell(v) : v;
        } else if (typeof v === 'boolean') {
          clean[k] = v ? 'Sí' : 'No';
        } else {
          clean[k] = v == null ? '' : String(v);
        }
      }
      if (!Object.keys(clean).length) {
        clean.id = idx + 1;
      }
      return clean;
    });
  }

  // CSV / TSV parsing
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 3) {
    throw new Error('El archivo CSV debe incluir una fila de encabezados y al menos 2 registros.');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h, i) => {
    const clean = h.replace(/^"(.*)"$/, '$1').trim();
    return clean || `columna_${i + 1}`;
  });

  const records: SurveyRecord[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r], delimiter);
    if (cells.every((c) => c === '')) continue;
    const record: SurveyRecord = {};
    headers.forEach((header, idx) => {
      record[header] = parseCell(cells[idx] ?? '');
    });
    records.push(record);
  }

  if (records.length === 0) {
    throw new Error('No se encontraron registros válidos en el archivo.');
  }

  return records;
}

export function exportSurveyToCsv(records: SurveyRecord[]): string {
  if (records.length === 0) return '';
  const headers = Object.keys(records[0]);
  const escape = (val: SurveyValue) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const headerRow = headers.map(escape).join(',');
  const dataRows = records.map((row) => headers.map((h) => escape(row[h])).join(','));
  return [headerRow, ...dataRows].join('\n');
}
