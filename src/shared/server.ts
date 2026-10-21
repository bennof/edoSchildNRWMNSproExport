/** SVWS erwartet seine REST-Endpunkte direkt unter dem HTTPS-Ursprung. */
export function normalizeServer(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); }
  catch { throw new Error('Bitte eine gültige Serveradresse mit https:// eingeben.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Serveradresse als https://hostname:port ohne Pfad oder Zugangsdaten eingeben.');
  }
  return url.origin;
}
