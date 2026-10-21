import { readFileSync, writeFileSync } from 'node:fs';

// Only touches the ephemeral CI checkout; package.json/Cargo versions stay unchanged.
const tag = process.env.GITHUB_REF_NAME ?? '';
const match = /^v((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/.exec(tag);
if (!match) throw new Error('Release-Tag muss vMAJOR.MINOR.PATCH heißen, optional z. B. -beta.1.');
const version = match[1];
const configPath = 'src-tauri/tauri.conf.json';
const config = JSON.parse(readFileSync(configPath, 'utf8'));
config.version = version;
writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log(`Tauri release version: ${version}`);
