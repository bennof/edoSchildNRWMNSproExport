import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('CI übernimmt Tag-Version und sammelt nur Installer mit eindeutigen Namen', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'svws-release-'));
  const run = (script: string, env: Record<string, string>) => spawnSync(process.execPath,
    ['--import', import.meta.resolve('tsx'), resolve('scripts', script)],
    { cwd, env: { ...process.env, ...env }, encoding: 'utf8' });
  try {
    mkdirSync(join(cwd, 'src-tauri'));
    const config = join(cwd, 'src-tauri/tauri.conf.json');
    writeFileSync(config, '{"version":"0.1.0"}');
    assert.equal(run('release-config.ts', { GITHUB_REF_NAME: 'v0.2.0-beta.1' }).status, 0);
    assert.equal(JSON.parse(readFileSync(config, 'utf8')).version, '0.2.0-beta.1');
    assert.notEqual(run('release-config.ts', { GITHUB_REF_NAME: 'invalid' }).status, 0);
    const bundle = join(cwd, 'src-tauri/target/aarch64-apple-darwin/release/bundle');
    mkdirSync(join(bundle, 'macos/App.app'), { recursive: true });
    mkdirSync(join(bundle, 'dmg'));
    writeFileSync(join(bundle, 'dmg/App.dmg'), 'fixture');
    writeFileSync(join(bundle, 'macos/App.app/binary'), 'ignore');
    assert.equal(run('collect-release.ts', { BUILD_TARGET: 'aarch64-apple-darwin' }).status, 0);
    assert.deepEqual(readdirSync(join(cwd, 'release-assets')), ['aarch64-apple-darwin-App.dmg']);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
