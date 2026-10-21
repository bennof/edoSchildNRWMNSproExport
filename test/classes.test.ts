import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStudentClasses } from '../src/shared/classes.ts';

test('Ältere Klassen werden einmal pro Abschnitt und ohne Einzelabruf geladen', async () => {
  const calls: string[] = [];
  const get = async <T>(path: string): Promise<T> => {
    calls.push(path);
    assert.equal(path, '/db/gymabi/klassen/details/abschnitt/19');
    return [{ id: 383, kuerzel: '05A', klassenLeitungen: [] }] as T;
  };
  const students = [
    { idKlasse: 1, idSchuljahresabschnittSchueler: 1 },
    { idKlasse: -1, idSchuljahresabschnittSchueler: 1 },
    { idKlasse: 383, idSchuljahresabschnittSchueler: 19 },
    { idKlasse: 383, idSchuljahresabschnittSchueler: 19 }
  ];
  assert.deepEqual(await loadStudentClasses(get, '/db/gymabi', students, [{ id: 1, kuerzel: '01', klassenLeitungen: [] }]), [{ id: 1, kuerzel: '01', klassenLeitungen: [] }, { id: 383, kuerzel: '05A', klassenLeitungen: [] }]);
  assert.equal(calls.length, 1);
});
