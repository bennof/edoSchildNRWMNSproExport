import { normalizeServer } from '../shared/server.ts';
import { isTauri, desktopGet } from './desktop.ts';
import type { JsonGetter, Schema, School, Student, Teacher, SchoolClass, Course, Year, Credentials, ExportData } from '../shared/types.ts';
import { loadStudentClasses } from '../shared/classes.ts';
export function createClient({ user, password, server }: Pick<Credentials, 'user' | 'password' | 'server'>, signal?: AbortSignal): JsonGetter {
  const target = normalizeServer(server ?? '');
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  const authorization = `Basic ${btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))}`;
  return async <T>(path: string): Promise<T> => {
    if (isTauri()) return desktopGet<T>(path, { user, password, server: target }, signal);
    const response = await fetch(`/svws${path}`, {
      headers: { Accept: 'application/json', Authorization: authorization, 'X-SVWS-Server': target },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
      cache: 'no-store'
    });
    if (!response.ok) {
      const reason = response.status === 401 ? 'Benutzername oder Passwort prüfen.'
        : response.status === 403 ? 'Dem Benutzer fehlen Leserechte für diese Daten.'
        : 'Server und Verbindung prüfen.';
      throw new Error(`HTTP ${response.status}: ${reason} (${path})`);
    }
    return response.json();
  };
}
export async function loadData(credentials: Credentials, signal?: AbortSignal): Promise<ExportData> {
  const get = createClient(credentials, signal);
  let schema = credentials.schema.trim();
  if (!schema) {
    const schemas = (await get<Schema[]>('/config/db/schemata')).filter(s => !s.isDeactivated);
    schema = schemas.find(s => s.isDefault)?.name ?? (schemas.length === 1 ? schemas[0].name : '');
    if (!schema) throw new Error('Bitte ein Datenbankschema auf der Zugangsseite angeben.');
  }
  const root = `/db/${encodeURIComponent(schema)}`;
  const school = await get<School> (`${root}/schule/stammdaten`);
  const section = school.idSchuljahresabschnitt;
  const [teachers, students, classes, courses, years] = await Promise.all([
    get<Teacher[]> (`${root}/lehrer/abschnitt/${section}`),
    get<Student[]> (`${root}/schueler/aktuell`),
    get<SchoolClass[]> (`${root}/klassen/details/abschnitt/${section}`),
    get<Course[]> (`${root}/kurse/abschnitt/${section}`),
    get<Year[]> (`${root}/jahrgaenge/`)
  ]);
  if (teachers.some(t => typeof t.istAktiv !== 'boolean' || typeof t.istSichtbar !== 'boolean')) {
    throw new Error('Aktivstatus oder Sichtbarkeit fehlt bei einer Lehrkraft.');
  }
  const studentClasses = await loadStudentClasses(get, root, students, classes);
  return { schema, school, teachers, students, classes, studentClasses, courses, years };
}
