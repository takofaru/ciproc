// ── Huffman Decode (pure JS) ─────────────────────────────────────────
interface HuffmanNode {
  symbol?: number
  freq: number
  left?: HuffmanNode
  right?: HuffmanNode
}

export function huffmanDecode(bits: number[], frequencies: [number, number][]): Uint8Array {
  const pq: HuffmanNode[] = []
  for (const [symbol, freq] of frequencies) {
    pq.push({ symbol, freq })
  }
  pq.sort((a, b) => (a.freq !== b.freq ? a.freq - b.freq : (a.symbol ?? -1) - (b.symbol ?? -1)))
  
  while (pq.length > 1) {
    const left = pq.shift()!
    const right = pq.shift()!
    pq.push({ freq: left.freq + right.freq, left, right })
    pq.sort((a, b) => (a.freq !== b.freq ? a.freq - b.freq : (a.symbol ?? -1) - (b.symbol ?? -1)))
  }

  const root = pq[0]
  const result: number[] = []
  let current = root

  for (const bit of bits) {
    current = bit === 0 ? current.left! : current.right!
    if (current.symbol !== undefined) {
      result.push(current.symbol)
      current = root
    }
  }

  return new Uint8Array(result)
}

// ── LZW Decode (pure JS) ────────────────────────────────────────────
function lzwDecode(codes: number[]): number[] {
  const dictionary = new Map<number, number[]>()
  for (let i = 0; i < 256; i++) dictionary.set(i, [i])
  
  let dictSize = 256
  let w = [codes[0]]
  const result = [...w]

  for (let i = 1; i < codes.length; i++) {
    const code = codes[i]
    let entry: number[] = []
    if (dictionary.has(code)) {
      entry = dictionary.get(code)!
    } else if (code === dictSize) {
      entry = [...w, w[0]]
    } else {
      throw new Error(`LZW decode error: code ${code}`)
    }
    result.push(...entry)
    if (dictSize < 65535) {
      dictionary.set(dictSize++, [...w, entry[0]])
    }
    w = entry
  }

  return result
}

// ── RLE Decode (pure JS) ────────────────────────────────────────────
export function rleDecode(rle: number[], totalPixels: number): Uint8Array {
  const indices = new Uint8Array(totalPixels)
  let idx = 0
  for (let i = 0; i < rle.length; i += 2) {
    const val = rle[i]
    const length = rle[i + 1]
    for (let j = 0; j < length; j++) {
      if (idx < totalPixels) {
        indices[idx++] = val
      } else {
        throw new Error(`RLE decode error: too many pixels`)
      }
    }
  }
  if (idx !== totalPixels) {
    throw new Error(`RLE decode error: decoded ${idx} pixels, expected ${totalPixels}`)
  }
  return indices
}

// ── Arithmetic Decode (pure JS) ─────────────────────────────────────────
function arithmeticDecode(data: Uint8Array, pInt: number, totalBits: number): number[] {
  const P_SCALE = 65536;

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

// ── Main Decompress Function ────────────────────────────────────────
export function decompressCip(data: Uint8Array): { pixels: Uint8Array; width: number; height: number; colors: number } {
  const meta = decodeCipHeader(data);
  const totalPixels = meta.width * meta.height;

  const P_SCALE = 65536;
  const pMin = Math.floor(Math.max(0, (meta.pByte - 0.5) / 255) * P_SCALE);
  const pMax = Math.ceil(Math.min(1, (meta.pByte + 0.5) / 255) * P_SCALE);
  const pCenter = Math.round((meta.pByte / 255) * P_SCALE);

  const pIntCandidates: number[] = [];
  for (let pInt = pMin; pInt <= pMax; pInt++) {
    pIntCandidates.push(pInt);
  }
  pIntCandidates.sort((a, b) => Math.abs(a - pCenter) - Math.abs(b - pCenter));

  for (const pInt of pIntCandidates) {
    try {
      const bits = arithmeticDecode(meta.compressedBytes, pInt, meta.totalBits);
      const huffmanBytes = huffmanDecode(bits, meta.frequencies);
      if (huffmanBytes.length % 2 !== 0) continue;

      const lzwCodes: number[] = [];
      for (let i = 0; i < huffmanBytes.length; i += 2) {
        lzwCodes.push((huffmanBytes[i] << 8) | huffmanBytes[i + 1]);
      }
      const rleStream = lzwDecode(lzwCodes);
      const indices = rleDecode(rleStream, totalPixels);

      const pixels = new Uint8Array(totalPixels * 3);
      for (let i = 0; i < indices.length; i++) {
        const [r, g, b] = meta.palette[indices[i]];
        pixels[i * 3] = r;
        pixels[i * 3 + 1] = g;
        pixels[i * 3 + 2] = b;
      }
      return { pixels, width: meta.width, height: meta.height, colors: meta.palette.length };
    } catch (e) {
      // Ignore and try next pInt
    }
  }

  throw new Error("Failed to decode CIP file: All p_int candidates failed");
}

export interface CipMetadata {
  width: number
  height: number
  palette: [number, number, number][]
  frequencies: [number, number][]
  totalBits: number
  pByte: number
  compressedBytes: Uint8Array
  method: 'F' | 'M'
}

export function decodeCipHeader(data: Uint8Array): CipMetadata {
  if (!(data[0] === 67 && data[1] === 73 && data[2] === 80)) {
    throw new Error("Invalid .cip file")
  }

  const magicLen = data[3] === 32 ? 4 : 3  // "CIP " or "CIP"
  const offset0 = magicLen

  // Detect format by checking:
  // - 4-byte magic "CIP " (byte 3 = 32) = new format
  // - Has method indicator at offset0+14 (byte 18) = 'F' or 'M' = new format
  // Old format (3-byte magic "CIP"): byte 8 is total_bits, byte 9 is p_byte
  const isNewFormat = magicLen === 4 && data.length >= offset0 + 22 && data[offset0 + 14] >= 65 && data[offset0 + 14] <= 90; // 'A'-'Z'
  const oldFormat = !isNewFormat

  const width = new DataView(data.buffer).getUint16(offset0 + 0, true)
  const height = new DataView(data.buffer).getUint16(offset0 + 2, true)
  const k = data[offset0 + 4]

  let pByte: number, totalBits: number, compressedSize: number, method: 'F' | 'M' = 'F', frequenciesCount: number, offset: number

  if (oldFormat) {
    // Old format: 19-byte header (after magic)
    totalBits = data[offset0 + 5]  // Stored as single byte (old bug)
    pByte = data[offset0 + 6]
    compressedSize = new DataView(data.buffer).getUint32(offset0 + 7, true)
    frequenciesCount = new DataView(data.buffer).getUint16(offset0 + 11, true)  // F stored at 11 in old format
    offset = offset0 + 13
  } else {
    // New format: 23-byte header (after magic "CIP ")
    // offset0 = 4
    // byte 8 (offset0+4): K
    // byte 9 (offset0+5): p_byte
    // bytes 10-13 (offset0+6 to offset0+9): total_bits
    // bytes 14-17 (offset0+10 to offset0+13): compressed_size
    // byte 18 (offset0+14): method
    // bytes 19-22 (offset0+15 to offset0+18): frequencies_count
    pByte = data[offset0 + 5]
    totalBits = new DataView(data.buffer).getUint32(offset0 + 6, true)
    compressedSize = new DataView(data.buffer).getUint32(offset0 + 10, true)
    method = String.fromCharCode(data[offset0 + 14]) as 'F' | 'M'
    frequenciesCount = new DataView(data.buffer).getUint32(offset0 + 15, true)
    // Header size: 4-byte magic + 19-byte header = 23 bytes
    offset = offset0 + 19
  }

  const palette: [number, number, number][] = []
  for (let i = 0; i < k; i++) {
    palette.push([data[offset], data[offset + 1], data[offset + 2]])
    offset += 3
  }

  const frequencies: [number, number][] = []
  for (let i = 0; i < frequenciesCount; i++) {
    const symbol = data[offset]
    const freq = new DataView(data.buffer).getUint32(offset + 1, true)
    frequencies.push([symbol, freq])
    offset += 5
  }

  const compressedBytes = data.slice(offset, offset + compressedSize)

  // Debug: verify compressed size calculation
  if (compressedSize > data.length - offset) {
    throw new Error(`Invalid .cip file: corrupted data or incompatible format`)
  }

  return { width, height, palette, frequencies, totalBits, pByte, compressedBytes, method }
}


