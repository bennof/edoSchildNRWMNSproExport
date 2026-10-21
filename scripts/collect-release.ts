import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
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
    else if (entry.isFile() && /\.(dmg|exe|msi|deb|rpm|AppImage)$/.test(entry.name)) {
      copyFileSync(file, join('release-assets', `${target}-${basename(file)}`));
      count++;
    }
  }
}
collect(root);
if (!count) throw new Error('Keine Installationspakete gefunden.');
console.log(`${count} Pakete für ${target} gesammelt.`);
