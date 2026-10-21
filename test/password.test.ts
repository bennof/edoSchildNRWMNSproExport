import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { resolvePassword, promptPassword } from '../src/cli/password.ts';

test('Fehlendes Passwort löst Abfrage aus', async () => {
  let calls = 0;
  const prompt = async () => { calls++; return 'eingabe'; };
  assert.equal(await resolvePassword(undefined, undefined, prompt), 'eingabe');
  assert.equal(await resolvePassword(undefined, '', prompt), 'eingabe');
  assert.equal(calls, 2);
});

test('Argument und Umgebung vermeiden Abfrage; Argument hat Vorrang', async () => {
  const prompt = () => { throw new Error('Unerwartete Abfrage'); };
  assert.equal(await resolvePassword('argument', 'environment', prompt), 'argument');
  assert.equal(await resolvePassword(undefined, 'environment', prompt), 'environment');
  assert.equal(await resolvePassword('', 'environment', prompt), '');
});

test('Verdeckte Abfrage unterstützt Korrektur, Enter und Abbruch; Terminal wird wiederhergestellt', async () => {
  for (const abort of [false, true]) {
    const input = new PassThrough() as PassThrough & NodeJS.ReadStream;
    input.isTTY = true;
    input.isRaw = false;
    input.setRawMode = (value: boolean) => { input.isRaw = value; return input; };
    let displayed = '';
    const pending = promptPassword(input, { write: text => { displayed += text; } });
    input.emit('keypress', 'geheim', {});
    input.emit('keypress', '', { name: 'backspace' });
    input.emit('keypress', 'x', {});
    if (abort) {
      input.emit('keypress', '', { ctrl: true, name: 'c' });
      await assert.rejects(pending, /abgebrochen/);
    } else {
      input.emit('keypress', '', { name: 'return' });
      assert.equal(await pending, 'geheix');
    }
    assert.equal(displayed, 'Passwort (Eingabe verborgen): \n');
    assert.equal(input.isRaw, false);
    assert.equal(input.listenerCount('keypress'), 0);
    input.destroy();
  }
});

test('Ohne Terminal verständlicher Fehler; Hilfe ohne Passwort verfügbar', () => {
  const env = { ...process.env };
  delete env.SVWS_PASSWORD;
  const run = (args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/export.ts', ...args], { env, encoding: 'utf8' });
  const missing = run([]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Keine interaktive Passworteingabe/);
  assert.equal(run(['--help']).status, 0);
});
