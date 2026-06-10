import { PNG } from 'pngjs';
import * as fs from 'fs';

const data = fs.readFileSync('../Test.png');
const png = PNG.sync.read(data);

let nonZeroRGB = 0;
let alphaZero = 0;
for (let i = 0; i < png.data.length; i += 4) {
  if (png.data[i] !== 0 || png.data[i+1] !== 0 || png.data[i+2] !== 0) {
    nonZeroRGB += 3;
  }
  if (png.data[i+3] === 0) {
    alphaZero++;
  }
}
console.log(`PNG Non-zero RGB bytes: ${nonZeroRGB}`);
console.log(`PNG Alpha==0 pixels: ${alphaZero}`);
