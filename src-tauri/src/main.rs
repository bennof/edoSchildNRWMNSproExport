#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::time::Duration;
use tauri_plugin_dialog::DialogExt;

fn allowed_path(path: &str) -> bool {
    if path == "/config/db/schemata" {
        return true;
    }
    let parts: Vec<_> = path.split('/').collect();
    if parts.len() < 5
        || parts[0] != ""
        || parts[1] != "db"
        || parts[2].is_empty()
        || parts[2] == "."
        || parts[2] == ".."
        || path.contains(['?', '#', '\\'])
    {
        return false;
    }
    let suffix = parts[3..].join("/");
    if ["schule/stammdaten", "schueler/aktuell", "jahrgaenge/"].contains(&suffix.as_str()) {
        return true;
    }
    [
        "lehrer/abschnitt/",
        "kurse/abschnitt/",
        "klassen/details/abschnitt/",
    ]
    .iter()
    .any(|prefix| {
        suffix
            .strip_prefix(prefix)
            .is_some_and(|id| !id.is_empty() && id.bytes().all(|c| c.is_ascii_digit()))
    })
}

fn validate_server(server: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(server.trim()).map_err(|_| "Ungültige Serveradresse.")?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("Serveradresse muss HTTPS ohne Pfad oder Zugangsdaten verwenden.".into());
    }
    Ok(url)
}

struct Proxy {
    client: reqwest::Client,
}

#[tauri::command]
async fn svws_get(
    proxy: tauri::State<'_, Proxy>,
    path: String,
    user: String,
    password: String,
    server: String,
) -> Result<serde_json::Value, String> {
    if !allowed_path(&path) {
        return Err("Dieser SVWS-Endpunkt ist nicht für den Export freigegeben.".into());
    }
    let base = validate_server(&server)?;
    let url = base.join(&path).map_err(|_| "Ungültiger SVWS-Pfad.")?;
    if url.origin() != base.origin() {
        return Err("Ungültiges SVWS-Ziel.".into());
    }
    let response = proxy
        .client
        .get(url)
        .basic_auth(user, Some(password))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "SVWS antwortet nicht (30 Sekunden)."
            } else {
                "SVWS nicht erreichbar. Serveradresse und TLS-Einstellungen prüfen."
            }
            .to_string()
        })?;
    if !response.status().is_success() {
        let status = response.status().as_u16();
        let hint = match status {
            401 => "Benutzername oder Passwort prüfen.",
            403 => "Dem Benutzer fehlen Leserechte für diese Daten.",
            _ => "Server und Verbindung prüfen.",
        };
        return Err(format!("HTTP {status}: {hint} ({path})"));
    }
    response
        .json()
        .await
        .map_err(|_| "Keine gültige JSON-Antwort vom SVWS-Server.".into())
}

#[tauri::command]
async fn save_csv(app: tauri::AppHandle, name: String, content: String) -> Result<bool, String> {
    if name != "Student.csv" && name != "Teacher.csv" {
        return Err("Ungültiger Exportdateiname.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app
            .dialog()
            .file()
            .set_file_name(&name)
            .add_filter("CSV", &["csv"])
            .blocking_save_file();
        let Some(selected) = selected else {
            return Ok(false);
        };
        let path = selected.into_path().map_err(|_| "Ungültiger Dateipfad.")?;
        std::fs::write(path, content.as_bytes())
            .map_err(|e| format!("CSV konnte nicht gespeichert werden: {e}"))?;
        Ok(true)
    })
    .await
    .map_err(|e| e.to_string())?
}

fn main() {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .redirect(reqwest::redirect::Policy::none())
        .danger_accept_invalid_certs(env!("SVWS_VERIFY_TLS") != "true")
        .build()
        .expect("HTTP-Client konnte nicht erstellt werden");
    tauri::Builder::default()
        .manage(Proxy { client })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![svws_get, save_csv])
        .run(tauri::generate_context!())
        .expect("Tauri konnte nicht gestartet werden");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_export_endpoints_are_allowed() {
        for path in [
            "/config/db/schemata",
            "/db/gymabi/schueler/aktuell",
            "/db/gymabi/lehrer/abschnitt/1",
            "/db/gymabi/klassen/details/abschnitt/19",
        ] {
            assert!(allowed_path(path));
        }
        for path in [
            "https://example.org",
            "//example.org",
            "/db/gymabi/klassen/383",
            "/db/gymabi/lehrer/abschnitt/1?x=2",
            "/db/../schueler/aktuell",
            "/db/gymabi/benutzer/",
        ] {
            assert!(!allowed_path(path));
        }
    }
}
