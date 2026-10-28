import { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const target = process.env.BUILD_TARGET ?? '';
if (!/^[a-z0-9_-]+$/.test(target)) throw new Error('BUILD_TARGET fehlt oder ist ungültig.');
const root = join('src-tauri', 'target', target, 'release', 'bundle');
mkdirSync('release-assets', { recursive: true });
let count = 0;
function collect(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.endsWith('.app')) collect(file);
    else if (entry.isFile() && /\.(dmg|msi|deb|rpm)$/.test(entry.name)) {
      copyFileSync(file, join('release-assets', `${target}-${basename(file)}`));
      count++;
    }
  }
}
collect(root);
// Windows: zusätzlich das eigenständige Programm (Oberfläche eingebettet, braucht nur WebView2).
if (target.includes('windows')) {
  const { productName, version } = JSON.parse(readFileSync(join('src-tauri', 'tauri.conf.json'), 'utf8'));
  const release = join('src-tauri', 'target', target, 'release');
  const binaries = readdirSync(release, { withFileTypes: true }).filter(e => e.isFile() && e.name.endsWith('.exe'));
  if (binaries.length !== 1) throw new Error(`Genau ein Windows-Programm erwartet, gefunden: ${binaries.length}.`);
  copyFileSync(join(release, binaries[0].name), join('release-assets', `${target}-${productName}_${version}_portable.exe`));
  count++;
}
if (!count) throw new Error('Keine Installationspakete gefunden.');
console.log(`${count} Pakete für ${target} gesammelt.`);
