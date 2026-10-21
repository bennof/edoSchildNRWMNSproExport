import test from 'node:test';
import assert from 'node:assert/strict';
import { searchRows } from '../src/web/search.ts';
import type { CsvRow } from '../src/shared/types.ts';

test('Lehrer und Schüler nach Namen, Klassen und kombinierten Begriffen suchen', () => {
  const rows: CsvRow[] = [
    ['1', 'Doreen', 'Anders', '^05A', ''],
    ['2', 'Max', 'Pferd', 'Q2', 'Q2 - D-GK1']
  ];
  assert.deepEqual(searchRows(rows, ' ANDERS doreen '), [rows[0]]);
  assert.deepEqual(searchRows(rows, '05a'), [rows[0]]);
  assert.deepEqual(searchRows(rows, 'q2 MAX'), [rows[1]]);
  assert.deepEqual(searchRows(rows, 'unbekannt'), []);
  assert.deepEqual(searchRows(rows, '  '), rows);
});
