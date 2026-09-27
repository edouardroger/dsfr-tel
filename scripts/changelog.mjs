// Journal des modifications : sert à `npm version` et au workflow de publication.
//   node scripts/changelog.mjs check          vérifie que la section « Non publiée » est remplie
//   node scripts/changelog.mjs release        la renomme avec la version du package.json et la date
//   node scripts/changelog.mjs notes 1.2.0    affiche la note de la version 1.2.0
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'CHANGELOG.md';
const UNRELEASED = '## [Non publiée]';

function fail(message) {
  console.error(process.env.GITHUB_ACTIONS ? `::error::${message}` : message);
  process.exit(1);
}

const lines = readFileSync(FILE, 'utf8').split('\n');

function findSection(title) {
  const start = lines.findIndex((line) => line.startsWith(title));
  if (start < 0) return null;
  const next = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  const end = next < 0 ? lines.length : next;
  return { start, body: lines.slice(start + 1, end).join('\n').trim() };
}

function unreleased() {
  const section = findSection(UNRELEASED);
  if (!section) fail(`${FILE} : section « ${UNRELEASED} » introuvable.`);
  if (!section.body) {
    fail(`${FILE} : la section « ${UNRELEASED} » est vide. Décrivez-y les changements de la version.`);
  }
  return section;
}

function today() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const [command, argument] = process.argv.slice(2);

switch (command) {
  case 'check':
    unreleased();
    break;

  case 'release': {
    const { start } = unreleased();
    const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
    lines.splice(start, 1, UNRELEASED, '', `## [${version}] — ${today()}`);
    writeFileSync(FILE, lines.join('\n'));
    console.log(`${FILE} : section « ${UNRELEASED} » publiée en ${version}.`);
    break;
  }

  case 'notes': {
    const version = argument?.replace(/^v/, '');
    if (!version) fail('Indiquez la version : node scripts/changelog.mjs notes 1.2.0');
    const section = findSection(`## [${version}]`);
    if (!section) fail(`${FILE} ne contient pas de section « ## [${version}] ».`);
    if (!/\d{4}-\d{2}-\d{2}/.test(lines[section.start])) {
      fail(`${FILE} : la section ${version} n'est pas datée.`);
    }
    if (!section.body) fail(`${FILE} : la section ${version} est vide.`);
    process.stdout.write(`${section.body}\n`);
    break;
  }

  default:
    fail('Commandes : check, release, notes <version>.');
}
