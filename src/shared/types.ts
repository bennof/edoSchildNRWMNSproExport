export interface Credentials { server?: string; user: string; password: string; schema: string }
export interface Schema { name: string; isDefault: boolean; isDeactivated: boolean }
export interface School {
  bezeichnung1: string;
  idSchuljahresabschnitt: number;
  abschnitte: { id: number; schuljahr: number; abschnitt: number }[];
}
export interface Student {
  id: number; vorname: string; nachname: string; idKlasse: number;
  status: number; idSchuljahresabschnittSchueler: number; kurse: number[];
}
export interface Teacher { id: number; vorname: string; nachname: string; istAktiv: boolean; istSichtbar: boolean }
export interface SchoolClass { id: number; kuerzel: string; klassenLeitungen: number[] }
export interface Course {
  id: number; kuerzel: string; idJahrgaenge: number[]; lehrer: number | null;
  weitereLehrer: { idLehrer: number }[];
}
export interface Year { id: number; kuerzel: string }
export type CsvRow = [string, string, string, string, string];
export type JsonGetter = <T>(path: string) => Promise<T>;
export interface ExportData {
  schema: string; school: School; teachers: Teacher[]; students: Student[];
  classes: SchoolClass[]; studentClasses: SchoolClass[]; courses: Course[]; years: Year[];
}
