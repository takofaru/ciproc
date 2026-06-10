import { readFileSync } from 'fs';
import { decompressCip, decodeCipHeader } from './lib/utils/cip-decoder';

try {
  const data = readFileSync('../Test-huffman.cip');
  const buffer = new Uint8Array(data);
  const meta = decodeCipHeader(buffer);
  console.log(`Test-huffman.cip: ${meta.width}x${meta.height}, K=${meta.palette.length}, method: ${meta.method}`);
  console.log(`Palette first 10:`, meta.palette.slice(0, 10));
  
  const result = decompressCip(buffer);
  let nonZeroCount = 0;
  for (let i = 0; i < result.pixels.length; i++) {
    if (result.pixels[i] !== 0) nonZeroCount++;
  }
  console.log(`Non-zero pixels out of ${result.pixels.length}: ${nonZeroCount}`);
  console.log(`Decompressed successfully!`);
} catch (e) {
  console.error('Error decoding:', e);
}
