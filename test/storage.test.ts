import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCredentials, saveCredentials } from '../src/web/storage.ts';
const memory = () => {
  const map = new Map<string, string>();
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => map.set(key, value), removeItem: (key: string) => map.delete(key), map };
};
test('Zugangsdaten wandern zwischen Session und dauerhaftem Speicher ohne Kopie', () => {
  const session = memory(), local = memory();
  const credentials = { user: 'test', password: 'secret', schema: 'gymabi', server: 'https://schule.example:8443' };
  saveCredentials(credentials, false, session, local);
  assert.deepEqual(loadCredentials(session, local), { ...credentials, persistent: false });
  assert.equal(local.map.size, 0);
  saveCredentials(credentials, true, session, local);
  assert.equal(session.map.size, 0);
  assert.deepEqual(loadCredentials(session, local), { ...credentials, persistent: true });
  saveCredentials(credentials, false, session, local);
  assert.equal(local.map.size, 0);
  assert.deepEqual(loadCredentials(session, local), { ...credentials, persistent: false });
});
test('Fehlgeschlagenes Speichern löscht den bisherigen Speicher nicht', () => {
  const session = memory(), local = memory();
  const credentials = { user: 'test', password: '', schema: '' };
  saveCredentials(credentials, false, session, local);
  local.setItem = () => { throw new Error('quota'); };
  assert.throws(() => saveCredentials(credentials, true, session, local), /quota/);
  assert.equal(loadCredentials(session, local).user, 'test');
});
