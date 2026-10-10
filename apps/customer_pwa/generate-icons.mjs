import fs from 'fs';
import path from 'path';

// Valid 1x1 RGBA PNG buffer
const minimalPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const outDir = path.resolve('public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'icon-192x192.png'), minimalPng);
fs.writeFileSync(path.join(outDir, 'icon-512x512.png'), minimalPng);
fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), minimalPng);
fs.writeFileSync(path.resolve('public/favicon.ico'), minimalPng);
console.log('Icons generated successfully');
