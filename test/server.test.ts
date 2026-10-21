import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeServer } from '../src/shared/server.ts';
test('Serveradresse erlaubt wechselnde HTTPS-Hosts und Ports', () => {
  assert.equal(normalizeServer(' https://schule.example:8443/ '), 'https://schule.example:8443');
  assert.equal(normalizeServer('https://localhost:8443'), 'https://localhost:8443');
  for (const value of ['http://localhost', 'https://user:secret@host', 'https://host/db', 'https://host?x=1', '//host']) assert.throws(() => normalizeServer(value));
});
