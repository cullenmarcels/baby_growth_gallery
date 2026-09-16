import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const apiPackage = JSON.parse(await readFile(path.join(root, 'apps/api/package.json'), 'utf8'));
const expected = {
  sharp: '0.35.4',
  '@aws-sdk/s3-presigned-post': '3.1127.0',
  '@aws-sdk/s3-request-presigner': '3.1127.0',
  '@keeratita/heic-converter': '0.4.1',
  exifr: '7.1.3',
  'file-type': '22.1.0',
};

const failures = [];
for (const [name, version] of Object.entries(expected)) {
  if (apiPackage.dependencies?.[name] !== version) {
    failures.push(`${name} 必须固定为 ${version}`);
  }
}

const notices = await readFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
for (const required of [
  '@keeratita/heic-converter',
  'libheif',
  'libde265',
  'LGPL-3.0-or-later',
  'Public production release is blocked',
]) {
  if (!notices.includes(required)) failures.push(`第三方声明缺少：${required}`);
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('PHOTO_DEPENDENCIES=VALID');
