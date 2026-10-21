import test from 'node:test';
import assert from 'node:assert/strict';
import { csv, referenceId, studentRows, teacherRows } from '../src/shared/export.ts';

test('CSV erhält BOM, CRLF, leere Felder und korrektes Quoting', () => {
  assert.equal(csv([['Änne', 'a;b', '"x"', '', 'a\nb']]),
    '\uFEFFÄnne;"a;b";"""x""";;"a\nb"\r\n');
});

test('Lehrerexport prüft Aktivstatus unabhängig von Kursen und berücksichtigt weitere Lehrer', () => {
  const teachers = [
    { id: 1, vorname: 'Ohne', nachname: 'Kurs', istAktiv: true, istSichtbar: true },
    { id: 2, vorname: 'Nicht', nachname: 'Aktiv', istAktiv: false, istSichtbar: true },
    { id: 3, vorname: 'Mit', nachname: 'Kurs', istAktiv: true, istSichtbar: true }
  ];
  const rows = teacherRows('a', teachers,
    [{ id: 3, kuerzel: 'Q2', klassenLeitungen: [1] }],
    [{ id: 7, kuerzel: 'D-GK1', idJahrgaenge: [5], lehrer: 2, weitereLehrer: [{ idLehrer: 3 }] }],
    [{ id: 5, kuerzel: 'Q2' }]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[1].slice(1), ['Ohne', 'Kurs', '^Q2', '']);
  assert.deepEqual(rows[2].slice(1), ['Mit', 'Kurs', '', 'Q2 - D-GK1']);
  assert.notEqual(rows[1][0], referenceId('a', 1));
});
test('Referenzen bleiben stabil und unterscheiden Schema und Schüler', () => {
  assert.equal(referenceId('a', 1), referenceId('a', 1));
  assert.notEqual(referenceId('a', 1), referenceId('b', 1));
  assert.notEqual(referenceId('a', 1), referenceId('a', 2));
  assert.match(referenceId('a', 1), /^\{[A-F0-9]{8}-[A-F0-9]{4}-5[A-F0-9]{3}-[89AB][A-F0-9]{3}-[A-F0-9]{12}\}$/);
});
test('Klassen und Gruppen werden über IDs aufgelöst; fehlende Kurse brechen ab', () => {
  const students = [{ id: 1, vorname: 'Max', nachname: 'Test', idKlasse: 3, status: 2, idSchuljahresabschnittSchueler: 1, kurse: [4, 4] }];
  const classes = [{ id: 3, kuerzel: 'Q2', klassenLeitungen: [] }];
  const courses = [{ id: 4, lehrer: null, weitereLehrer: [], kuerzel: 'D-GK1', idJahrgaenge: [5] }];
  const years = [{ id: 5, kuerzel: 'Q2' }];
  assert.deepEqual(studentRows('a', students, classes, courses, years)[1].slice(1),
    ['Max', 'Test', 'Q2', 'Q2 - D-GK1']);
  assert.throws(() => studentRows('a', students, classes, [], years), /Kurs 4 fehlt/);
});

 test('Standard filtert unsichtbare und inaktive Lehrer; allStatus übernimmt alle', () => {
  const teachers = [
    { id: 1, vorname: 'Test', nachname: 'Name', istAktiv: true, istSichtbar: true },
    { id: 2, vorname: 'Test', nachname: 'Name', istAktiv: true, istSichtbar: false },
    { id: 3, vorname: 'Test', nachname: 'Name', istAktiv: false, istSichtbar: true },
    { id: 4, vorname: 'Test', nachname: 'Name', istAktiv: false, istSichtbar: false }
  ];
  assert.equal(teacherRows('a', teachers, [], [], []).length, 2);
  const all = teacherRows('a', teachers, [], [], [], { allStatus: true });
  assert.equal(all.length, 5);
  assert.deepEqual(all.slice(1).map(row => row[0]), teachers.map(t => referenceId('a', t.id, 'lehrer')));
});
