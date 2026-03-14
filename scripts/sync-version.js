/**
 * Copia la versione da package.json della root a frontend e backend.
 * Eseguire dalla root: node scripts/sync-version.js
 * Utile dopo "npm version patch|minor|major" per tenere allineate le versioni.
 */
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const rootDir = join(__dirname, '..');

const rootPkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = rootPkg.version;
if (!version) {
  console.error('Nessuna version in root package.json');
  process.exit(1);
}

for (const name of ['frontend', 'backend']) {
  const path = join(rootDir, name, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`${name}/package.json → ${version}`);
}

console.log('Versioni allineate alla root:', version);
