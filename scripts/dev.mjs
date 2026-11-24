import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));

const children = [
  spawn(process.execPath, [path.join(root, 'server/dev.cjs')], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  }),
  spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js')], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  }),
];

let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 300);
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 0);
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
