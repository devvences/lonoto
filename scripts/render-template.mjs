import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , templatePath, outputPath] = process.argv;

if (!templatePath || !outputPath) {
  console.error(
    'Usage: node scripts/render-template.mjs <template.yaml> <output.yaml>',
  );
  process.exit(1);
}

const root = fileURLToPath(new URL('..', import.meta.url));
const handlerPath = path.join(root, 'server/movies.cjs');
const template = fs.readFileSync(templatePath, 'utf8');
const handler = fs.readFileSync(handlerPath, 'utf8').trimEnd();

const marker = /^([ \t]*)ZipFile: __MOVIE_HANDLER_CODE__$/m;
const match = marker.exec(template);
if (!match) {
  console.error('Could not find the __MOVIE_HANDLER_CODE__ marker in the template.');
  process.exit(1);
}

const indent = match[1];
const block = handler
  .split('\n')
  .map((line) => (line ? `${indent}  ${line}` : ''))
  .join('\n');
const rendered = template.replace(marker, `${indent}ZipFile: |\n${block}`);

fs.writeFileSync(outputPath, rendered);
console.log(`Rendered Lambda code from ${path.relative(root, handlerPath)}`);
