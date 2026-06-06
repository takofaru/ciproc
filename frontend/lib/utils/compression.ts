export interface CompressionProgress {
  percentage: number
  stage: string
}

// ── Image Pixel Extraction and Reconstruction ───────────────────
export function getImagePixels(imgUrl: string): Promise<{ pixels: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = imgUrl
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Failed to get 2D canvas context"))
        return
      }
      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, img.width, img.height)
      const data = imgData.data
      const pixels = new Uint8Array(img.width * img.height * 3)
      for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
        pixels[j] = data[i]
        pixels[j + 1] = data[i + 1]
        pixels[j + 2] = data[i + 2]
      }
      resolve({ pixels, width: img.width, height: img.height })
    }
    img.onerror = (e) => reject(e)
  })
}

export function pixelsToDataUrl(pixels: Uint8Array, width: number, height: number): string {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas 2D context")

  const imgData = ctx.createImageData(width, height)
  const data = imgData.data

  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    data[i] = pixels[j]
    data[i + 1] = pixels[j + 1]
    data[i + 2] = pixels[j + 2]
    data[i + 3] = 255 // Opaque Alpha
  }

  ctx.putImageData(imgData, 0, 0)
  return canvas.toDataURL("image/png")
}

// ── 1. Color Quantization (Weighted Median Cut) ──────────────────
export function quantize(
  pixels: Uint8Array,
  K: number
): { palette: [number, number, number][]; indices: Uint8Array } {
  // Step 1: Group pixels into 16x16x16 grid bins
  const bins = new Map<number, { rSum: number; gSum: number; bSum: number; count: number }>()
  
  for (let i = 0; i < pixels.length; i += 3) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const rIdx = r >> 4
    const gIdx = g >> 4
    const bIdx = b >> 4
    const binId = (rIdx << 8) | (gIdx << 4) | bIdx
    
    let bin = bins.get(binId)
    if (!bin) {
      bin = { rSum: 0, gSum: 0, bSum: 0, count: 0 }
      bins.set(binId, bin)
    }
    bin.rSum += r
    bin.gSum += g
    bin.bSum += b
    bin.count++
  }

  // Step 2: Convert bins to box items
  interface BoxItem {
    r: number
    g: number
    b: number
    count: number
    binId: number
  }

  const items: BoxItem[] = []
  for (const [binId, bin] of bins.entries()) {
    items.push({
      r: bin.rSum / bin.count,
      g: bin.gSum / bin.count,
      b: bin.bSum / bin.count,
      count: bin.count,
      binId,
    })
  }

  // Step 3: Median Cut algorithm
  class Box {
    items: BoxItem[]
    totalCount: number

    constructor(items: BoxItem[]) {
      this.items = items
      this.totalCount = items.reduce((sum, item) => sum + item.count, 0)
    }

    getRange(): { channel: "r" | "g" | "b"; range: number } {
      let minR = 255, maxR = 0
      let minG = 255, maxG = 0
      let minB = 255, maxB = 0

      for (const item of this.items) {
        if (item.r < minR) minR = item.r
        if (item.r > maxR) maxR = item.r
        if (item.g < minG) minG = item.g
        if (item.g > maxG) maxG = item.g
        if (item.b < minB) minB = item.b
        if (item.b > maxB) maxB = item.b
      }

      const rRange = maxR - minR
      const gRange = maxG - minG
      const bRange = maxB - minB

      if (rRange >= gRange && rRange >= bRange) {
        return { channel: "r", range: rRange }
      } else if (gRange >= rRange && gRange >= bRange) {
        return { channel: "g", range: gRange }
      } else {
        return { channel: "b", range: bRange }
      }
    }
  }

  const boxes: Box[] = [new Box(items)]

  while (boxes.length < K) {
    let bestBoxIdx = -1
    let maxMetric = -1

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i]
      if (box.items.length < 2) continue

      const { range } = box.getRange()
      const metric = range * box.totalCount
      if (metric > maxMetric) {
        maxMetric = metric
        bestBoxIdx = i
      }
    }

    if (bestBoxIdx === -1) break

    const boxToSplit = boxes[bestBoxIdx]
    const { channel } = boxToSplit.getRange()

    boxToSplit.items.sort((a, b) => a[channel] - b[channel])

    const halfWeight = boxToSplit.totalCount / 2
    let accumulatedWeight = 0
    let splitIdx = 0
    for (let i = 0; i < boxToSplit.items.length - 1; i++) {
      accumulatedWeight += boxToSplit.items[i].count
      if (accumulatedWeight >= halfWeight) {
        splitIdx = i + 1
        break
      }
    }

    if (splitIdx === 0) {
      splitIdx = Math.floor(boxToSplit.items.length / 2)
    }

    const leftItems = boxToSplit.items.slice(0, splitIdx)
    const rightItems = boxToSplit.items.slice(splitIdx)

    boxes.splice(bestBoxIdx, 1, new Box(leftItems), new Box(rightItems))
  }

  // Step 4: Build palette from boxes
  const palette: [number, number, number][] = []
  const binToPaletteIdx = new Map<number, number>()

  for (let k = 0; k < boxes.length; k++) {
    const box = boxes[k]
    let rSum = 0, gSum = 0, bSum = 0, totalCount = 0
    for (const item of box.items) {
      rSum += item.r * item.count
      gSum += item.g * item.count
      bSum += item.b * item.count
      totalCount += item.count
    }

    const pr = Math.round(rSum / totalCount)
    const pg = Math.round(gSum / totalCount)
    const pb = Math.round(bSum / totalCount)
    palette.push([pr, pg, pb])

    for (const item of box.items) {
      binToPaletteIdx.set(item.binId, k)
    }
  }

  // Step 5: Map pixels to palette indices
  const numPixels = pixels.length / 3
  const indices = new Uint8Array(numPixels)

  for (let i = 0; i < numPixels; i++) {
    const r = pixels[i * 3]
    const g = pixels[i * 3 + 1]
    const b = pixels[i * 3 + 2]
    const rIdx = r >> 4
    const gIdx = g >> 4
    const bIdx = b >> 4
    const binId = (rIdx << 8) | (gIdx << 4) | bIdx

    let pIdx = binToPaletteIdx.get(binId)
    if (pIdx === undefined) {
      let minDist = Infinity
      let bestIdx = 0
      for (let k = 0; k < palette.length; k++) {
        const pr = palette[k][0]
        const pg = palette[k][1]
        const pb = palette[k][2]
        const dist = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb)
        if (dist < minDist) {
          minDist = dist
          bestIdx = k
        }
      }
      pIdx = bestIdx
    }
    indices[i] = pIdx
  }

  return { palette, indices }
}

// ── 2. Run-Length Encoding (RLE) ──────────────────────────────────
export function rleEncode(indices: Uint8Array): number[] {
  const rle: number[] = []
  if (indices.length === 0) return rle

  let currentVal = indices[0]
  let runLen = 1

  for (let i = 1; i < indices.length; i++) {
    const val = indices[i]
    if (val === currentVal && runLen < 255) {
      runLen++
    } else {
      rle.push(currentVal, runLen)
      currentVal = val
      runLen = 1
    }
  }
  rle.push(currentVal, runLen)
  return rle
}

export function rleDecode(rle: number[] | Uint8Array, totalPixels: number): Uint8Array {
  const indices = new Uint8Array(totalPixels)
  let idx = 0
  for (let i = 0; i < rle.length; i += 2) {
    const val = rle[i]
    const len = rle[i + 1]
    for (let j = 0; j < len; j++) {
      indices[idx++] = val
    }
  }
  return indices
}

// ── 3. Lempel-Ziv-Welch (LZW) ─────────────────────────────────────
export function lzwEncode(input: number[]): number[] {
  let dictSize = 256
  const dictionary = new Map<string, number>()
  for (let i = 0; i < 256; i++) {
    dictionary.set(String.fromCharCode(i), i)
  }

  let w = ""
  const result: number[] = []

  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    const wc = w + String.fromCharCode(c)
    if (dictionary.has(wc)) {
      w = wc
    } else {
      result.push(dictionary.get(w)!)
      if (dictSize < 65535) {
        dictionary.set(wc, dictSize++)
      }
      w = String.fromCharCode(c)
    }
  }
  if (w !== "") {
    result.push(dictionary.get(w)!)
  }
  return result
}

export function lzwDecode(input: number[] | Uint16Array): number[] {
  if (input.length === 0) return []
  let dictSize = 256
  const dictionary = new Map<number, number[]>()
  for (let i = 0; i < 256; i++) {
    dictionary.set(i, [i])
  }

  let w = [input[0]]
  const result: number[] = [...w]

  for (let i = 1; i < input.length; i++) {
    const k = input[i]
    let entry: number[] = []

    if (dictionary.has(k)) {
      entry = dictionary.get(k)!
    } else if (k === dictSize) {
      entry = [...w, w[0]]
    } else {
      throw new Error(`LZW Decode error: invalid code ${k}`)
    }

    result.push(...entry)

    if (dictSize < 65535) {
      dictionary.set(dictSize++, [...w, entry[0]])
    }
    w = entry
  }
  return result
}

// ── 4. Huffman Coding (with Stable Sorting Tie-Breaker) ───────────
interface HuffmanNode {
  symbol?: number
  freq: number
  left?: HuffmanNode
  right?: HuffmanNode
}

export function huffmanEncode(input: number[]): {
  bits: number[]
  frequencies: [number, number][]
} {
  const freqs = new Map<number, number>()
  for (const sym of input) {
    freqs.set(sym, (freqs.get(sym) || 0) + 1)
  }

  if (freqs.size === 0) {
    return { bits: [], frequencies: [] }
  }

  const pq: HuffmanNode[] = []
  for (const [symbol, freq] of freqs.entries()) {
    pq.push({ symbol, freq })
  }

  // Stable sort tie-breaker to ensure exact match on decode
  const sortPQ = () =>
    pq.sort((a, b) => {
      if (a.freq !== b.freq) {
        return a.freq - b.freq
      }
      const aVal = a.symbol !== undefined ? a.symbol : -1
      const bVal = b.symbol !== undefined ? b.symbol : -1
      return aVal - bVal
    })

  while (pq.length > 1) {
    sortPQ()
    const left = pq.shift()!
    const right = pq.shift()!
    const parent: HuffmanNode = {
      freq: left.freq + right.freq,
      left,
      right,
    }
    pq.push(parent)
  }

  const root = pq[0]
  const codes = new Map<number, string>()
  const traverse = (node: HuffmanNode, path: string) => {
    if (node.symbol !== undefined) {
      codes.set(node.symbol, path)
      return
    }
    if (node.left) traverse(node.left, path + "0")
    if (node.right) traverse(node.right, path + "1")
  }

  if (root.symbol !== undefined) {
    codes.set(root.symbol, "0")
  } else {
    traverse(root, "")
  }

  const bits: number[] = []
  for (const sym of input) {
    const code = codes.get(sym)!
    for (let i = 0; i < code.length; i++) {
      bits.push(code[i] === "0" ? 0 : 1)
    }
  }

  return {
    bits,
    frequencies: Array.from(freqs.entries()),
  }
}

export function huffmanDecode(bits: number[] | Uint8Array, frequencies: [number, number][]): number[] {
  if (frequencies.length === 0) return []

  const pq: HuffmanNode[] = []
  for (const [symbol, freq] of frequencies) {
    pq.push({ symbol, freq })
  }

  const sortPQ = () =>
    pq.sort((a, b) => {
      if (a.freq !== b.freq) {
        return a.freq - b.freq
      }
      const aVal = a.symbol !== undefined ? a.symbol : -1
      const bVal = b.symbol !== undefined ? b.symbol : -1
      return aVal - bVal
    })

  while (pq.length > 1) {
    sortPQ()
    const left = pq.shift()!
    const right = pq.shift()!
    const parent: HuffmanNode = {
      freq: left.freq + right.freq,
      left,
      right,
    }
    pq.push(parent)
  }

  const root = pq[0]
  const result: number[] = []

  if (root.symbol !== undefined) {
    for (let i = 0; i < bits.length; i++) {
      result.push(root.symbol)
    }
    return result
  }

  let current = root
  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i]
    if (bit === 0) {
      current = current.left!
    } else {
      current = current.right!
    }

    if (current.symbol !== undefined) {
      result.push(current.symbol)
      current = root
    }
  }

  return result
}

// ── 5. Stream-based Binary Arithmetic Coding (renormalization) ──
export function arithmeticEncodeStream(bits: number[]): {
  bytes: Uint8Array
  pByte: number
} {
  const total = bits.length
  let ones = 0
  for (const b of bits) {
    if (b === 1) ones++
  }

  let p = total > 0 ? ones / total : 0.5
  if (p < 0.01) p = 0.01
  if (p > 0.99) p = 0.99

  const pByte = Math.round(p * 255)
  const pQuantized = pByte / 255
  const P_SCALE = 65536
  const pInt = Math.round(pQuantized * P_SCALE)

  const outputBits: number[] = []
  let low = 0
  let high = 0xffffffff
  let underflow = 0

  const outputBit = (b: number) => {
    outputBits.push(b)
    while (underflow > 0) {
      outputBits.push(b === 0 ? 1 : 0)
      underflow--
    }
  }

  for (const bit of bits) {
    const range = high - low + 1
    const split = low + Math.floor((range * (P_SCALE - pInt)) / P_SCALE)

    if (bit === 0) {
      high = split
    } else {
      low = split + 1
    }

    // Renormalize
    while (true) {
      if ((low & 0x80000000) === (high & 0x80000000)) {
        const msb = (low & 0x80000000) >>> 31
        outputBit(msb)
        low = (low << 1) >>> 0
        high = ((high << 1) | 1) >>> 0
      } else if ((low & 0x40000000) !== 0 && (high & 0x40000000) === 0) {
        underflow++
        low = ((low << 1) ^ 0x80000000) >>> 0
        high = (((high << 1) ^ 0x80000000) | 1) >>> 0
      } else {
        break
      }
    }
  }

  // Flush remaining bits correctly inside the range [low, high]
  if (low < 0x40000000) {
    outputBit(0)
    outputBit(1)
  } else {
    outputBit(1)
    outputBit(0)
  }

  // Pack bits to bytes
  const byteLen = Math.ceil(outputBits.length / 8)
  const bytes = new Uint8Array(byteLen)
  for (let i = 0; i < outputBits.length; i++) {
    const byteIdx = Math.floor(i / 8)
    const bitIdx = 7 - (i % 8)
    if (outputBits[i] === 1) {
      bytes[byteIdx] |= (1 << bitIdx)
    }
  }

  return { bytes, pByte }
}

export function arithmeticDecodeStream(
  bytes: Uint8Array,
  pByte: number,
  totalBits: number
): number[] {
  const p = pByte / 255
  const P_SCALE = 65536
  const pInt = Math.round(p * P_SCALE)

  const inputBits: number[] = []
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
      inputBits.push((byte >>> bitIdx) & 1)
    }
  }

  let bitPtr = 0
  const readBit = () => {
    if (bitPtr < inputBits.length) {
      return inputBits[bitPtr++]
    }
    return 0
  }

  let value = 0
  for (let i = 0; i < 32; i++) {
    value = ((value << 1) | readBit()) >>> 0
  }

  let low = 0
  let high = 0xffffffff
  const decodedBits: number[] = []

  for (let i = 0; i < totalBits; i++) {
    const range = high - low + 1
    const split = low + Math.floor((range * (P_SCALE - pInt)) / P_SCALE)

    if (value <= split) {
      decodedBits.push(0)
      high = split
    } else {
      decodedBits.push(1)
      low = split + 1
    }

    // Renormalize
    while (true) {
      if ((low & 0x80000000) === (high & 0x80000000)) {
        low = (low << 1) >>> 0
        high = ((high << 1) | 1) >>> 0
        value = ((value << 1) | readBit()) >>> 0
      } else if ((low & 0x40000000) !== 0 && (high & 0x40000000) === 0) {
        low = ((low << 1) ^ 0x80000000) >>> 0
        high = (((high << 1) ^ 0x80000000) | 1) >>> 0
        value = (((value << 1) ^ 0x80000000) | readBit()) >>> 0
      } else {
        break
      }
    }
  }

  return decodedBits
}

// ── Binary Serialization (Stream-based) ──────────────────────────
export function serializeCip(
  width: number,
  height: number,
  palette: [number, number, number][],
  frequencies: [number, number][],
  totalBits: number,
  pByte: number,
  arithmeticBytes: Uint8Array
): Uint8Array {
  const K = palette.length
  const F = frequencies.length
  const A = arithmeticBytes.length

  const bufferSize = 19 + K * 3 + F * 5 + A
  const buffer = new ArrayBuffer(bufferSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // Magic bytes "CIP"
  bytes[0] = 67 // 'C'
  bytes[1] = 73 // 'I'
  bytes[2] = 80 // 'P'

  // Header sizes
  view.setUint16(3, width, true)
  view.setUint16(5, height, true)
  view.setUint8(7, K)
  view.setUint16(8, F, true)
  view.setUint32(10, totalBits, true)
  view.setUint8(14, pByte)
  view.setUint32(15, A, true)

  let offset = 19

  // Palette payload
  for (let i = 0; i < K; i++) {
    bytes[offset++] = palette[i][0]
    bytes[offset++] = palette[i][1]
    bytes[offset++] = palette[i][2]
  }

  // Huffman frequencies payload (symbols are 0-255 bytes)
  for (let i = 0; i < F; i++) {
    view.setUint8(offset, frequencies[i][0])
    view.setUint32(offset + 1, frequencies[i][1], true)
    offset += 5
  }

  // Arithmetic bytes payload
  bytes.set(arithmeticBytes, offset)

  return bytes
}

export function deserializeCip(bytes: Uint8Array): {
  width: number
  height: number
  palette: [number, number, number][]
  frequencies: [number, number][]
  totalBits: number
  pByte: number
  arithmeticBytes: Uint8Array
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  if (bytes[0] !== 67 || bytes[1] !== 73 || bytes[2] !== 80) {
    throw new Error("Invalid file format: not a .cip file")
  }

  const width = view.getUint16(3, true)
  const height = view.getUint16(5, true)
  const K = view.getUint8(7)
  const F = view.getUint16(8, true)
  const totalBits = view.getUint32(10, true)
  const pByte = view.getUint8(14)
  const A = view.getUint32(15, true)

  let offset = 19

  // Read palette
  const palette: [number, number, number][] = []
  for (let i = 0; i < K; i++) {
    palette.push([bytes[offset], bytes[offset + 1], bytes[offset + 2]])
    offset += 3
  }

  // Read frequencies
  const frequencies: [number, number][] = []
  for (let i = 0; i < F; i++) {
    const symbol = view.getUint8(offset)
    const freq = view.getUint32(offset + 1, true)
    frequencies.push([symbol, freq])
    offset += 5
  }

  // Read arithmetic bytes
  const arithmeticBytes = bytes.slice(offset, offset + A)

  return {
    width,
    height,
    palette,
    frequencies,
    totalBits,
    pByte,
    arithmeticBytes,
  }
}

// ── Chunked Asynchronous Runner Helpers ───────────────────────────
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function compressImageCipAsync(
  imgUrl: string,
  quality: number, // 10 to 100
  onProgress: (progress: CompressionProgress) => void
): Promise<Uint8Array> {
  onProgress({ percentage: 5, stage: "Extracting RGB pixels from image..." })
  await sleep(30)
  const { pixels, width, height } = await getImagePixels(imgUrl)

  // Map quality to K colors (16 to 256)
  const K = Math.max(16, Math.min(256, Math.round(16 + ((quality - 10) / 90) * 240)))

  onProgress({ percentage: 20, stage: `Quantizing colors to ${K} palette entries (Median Cut)...` })
  await sleep(30)
  const { palette, indices } = quantize(pixels, K)

  onProgress({ percentage: 40, stage: "Running Run-Length Encoding (RLE) on indices..." })
  await sleep(30)
  const rle = rleEncode(indices)

  onProgress({ percentage: 60, stage: "Executing LZW compression..." })
  await sleep(30)
  const lzwCodes = lzwEncode(rle)

  // Split LZW codes (0-65535) into high/low bytes to restrict Huffman alphabet size to 256
  const lzwBytes = new Uint8Array(lzwCodes.length * 2)
  for (let i = 0; i < lzwCodes.length; i++) {
    lzwBytes[i * 2] = lzwCodes[i] >> 8
    lzwBytes[i * 2 + 1] = lzwCodes[i] & 0xff
  }

  onProgress({ percentage: 80, stage: "Constructing Huffman tree and encoding..." })
  await sleep(30)
  const huffmanInput = Array.from(lzwBytes)
  const huffman = huffmanEncode(huffmanInput)

  onProgress({ percentage: 95, stage: "Applying Arithmetic range coding on bits..." })
  await sleep(30)
  const { bytes: arithmeticBytes, pByte } = arithmeticEncodeStream(huffman.bits)

  onProgress({ percentage: 98, stage: "Serializing to binary .cip format..." })
  await sleep(10)
  const fileBytes = serializeCip(
    width,
    height,
    palette,
    huffman.frequencies,
    huffman.bits.length,
    pByte,
    arithmeticBytes
  )

  onProgress({ percentage: 100, stage: "Compression completed successfully!" })
  return fileBytes
}

export async function decompressImageCipAsync(
  fileBytes: Uint8Array,
  onProgress: (progress: CompressionProgress) => void
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number; ratio: number }> {
  onProgress({ percentage: 10, stage: "Reading binary file header and payloads..." })
  await sleep(30)
  const {
    width,
    height,
    palette,
    frequencies,
    totalBits,
    pByte,
    arithmeticBytes,
  } = deserializeCip(fileBytes)

  onProgress({ percentage: 35, stage: "Decoding Arithmetic range codes..." })
  await sleep(30)
  const huffmanBits = arithmeticDecodeStream(arithmeticBytes, pByte, totalBits)

  onProgress({ percentage: 60, stage: "Decoding Huffman bitstream..." })
  await sleep(30)
  const huffmanDecoded = huffmanDecode(huffmanBits, frequencies)

  onProgress({ percentage: 80, stage: "Reconstructing LZW codes..." })
  await sleep(30)
  const lzwCodes = new Uint16Array(huffmanDecoded.length / 2)
  for (let i = 0; i < lzwCodes.length; i++) {
    lzwCodes[i] = (huffmanDecoded[i * 2] << 8) | huffmanDecoded[i * 2 + 1]
  }
  const rleStream = lzwDecode(lzwCodes)

  onProgress({ percentage: 92, stage: "Expanding RLE runs..." })
  await sleep(30)
  const indices = rleDecode(rleStream, width * height)

  onProgress({ percentage: 96, stage: "Mapping palette colors to RGB buffer..." })
  await sleep(20)
  const pixels = new Uint8Array(width * height * 3)
  for (let i = 0; i < indices.length; i++) {
    const colorIdx = indices[i]
    const color = palette[colorIdx] || [0, 0, 0]
    pixels[i * 3] = color[0]
    pixels[i * 3 + 1] = color[1]
    pixels[i * 3 + 2] = color[2]
  }

  onProgress({ percentage: 99, stage: "Generating preview image..." })
  await sleep(10)
  const dataUrl = pixelsToDataUrl(pixels, width, height)

  const originalSize = width * height * 3
  const compressedSize = fileBytes.byteLength
  const ratio = (1 - compressedSize / originalSize) * 100

  onProgress({ percentage: 100, stage: "Decompression completed successfully!" })
  return {
    dataUrl,
    originalSize,
    compressedSize,
    ratio,
  }
}
