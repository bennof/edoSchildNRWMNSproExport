import type { Credentials } from '../shared/types.ts';
export type CredentialStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const KEY = 'svws-export.credentials.v1';
export function loadCredentials(session: CredentialStorage = sessionStorage, local: CredentialStorage = localStorage): Credentials & { persistent: boolean } {
  for (const [storage, persistent] of [[local, true], [session, false]] as const) {
    const raw = storage.getItem(KEY);
    if (!raw) continue;
    try {
      const value = JSON.parse(raw);
      if (typeof value.user === 'string' && typeof value.password === 'string' && typeof value.schema === 'string') {
        return { ...value, persistent };
      }
    } catch { /* Ignore invalid saved settings. */ }
    storage.removeItem(KEY);
  }
  return { user: 'edoschildmnsproexport', password: '', schema: '', persistent: false };
}
export function saveCredentials(value: Credentials, persistent: boolean, session: CredentialStorage = sessionStorage, local: CredentialStorage = localStorage) {
  const destination = persistent ? local : session;
  const previous = persistent ? session : local;
  destination.setItem(KEY, JSON.stringify({ user: value.user, password: value.password, schema: value.schema, server: value.server }));
  previous.removeItem(KEY);
}
