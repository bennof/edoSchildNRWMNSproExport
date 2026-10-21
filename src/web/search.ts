import type { CsvRow } from '../shared/types.ts';

/** Sucht alle Begriffe unabhängig von Reihenfolge und Großschreibung. */
export function searchRows(rows: CsvRow[], query: string): CsvRow[] {
  const terms = query.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
  return rows.filter(row => {
    const text = row.slice(1).join(' ').toLocaleLowerCase('de');
    return terms.every(term => text.includes(term));
  });
}
