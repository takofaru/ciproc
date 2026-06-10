import { readFileSync, writeFileSync } from 'fs';
import { decompressCip, decodeCipHeader } from './lib/utils/cip-decoder';

try {
  const data = readFileSync('../Test-aritmatika.cip');
  const buffer = new Uint8Array(data);
  const result = decompressCip(buffer);
  
  // write result to ppm format
  const width = result.width;
  const height = result.height;
  const pixels = result.pixels;
  
  let ppm = `P3\n${width} ${height}\n255\n`;
  for (let i = 0; i < pixels.length; i += 3) {
    ppm += `${pixels[i]} ${pixels[i+1]} ${pixels[i+2]}\n`;
  }
  writeFileSync('debug.ppm', ppm);
  console.log('Saved to debug.ppm');
} catch (e) {
  console.error(e);
}
