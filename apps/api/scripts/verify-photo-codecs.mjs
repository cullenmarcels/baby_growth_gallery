import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LibheifDecoder } from '@keeratita/heic-converter';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory =
  process.env.PHOTO_FIXTURE_DIR ?? path.resolve(scriptDirectory, '../test/fixtures');

async function assertStaticWebp(source, input) {
  const result = await input(source).webp({ quality: 84 }).toBuffer();
  const metadata = await sharp(result).metadata();
  if (metadata.format !== 'webp' || (metadata.pages ?? 1) !== 1) {
    throw new Error('安全 WebP 编码验证失败');
  }
}

const synthetic = {
  create: {
    width: 32,
    height: 24,
    channels: 4,
    background: { r: 60, g: 130, b: 210, alpha: 0.7 },
  },
};

for (const format of ['jpeg', 'png', 'webp']) {
  const source = await sharp(synthetic)[format]().toBuffer();
  const detected = await fileTypeFromBuffer(source);
  if (detected?.ext !== (format === 'jpeg' ? 'jpg' : format)) {
    throw new Error(`${format} 魔数识别失败`);
  }
  await assertStaticWebp(source, (buffer) => sharp(buffer).rotate().toColourspace('srgb'));
}

for (const fixture of ['synthetic-grid.heic', 'synthetic-grid.heif']) {
  const source = await readFile(path.join(fixtureDirectory, fixture));
  const detected = await fileTypeFromBuffer(source);
  if (detected?.ext !== 'heic') throw new Error(`${fixture} 魔数识别失败`);
  const decoder = new LibheifDecoder();
  try {
    const image = await decoder.decode(source);
    const rgba = Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);
    await assertStaticWebp(rgba, (buffer) =>
      sharp(buffer, {
        raw: { width: image.width, height: image.height, channels: 4 },
      }).toColourspace('srgb'),
    );
  } finally {
    decoder.free();
  }
}

console.log('PHOTO_CODECS=VALID (JPEG, PNG, WebP, HEIC, HEIF)');
