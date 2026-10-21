import type { JsonGetter, Student, SchoolClass } from './types.ts';
// Abschnittslisten nutzen dieselben Leserechte wie der reguläre Klassenabruf.
export async function loadStudentClasses(get: JsonGetter, root: string, students: Pick<Student, 'idKlasse' | 'idSchuljahresabschnittSchueler'>[], classes: SchoolClass[]) {
  const byId = new Map(classes.map(c => [c.id, c]));
  const missing = students.filter(s => s.idKlasse >= 0 && !byId.has(s.idKlasse));
  const sections = [...new Set(missing.map(s => s.idSchuljahresabschnittSchueler))];
  const extra = await Promise.all(sections.map(id => {
    if (!Number.isInteger(id) || id < 0) throw new Error('Schuljahresabschnitt für fehlende Klasse unbekannt.');
    return get<SchoolClass[]>(`${root}/klassen/details/abschnitt/${id}`);
  }));
  for (const c of extra.flat()) byId.set(c.id, c);
  for (const s of missing) {
    if (!byId.has(s.idKlasse)) throw new Error(`Klasse ${s.idKlasse} fehlt im Schuljahresabschnitt ${s.idSchuljahresabschnittSchueler}.`);
  }
  return [...byId.values()];
}
