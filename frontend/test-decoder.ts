import { readFileSync, writeFileSync } from 'fs';
import { decodeCipHeader, huffmanDecode } from './lib/utils/cip-decoder';

// ── Arithmetic Decode (pure JS) ─────────────────────────────────────────
function arithmeticDecode(data: Uint8Array, pByte: number, totalBits: number): number[] {
  const p = pByte / 255;
  const P_SCALE = 65536;
  const pInt = Math.round(p * P_SCALE);

  const inputBits: number[] = [];
  for (let i = 0; i < data.length; i++) {
    for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
      inputBits.push((data[i] >> bitIdx) & 1);
    }
  }

  let bitPtr = 0;
  function readBit() {
    if (bitPtr < inputBits.length) {
      return inputBits[bitPtr++];
    }
    return 0;
  }

  let value = 0;
  for (let i = 0; i < 32; i++) {
    value = ((value * 2) + readBit()) >>> 0;
  }

  let low = 0;
  let high = 0xFFFFFFFF;
  const decoded: number[] = [];

  for (let i = 0; i < totalBits; i++) {
    const rangeSize = high - low + 1; // 4294967296 max, safe in double
    const split = (low + Math.floor((rangeSize * (P_SCALE - pInt)) / P_SCALE)) >>> 0;

    if ((value >>> 0) <= (split >>> 0)) {
      decoded.push(0);
      high = split;
    } else {
      decoded.push(1);
      low = (split + 1) >>> 0;
    }

    while (true) {
      if ((low & 0x80000000) === (high & 0x80000000)) {
        low = (low << 1) >>> 0;
        high = ((high << 1) | 1) >>> 0;
        value = ((value << 1) | readBit()) >>> 0;
      } else if ((low & 0x40000000) !== 0 && (high & 0x40000000) === 0) {
        low = ((low << 1) ^ 0x80000000) >>> 0;
        high = (((high << 1) ^ 0x80000000) | 1) >>> 0;
        value = (((value << 1) ^ 0x80000000) | readBit()) >>> 0;
      } else {
        break;
      }
    }
  }

  return decoded;
}

try {
  const data = readFileSync('../Test.cip');
  const buffer = new Uint8Array(data);
  const header = decodeCipHeader(buffer);
  
  const bits = arithmeticDecode(header.compressedBytes, header.pByte, header.totalBits);
  const huffmanBytes = huffmanDecode(bits, header.frequencies);
  writeFileSync('ts_huffman.bin', huffmanBytes);
  console.log(`TS huffman decoded ${huffmanBytes.length} bytes.`);
} catch (e) {
  console.error('Error:', e);
}
