<script lang="ts">
  import { isTauri, saveDesktopCsv } from './desktop.ts';
  let saving = false;
  import Help from './Help.svelte';
  let showHelp = false;
  import { searchRows } from './search.ts';
  import type { Credentials, ExportData } from '../shared/types.ts';
  import logo from './assets/svws-export-logo.svg';
  import { loadCredentials, saveCredentials } from './storage.ts';
  import { loadData } from './api.ts';
  import { csv, studentRows, teacherRows } from '../shared/export.ts';

  let initial: Credentials & { persistent: boolean };
  let storageError = '';
  try { initial = loadCredentials(); }
  catch { initial = { user: 'edoschildmnsproexport', password: '', schema: '', persistent: false }; storageError = 'Browser-Speicher ist nicht verfügbar.'; }
  let user = initial.user, password = initial.password, schema = initial.schema;
  let persistent = initial.persistent;
  let step = 0, busy = false, error = '';
  let data: ExportData | null = null;
  let controller: AbortController;
  let activeTeachers = true, visibleTeachers = true, activeStudents = true;
  let search = '';
  let downloadMessage = '';
  let server = initial.server ?? __SVWS_TARGET__;

  function save(nextPersistent = persistent) {
    try {
      saveCredentials({ user, password, schema, server }, nextPersistent);
      persistent = nextPersistent;
      storageError = '';
    } catch { storageError = 'Einstellungen konnten nicht gespeichert werden. Bitte Browser-Speicher erlauben.'; }
  }
  function switchStorage(event: Event & { currentTarget: HTMLInputElement }) {
    save(event.currentTarget.checked);
    event.currentTarget.checked = persistent;
  }
  async function connect() {
    save();
    busy = true; error = ''; data = null; downloadMessage = '';
    controller = new AbortController();
    try {
      const result = await loadData({ user, password, schema, server }, controller.signal);
      // Validate all export mappings before displaying a successful connection.
      teacherRows(result.schema, result.teachers, result.classes, result.courses, result.years, { allStatus: true });
      studentRows(result.schema, result.students, result.studentClasses, result.courses, result.years);
      data = result;
      navigate(1);
    } catch (e) {
      error = e instanceof Error ? (e.name === 'AbortError' ? 'Verbindung abgebrochen.' : e.message) : String(e);
    } finally { busy = false; }
  }
  function navigate(next: number) { showHelp = false; step = next; search = ''; downloadMessage = ''; }
  $: teachers = data ? data.teachers.filter(t => (!activeTeachers || t.istAktiv) && (!visibleTeachers || t.istSichtbar)) : [];
  $: students = data ? data.students.filter(s => !activeStudents || s.status === 2) : [];
  $: rows = !data || step === 0 ? [] : step === 1
    ? teacherRows(data.schema, teachers, data.classes, data.courses, data.years, { allStatus: true })
    : studentRows(data.schema, [...students].sort((a, b) => a.id - b.id), data.studentClasses, data.courses, data.years);
  $: shown = searchRows(rows.slice(1), search);
  $: total = data ? (step === 1 ? data.teachers.length : data.students.length) : 0;
  $: section = data?.school.abschnitte.find(a => a.id === data?.school.idSchuljahresabschnitt);
  async function download() {
    if (saving) return;
    const content = csv([rows[0], ...shown]);
    const name = step === 1 ? 'Teacher.csv' : 'Student.csv';
    if (isTauri()) {
      saving = true;
      try {
        const saved = await saveDesktopCsv(name, content);
        downloadMessage = saved ? `${name}: ${shown.length} Einträge gespeichert.` : 'Speichern abgebrochen.';
      } catch (e) { downloadMessage = e instanceof Error ? e.message : String(e); }
      finally { saving = false; }
      return;
    }
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    downloadMessage = `${name}: Download mit ${shown.length} Einträgen gestartet.`;
  }
</script>

<svelte:head><title>SVWS · {showHelp ? 'Hilfe' : ['Zugang', 'Lehrer', 'Schüler'][step]}</title></svelte:head>

<div class="shell" class:list-view={!showHelp && step > 0 && data !== null}>
  <header class="header">
    <a class="brand" href="/" onclick={(e) => { e.preventDefault(); if (!busy) navigate(0); }}><img class="brand-logo" src={logo} alt="SVWS Export Logo" /> SVWS <span class="brand-light">/ CSV Export</span></a>
    <button class="secondary" disabled={busy} aria-pressed={showHelp} onclick={() => { showHelp = !showHelp; }}>Hilfe</button>
  </header>
  <nav aria-label="Exportschritte" class="steps">
    {#each ['Zugang', 'Lehrer', 'Schüler'] as label, i}
      <button class:current={!showHelp && step === i} disabled={busy || (i > 0 && !data)} aria-current={!showHelp && step === i ? 'step' : undefined} onclick={() => navigate(i)}><span>{i + 1}</span>{label}</button>
    {/each}
  </nav>

  <main>
    {#if showHelp}
      <Help />
      <div class="page-actions help-actions"><button class="secondary" onclick={() => { showHelp = false; }}>← Zurück</button><button class="primary" onclick={() => navigate(0)}>Zum Zugang →</button></div>
    {:else if step === 0}
      <div class="intro"><h1>Mit SVWS verbinden.</h1><p>Schuldaten abrufen und als CSV für MNSpro herunterladen.</p></div>
      <form class="connection" onsubmit={(event) => { event.preventDefault(); connect(); }}>
        <fieldset disabled={busy}>
          <label>SVWS-Server<input type="url" bind:value={server} oninput={() => { data = null; }} onchange={() => save()} placeholder="https://127.0.0.1:8443" required /></label>
          <label>Benutzername<input autocomplete="username" bind:value={user} oninput={() => { data = null; }} onchange={() => save()} required /></label>
          <label>Passwort<input type="password" autocomplete="current-password" bind:value={password} oninput={() => { data = null; }} onchange={() => save()} placeholder="Passwort eingeben" /></label>
          <label>Datenbankschema <span class="optional">optional</span><input bind:value={schema} oninput={() => { data = null; }} onchange={() => save()} placeholder="Standardschema automatisch verwenden" /></label>
          <label class="check remember"><input type="checkbox" checked={persistent} onchange={switchStorage} /><span>Zugangsdaten dauerhaft speichern<small>{persistent ? 'In diesem Browser gespeichert, einschließlich Passwort.' : 'Nur für diese Sitzung, einschließlich Passwort.'}</small></span></label>
        </fieldset>
        {#if storageError}<p class="notice" role="alert">{storageError}</p>{/if}
        {#if error}<p class="error" role="alert">{error}</p>{/if}
        <div class="form-actions"><button class="primary" disabled={busy || !user.trim()} type="submit">{busy ? 'Daten werden geladen …' : 'Verbinden & Lehrer anzeigen'} <span aria-hidden="true">→</span></button>
          {#if busy}<button type="button" class="secondary" onclick={() => controller.abort()}>Abbrechen</button>{/if}
        </div>
      </form>
      <p class="footnote">Beim Wechsel der Speicherart werden die Zugangsdaten übertragen und aus dem bisherigen Speicher entfernt.</p>
    {:else if data}
      <div class="intro list-intro"><div><h1>{step === 1 ? 'Lehrer auswählen.' : 'Schüler auswählen.'}</h1><p>{data.school.bezeichnung1} · {section ? `${section.schuljahr}/${String(section.schuljahr + 1).slice(-2)} · Abschnitt ${section.abschnitt}` : `Abschnitt ${data.school.idSchuljahresabschnitt}`}</p></div><span class="connected"><span class="dot"></span> Verbunden</span></div>
      <section class="list-panel" aria-label="Exportauswahl">
        <div class="filters">
          <div class="checks">
            {#if step === 1}
              <label class="check"><input type="checkbox" bind:checked={activeTeachers} />Nur aktive Lehrer</label>
              <label class="check"><input type="checkbox" bind:checked={visibleTeachers} />Nur sichtbare Lehrer</label>
            {:else}
              <label class="check"><input type="checkbox" bind:checked={activeStudents} />Nur aktive Schüler (Status 2)</label>
            {/if}
          </div>
          <input class="search" aria-label="Liste durchsuchen" type="search" placeholder="Name, Klasse oder Gruppe suchen …" bind:value={search} />
        </div>
        <div class="list-caption"><strong>{shown.length} von {total}</strong><span>{step === 1 ? 'Lehrer ohne Kurse sind eingeschlossen.' : 'Alle Status anzeigen: Aktivfilter ausschalten.'}</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>{step === 1 ? 'Klassenleitungen' : 'Klasse'}</th><th>Gruppen</th></tr></thead>
            <tbody>{#each shown as row (row[0])}<tr><td><strong>{row[2]}, {row[1]}</strong><span class="person-reference" title="Stabile Export-Referenz-ID">{row[0]}</span></td><td>{row[3] || '—'}</td><td><div class="groups">{#each row[4] ? row[4].split('|') : [] as group}<span>{group}</span>{:else}<span class="empty-group">Keine Kurse</span>{/each}</div></td></tr>{:else}<tr><td colspan="3" class="empty">Keine Einträge für diese Auswahl. Filter oder Suche anpassen.</td></tr>{/each}</tbody>
          </table>
        </div>
        <div class="download-bar"><div><strong>{step === 1 ? 'Teacher.csv' : 'Student.csv'}</strong><small>Die {shown.length} angezeigten Einträge · UTF-8 · Semikolon</small></div><button class="primary" disabled={!shown.length || saving} onclick={download}>{saving ? 'Wird gespeichert …' : isTauri() ? 'CSV speichern' : 'CSV herunterladen'} <span aria-hidden="true">↓</span></button></div>
      </section>
      <p class="status-message" role="status">{downloadMessage}</p>
      <div class="page-actions"><button class="secondary" onclick={() => navigate(step - 1)}>← {step === 1 ? 'Zugang ändern' : 'Zurück zu Lehrern'}</button>{#if step === 1}<button class="next" onclick={() => navigate(2)}>Weiter zu Schülern →</button>{/if}</div>
    {/if}
  </main>
  <footer><span>SVWS → MNSpro</span><span>CSV-Export · Datenzugriff nur lesend</span></footer>
</div>
