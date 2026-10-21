import type { JsonGetter, Schema, School, Student, Teacher, SchoolClass, Course, Year, Credentials, ExportData } from '../shared/types.ts';
import { loadStudentClasses } from '../shared/classes.ts';
import https from 'node:https';
import { parseArgs } from 'node:util';
import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { csv, studentRows, teacherRows } from '../shared/export.ts';
import { resolvePassword } from './password.ts';

export async function main() {
  const { values: args } = parseArgs({ options: {
    url: { type: 'string', default: 'https://127.0.0.1:8443/' },
    user: { type: 'string', default: 'admin' },
    password: { type: 'string' },
    schema: { type: 'string' },
    output: { type: 'string', default: 'output/Student.csv' },
    'teacher-output': { type: 'string', default: 'output/Teacher.csv' },
    insecure: { type: 'boolean', default: false },
    'all-status': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' }
  } });
  if (args.help) {
    console.log(`SVWS-Schüler- und Lehrerexport (Node >=22)
  npm run export -- --insecure --password 'PASSWORT'
  --url URL        Server (Standard: https://127.0.0.1:8443/)
  --user NAME      Benutzer (Standard: admin)
  --password WERT  Passwort (Vorrang vor SVWS_PASSWORD; '' nur bewusst für Testserver)
  --schema NAME    Datenbankschema (sonst Standardschema)
  --output DATEI   Ziel (Standard: output/Student.csv)
  --teacher-output DATEI  Lehrerziel (Standard: output/Teacher.csv)
  --insecure       Selbstsigniertes TLS-Zertifikat akzeptieren
  --all-status     Alle Schülerstatus und alle Lehrer (auch inaktiv/unsichtbar)
  SVWS_PASSWORD    Alternative zu --password; muss nicht leer sein
  Ohne Passwortangabe erfolgt eine verdeckte interaktive Abfrage.`);
    return;
  }
  const password = await resolvePassword(args.password, process.env.SVWS_PASSWORD);
  const base = new URL(args.url);
  if (resolve(args.output) === resolve(args['teacher-output']))
    throw new Error('Schüler- und Lehrerdatei müssen unterschiedliche Ziele haben.');
  if (base.protocol !== 'https:') throw new Error('Bitte eine HTTPS-URL verwenden.');
  const agent = new https.Agent({ rejectUnauthorized: !args.insecure });
  const get: JsonGetter = <T>(path: string) => new Promise<T>((resolve, reject) => {
    const req = https.get(new URL(path, base), {
      agent, auth: `${args.user}:${password}`,
      headers: { Accept: 'application/json' }
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('error', reject);
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} bei ${path}. Benutzer, Passwort und Schema prüfen.`));
          return;
        }
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error(`Keine gültige JSON-Antwort bei ${path}.`)); }
      });
    });
    req.setTimeout(30000, () => req.destroy(new Error('Server antwortet nicht (30 Sekunden).')));
    req.on('error', reject);
  });
  try {
    let schema = args.schema;
    if (!schema) {
      const schemas = (await get<Schema[]>('/config/db/schemata')).filter(s => !s.isDeactivated);
      schema = schemas.find(s => s.isDefault)?.name ?? (schemas.length === 1 ? schemas[0].name : '');
      if (!schema) throw new Error('Kein eindeutiges Schema. Bitte --schema NAME angeben.');
    }
    const root = `/db/${encodeURIComponent(schema)}`;
    const school = await get<School> (`${root}/schule/stammdaten`);
    const section = school.idSchuljahresabschnitt;
    const [students, classes, courses, years, teachers] = await Promise.all([
      get<Student[]> (`${root}/schueler/aktuell`),
      get<SchoolClass[]> (`${root}/klassen/details/abschnitt/${section}`),
      get<Course[]> (`${root}/kurse/abschnitt/${section}`),
      get<Year[]> (`${root}/jahrgaenge/`),
      get<Teacher[]> (`${root}/lehrer/abschnitt/${section}`)
    ]);
    const selected = students.filter(s => args['all-status'] || s.status === 2);
    selected.sort((a, b) => a.id - b.id);
    const studentClasses = await loadStudentClasses(get, root, selected, classes);
    if (!args['all-status'] && teachers.some(t => typeof t.istAktiv !== 'boolean' || typeof t.istSichtbar !== 'boolean'))
      throw new Error('Aktivstatus oder Sichtbarkeit fehlt bei mindestens einer Lehrkraft.');
    const teacherData = teacherRows(schema, teachers, classes, courses, years, { allStatus: args['all-status'] });
    const files: [string, string, number, string][] = [
      [args.output, csv(studentRows(schema, selected, studentClasses, courses, years)), selected.length, 'Schüler'],
      [args['teacher-output'], csv(teacherData), teacherData.length - 1, 'Lehrer']
    ];
    for (const [file, content, count, label] of files) {
      const target = resolve(file), temp = `${target}.${process.pid}.tmp`;
      await mkdir(dirname(target), { recursive: true });
      try {
        await writeFile(temp, content, { flag: 'wx' });
        await rename(temp, target);
      } finally { await rm(temp, { force: true }); }
      console.log(`${count} ${label} exportiert: ${target} (Schema ${schema}, Abschnitt ${section})`);
    }
    const withoutCourses = teacherData.slice(1).filter(row => row[4] === '').length;
    console.log(`Lehrerprüfung: ${teachers.length - (teacherData.length - 1)} durch Aktiv-/Sichtbarkeitsfilter ausgeschlossen; ${withoutCourses} Lehrer ohne Kurse enthalten.`);
  } finally { agent.destroy(); }
}

