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
    assert.equal(JSON.parse(readFileSync(config, 'utf8')).bundle.windows.wix.version, '0.2.0');
    for (const tag of ['v1.2.3', 'v1.2.3-rc.2', 'v255.255.65535']) {
      assert.equal(run('release-config.ts', { GITHUB_REF_NAME: tag }).status, 0);
      const result = JSON.parse(readFileSync(config, 'utf8'));
      assert.equal(result.version, tag.slice(1));
      assert.equal(result.bundle.windows.wix.version, tag.slice(1).split('-')[0]);
    }
    for (const [version, rpmVersion, release] of [
      ['0.1.0-alpha.2', '0.1.0', '0.alpha.2'],
      ['0.1.0-beta-test.3', '0.1.0', '0.beta.test.3'],
      ['0.1.0', '0.1.0', '1'],
    ]) {
      writeFileSync(config, JSON.stringify({ version }));
      assert.equal(run('rpm-config.ts', {}).status, 0);
      const rpm = JSON.parse(readFileSync(join(cwd, 'src-tauri/tauri.rpm.generated.json'), 'utf8'));
      assert.equal(rpm.version, rpmVersion);
      assert.equal(rpm.bundle.linux.rpm.release, release);
      assert.equal(JSON.parse(readFileSync(config, 'utf8')).version, version);
    }
    const beforeInvalid = readFileSync(config, 'utf8');
    for (const tag of ['invalid', 'v256.0.0', 'v0.256.0', 'v0.0.65536']) {
      assert.notEqual(run('release-config.ts', { GITHUB_REF_NAME: tag }).status, 0);
      assert.equal(readFileSync(config, 'utf8'), beforeInvalid);
    }
    const bundle = join(cwd, 'src-tauri/target/aarch64-apple-darwin/release/bundle');
    mkdirSync(join(bundle, 'macos/App.app'), { recursive: true });
    mkdirSync(join(bundle, 'dmg'));
    writeFileSync(join(bundle, 'dmg/App.dmg'), 'fixture');
    writeFileSync(join(bundle, 'macos/App.app/binary'), 'ignore');
    assert.equal(run('collect-release.ts', { BUILD_TARGET: 'aarch64-apple-darwin' }).status, 0);
    assert.deepEqual(readdirSync(join(cwd, 'release-assets')), ['aarch64-apple-darwin-App.dmg']);
    writeFileSync(config, JSON.stringify({ productName: 'App', version: '1.2.3' }));
    const win = join(cwd, 'src-tauri/target/x86_64-pc-windows-msvc/release');
    mkdirSync(join(win, 'bundle/msi'), { recursive: true });
    mkdirSync(join(win, 'build/x/out'), { recursive: true });
    writeFileSync(join(win, 'bundle/msi/App.msi'), 'fixture');
    writeFileSync(join(win, 'app.exe'), 'fixture');
    writeFileSync(join(win, 'build/x/out/build-script.exe'), 'ignore');
    assert.equal(run('collect-release.ts', { BUILD_TARGET: 'x86_64-pc-windows-msvc' }).status, 0);
    assert.deepEqual(readdirSync(join(cwd, 'release-assets')).sort(), ['aarch64-apple-darwin-App.dmg',
      'x86_64-pc-windows-msvc-App.msi', 'x86_64-pc-windows-msvc-App_1.2.3_portable.exe']);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
