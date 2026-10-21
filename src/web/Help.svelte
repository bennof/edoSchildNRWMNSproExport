<script lang="ts">
  import settingsImage from '../../svws_server_user_settings.png';
</script>

<div class="intro">
  <p class="eyebrow">HILFE / BENUTZEREINRICHTUNG</p>
  <h1>SVWS-Zugang einrichten.</h1>
  <p>Ein eigener Exportbenutzer benötigt Leserechte für Schüler- und Lehrerdaten.</p>
</div>
<section class="help-panel" aria-label="Benutzer einrichten">
  <h2>Im SVWS-Server</h2>
  <ol>
    <li>Mit einem Konto anmelden, das Benutzer verwalten darf. Unter <strong>Einstellungen → Benutzer</strong> einen neuen Benutzer anlegen, zum Beispiel <code>edoschildmnsproexport</code>.</li>
    <li>Ein Passwort vergeben und notieren.</li>
    <li>Die Benutzergruppe <strong>IT-Dienstleister</strong> auswählen.</li>
    <li>Bei diesen drei Kompetenzen jeweils <strong>Ansehen</strong> aktivieren:
      <ul>
        <li>Schüler Individualdaten</li>
        <li>Schüler Leistungsdaten</li>
        <li>Lehrerdaten</li>
      </ul>
      Für den Export werden keine Änderungs- oder Löschrechte benötigt.
    </li>
    <li>Die Änderungen speichern.</li>
  </ol>
  <figure>
    <a href={settingsImage} target="_blank" rel="noreferrer" aria-label="Screenshot der SVWS-Benutzereinstellungen in voller Größe öffnen">
      <img src={settingsImage} alt="SVWS-Benutzerverwaltung mit Benutzergruppe IT-Dienstleister und den Leserechten für Schüler Individualdaten, Schüler Leistungsdaten und Lehrerdaten" loading="lazy" />
    </a>
    <figcaption>Benutzereinstellungen als Orientierung. Zum Vergrößern das Bild öffnen.</figcaption>
  </figure>
  <h2>In dieser Anwendung</h2>
  <p>Unter <strong>Zugang</strong> die HTTPS-Adresse des SVWS-Servers (z. B. <code>https://schulserver:8443</code>), den angelegten Benutzernamen und das Passwort eintragen. Das Datenbankschema kann leer bleiben: Dann wird das Standardschema verwendet. Anschließend <strong>Verbinden & Lehrer anzeigen</strong> wählen.</p>
  <p>Die Zugangsdaten bleiben standardmäßig im Session-Speicher. Mit <strong>Zugangsdaten dauerhaft speichern</strong> werden sie einschließlich Passwort im lokalen Browser-Speicher abgelegt. Beim Ausschalten werden sie zurück übertragen und aus dem dauerhaften Speicher entfernt.</p>
  <h2>Wenn die Verbindung nicht klappt</h2>
  <dl>
    <dt>HTTP 401</dt><dd>Benutzername und Passwort prüfen.</dd>
    <dt>HTTP 403</dt><dd>Die oben genannten Leserechte und die Gruppenzuordnung prüfen, Änderungen speichern und erneut verbinden.</dd>
    <dt>Server nicht erreichbar</dt><dd>Prüfen, ob der SVWS-Server läuft und ob die auf der Zugangsseite angezeigte Serveradresse stimmt.</dd>
  </dl>
</section>
