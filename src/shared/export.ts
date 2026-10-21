import type { Student, Teacher, SchoolClass, Course, Year, CsvRow } from './types.ts';
import { v5 as uuidv5 } from 'uuid';

export function referenceId(schema: string, id: number, type = 'schueler') {
  return `{${uuidv5(`svws:${schema}:${type}:${id}`, uuidv5.DNS).toUpperCase()}}`;
}

export function csv(rows: readonly (readonly unknown[])[]) {
  const cell = (value: unknown) => {
    const s = String(value ?? '');
    return /[;"\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n') + '\r\n';
}

export function studentRows(schema: string, students: Student[], classes: SchoolClass[], courses: Course[], years: Year[]): CsvRow[] {
  const byId = <T extends { id: number }>(list: T[]) => new Map(list.map(item => [item.id, item]));
  const classMap = byId(classes), courseMap = byId(courses), yearMap = byId(years);
  return [
    ['ReferenzId', 'Vorname', 'Nachname', 'Klasse', 'Gruppen'],
    ...students.map((s): CsvRow => {
      const klasse = classMap.get(s.idKlasse);
      if (s.idKlasse >= 0 && !klasse) throw new Error(`Klasse ${s.idKlasse} fehlt (Schüler ${s.id}).`);
      const groups = (s.kurse ?? []).map(id => {
        const course = courseMap.get(id);
        if (!course) throw new Error(`Kurs ${id} fehlt (Schüler ${s.id}).`);
        const prefix = course.idJahrgaenge.map(id => {
          const year = yearMap.get(id);
          if (!year) throw new Error(`Jahrgang ${id} fehlt (Kurs ${course.id}).`);
          return year.kuerzel;
        }).join('/');
        return prefix ? `${prefix} - ${course.kuerzel}` : course.kuerzel;
      });
      return [referenceId(schema, s.id), s.vorname, s.nachname,
        klasse?.kuerzel ?? '', [...new Set(groups)].sort().join('|')];
    })
  ];
}

export function teacherRows(schema: string, teachers: Teacher[], classes: SchoolClass[], courses: Course[], years: Year[], { allStatus = false } = {}): CsvRow[] {
  const yearMap = new Map(years.map(year => [year.id, year]));
  return [
    ['ReferenzId', 'Vorname', 'Nachname', 'Klassen', 'Gruppen'],
    ...teachers.filter(t => allStatus || (t.istAktiv === true && t.istSichtbar === true)).sort((a, b) => a.id - b.id).map((t): CsvRow => {
      const ledClasses = classes.filter(c => c.klassenLeitungen.includes(t.id))
        .map(c => `^${c.kuerzel}`).sort();
      const groups = courses.filter(c => c.lehrer === t.id ||
        c.weitereLehrer.some(l => l.idLehrer === t.id)).map(c => {
        const prefix = c.idJahrgaenge.map(id => {
          const year = yearMap.get(id);
          if (!year) throw new Error(`Jahrgang ${id} fehlt (Kurs ${c.id}).`);
          return year.kuerzel;
        }).join('/');
        return prefix ? `${prefix} - ${c.kuerzel}` : c.kuerzel;
      });
      return [referenceId(schema, t.id, 'lehrer'), t.vorname, t.nachname,
        ledClasses.join('|'), [...new Set(groups)].sort().join('|')];
    })
  ];
}
