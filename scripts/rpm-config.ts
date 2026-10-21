import { readFileSync, writeFileSync } from 'node:fs';

// Only used by `tauri bundle`: the compiled app keeps its full SemVer version.
const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const match = /^(\d+\.\d+\.\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(config.version);
if (!match) throw new Error(`Unsupported RPM app version: ${config.version}`);
const release = match[2] ? `0.${match[2].replaceAll('-', '.')}` : '1';
writeFileSync('src-tauri/tauri.rpm.generated.json', JSON.stringify({
  version: match[1],
  bundle: { linux: { rpm: { release } } },
}, null, 2) + '\n');
console.log(`RPM version-release: ${match[1]}-${release}`);
