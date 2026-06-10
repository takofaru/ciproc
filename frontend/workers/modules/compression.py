import numpy as np
from PIL import Image
import struct

# ── Compression Methods ─────────────────────────────────────────────
METHOD_FAST = "fast"      # LZW + Huffman (Standard, Fast)
METHOD_MAX = "max"        # LZW + Arithmetic (Max ratio, Slower)

# ── Color Quantization (Median Cut) ─────────────────────────────────
def quantize(pixels: np.ndarray, K: int) -> tuple[np.ndarray, np.ndarray]:
    """Color quantization using Median Cut algorithm."""
    bins = {}
    for i in range(0, len(pixels), 3):
        r, g, b = pixels[i], pixels[i+1], pixels[i+2]
        bin_id = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
        if bin_id not in bins:
            bins[bin_id] = {'r_sum': 0, 'g_sum': 0, 'b_sum': 0, 'count': 0}
        bins[bin_id]['r_sum'] += r
        bins[bin_id]['g_sum'] += g
        bins[bin_id]['b_sum'] += b
        bins[bin_id]['count'] += 1

    items = []
    for bin_id, data in bins.items():
        items.append({
            'r': data['r_sum'] / data['count'],
            'g': data['g_sum'] / data['count'],
            'b': data['b_sum'] / data['count'],
            'count': data['count'],
            'bin_id': bin_id
        })

    class Box:
        def __init__(self, items):
            self.items = items
            self.total_count = sum(item['count'] for item in items)

        def get_range(self):
            min_r, max_r = 255, 0
            min_g, max_g = 255, 0
            min_b, max_b = 255, 0
            for item in self.items:
                min_r, max_r = min(min_r, item['r']), max(max_r, item['r'])
                min_g, max_g = min(min_g, item['g']), max(max_g, item['g'])
                min_b, max_b = min(min_b, item['b']), max(max_b, item['b'])
            r_range, g_range, b_range = max_r - min_r, max_g - min_g, max_b - min_b
            if r_range >= g_range and r_range >= b_range:
                return 'r', r_range
            elif g_range >= r_range and g_range >= b_range:
                return 'g', g_range
            return 'b', b_range

    boxes = [Box(items)]
    while len(boxes) < K:
        best_idx, max_metric = -1, -1
        for i, box in enumerate(boxes):
            if len(box.items) < 2:
                continue
            channel, rng = box.get_range()
            metric = rng * box.total_count
            if metric > max_metric:
                max_metric, best_idx = metric, i
        if best_idx == -1:
            break
        box = boxes[best_idx]
        channel, _ = box.get_range()
        box.items.sort(key=lambda x: x[channel])
        half_weight = box.total_count / 2
        accumulated = 0
        split_idx = 0
        for i, item in enumerate(box.items[:-1]):
            accumulated += item['count']
            if accumulated >= half_weight:
                split_idx = i + 1
                break
        if split_idx == 0:
            split_idx = len(box.items) // 2
        left = box.items[:split_idx]
        right = box.items[split_idx:]
        boxes[best_idx:best_idx+1] = [Box(left), Box(right)]

    palette = []
    bin_to_idx = {}
    for k, box in enumerate(boxes):
        r_sum = g_sum = b_sum = total = 0
        for item in box.items:
            r_sum += item['r'] * item['count']
            g_sum += item['g'] * item['count']
            b_sum += item['b'] * item['count']
            total += item['count']
        palette.append((round(r_sum / total), round(g_sum / total), round(b_sum / total)))
        for item in box.items:
            bin_to_idx[item['bin_id']] = k

    num_pixels = len(pixels) // 3
    indices = np.zeros(num_pixels, dtype=np.uint8)
    for i in range(num_pixels):
        r, g, b = pixels[i*3], pixels[i*3+1], pixels[i*3+2]
        bin_id = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
        if bin_id in bin_to_idx:
            indices[i] = bin_to_idx[bin_id]
        else:
            min_dist, best_idx = float('inf'), 0
            for k, (pr, pg, pb) in enumerate(palette):
                dist = (r-pr)**2 + (g-pg)**2 + (b-pb)**2
                if dist < min_dist:
                    min_dist, best_idx = dist, k
            indices[i] = best_idx

    return np.array(palette, dtype=np.uint8), indices


# ── Run-Length Encoding ─────────────────────────────────────────────
def rle_encode(indices: np.ndarray) -> np.ndarray:
    """Run-Length Encoding."""
    if len(indices) == 0:
        return np.array([], dtype=np.uint8)
    rle = []
    current, run_len = indices[0], 1
    for val in indices[1:]:
        if val == current and run_len < 255:
            run_len += 1
        else:
            rle.extend([current, run_len])
            current, run_len = val, 1
    rle.extend([current, run_len])
    return np.array(rle, dtype=np.uint8)


def rle_decode(rle: np.ndarray, total_pixels: int) -> np.ndarray:
    """Decode RLE."""
    indices = np.zeros(total_pixels, dtype=np.uint8)
    idx = 0
    for i in range(0, len(rle) - 1, 2):
        val = rle[i]
        length = int(rle[i+1])
        indices[idx:idx+length] = val
        idx += length
    return indices


# ── LZW Encoding/Decoding ───────────────────────────────────────────
def lzw_encode(input_codes: np.ndarray) -> np.ndarray:
    """LZW compression."""
    dictionary = {bytes([i]): i for i in range(256)}
    dict_size = 256
    w = b""
    result = []
    for code in input_codes:
        wc = w + bytes([code])
        if wc in dictionary:
            w = wc
        else:
            result.append(dictionary[w])
            if dict_size < 65535:
                dictionary[wc] = dict_size
                dict_size += 1
            w = bytes([code])
    if w:
        result.append(dictionary[w])
    return np.array(result, dtype=np.uint16)


def lzw_decode(codes: np.ndarray) -> np.ndarray:
    """LZW decompression."""
    dictionary = {i: bytes([i]) for i in range(256)}
    dict_size = 256
    w = bytes([codes[0]])
    result = bytearray(w)
    for code in codes[1:]:
        if code in dictionary:
            entry = dictionary[code]
        elif code == dict_size:
            entry = w + bytes([w[0]])
        else:
            raise ValueError(f"LZW decode error: code {code}")
        result.extend(entry)
        if dict_size < 65535:
            dictionary[dict_size] = w + bytes([entry[0]])
            dict_size += 1
        w = entry
    return np.frombuffer(result, dtype=np.uint8)


# ── Huffman Coding ──────────────────────────────────────────────────
def huffman_encode(data: np.ndarray) -> tuple[list[int], list[tuple[int, int]]]:
    """Huffman encoding."""
    freqs = {}
    for b in data:
        freqs[b] = freqs.get(b, 0) + 1
    if not freqs:
        return [], []
    
    class Node:
        def __init__(self, symbol, freq):
            self.symbol = symbol
            self.freq = freq
            self.left = self.right = None
    
    pq = [Node(b, f) for b, f in freqs.items()]
    pq.sort(key=lambda n: (n.freq, n.symbol if n.symbol is not None else -1))
    
    while len(pq) > 1:
        left = pq.pop(0)
        right = pq.pop(0)
        parent = Node(None, left.freq + right.freq)
        parent.left, parent.right = left, right
        pq.append(parent)
        pq.sort(key=lambda n: (n.freq, n.symbol if n.symbol is not None else -1))
    
    root = pq[0]
    codes = {}
    def traverse(node, path):
        if node.symbol is not None:
            codes[node.symbol] = path
            return
        if node.left:
            traverse(node.left, path + "0")
        if node.right:
            traverse(node.right, path + "1")
    if root.symbol is not None:
        codes[root.symbol] = "0"
    else:
        traverse(root, "")
    
    bits = []
    for b in data:
        bits.extend(int(c) for c in codes[b])
    
    return bits, [(b, f) for b, f in freqs.items()]


def huffman_decode(bits: list[int], frequencies: list[tuple[int, int]]) -> np.ndarray:
    """Huffman decoding."""
    class Node:
        def __init__(self, symbol, freq):
            self.symbol = symbol
            self.freq = freq
            self.left = self.right = None
    
    pq = [Node(b, f) for b, f in frequencies]
    pq.sort(key=lambda n: (n.freq, n.symbol if n.symbol is not None else -1))
    while len(pq) > 1:
        left = pq.pop(0)
        right = pq.pop(0)
        parent = Node(None, left.freq + right.freq)
        parent.left, parent.right = left, right
        pq.append(parent)
        pq.sort(key=lambda n: (n.freq, n.symbol if n.symbol is not None else -1))
    
    root = pq[0]
    result = []
    current = root
    for bit in bits:
        current = current.left if bit == 0 else current.right
        if current.symbol is not None:
            result.append(current.symbol)
            current = root
    return np.array(result, dtype=np.uint8)


# ── Arithmetic Coding ───────────────────────────────────────────────
def arithmetic_encode(bits: list[int]) -> tuple[bytes, int]:
    """Binary arithmetic encoding with renormalization."""
    total = len(bits)
    ones = sum(bits)
    p = ones / total if total > 0 else 0.5
    p = max(0.01, min(0.99, p))
    p_byte = round(p * 255)
    
    P_SCALE = 65536
    p_int = round(p * P_SCALE)
    
    low, high = 0, 0xFFFFFFFF
    underflow = 0
    output_bits = []
    
    def output_bit(b):
        nonlocal underflow
        output_bits.append(b)
        while underflow > 0:
            output_bits.append(1 - b)
            underflow -= 1
    
    for bit in bits:
        range_size = high - low + 1
        split = low + (range_size * (P_SCALE - p_int)) // P_SCALE
        if bit == 0:
            high = split
        else:
            low = split + 1
        
        while True:
            if (low & 0x80000000) == (high & 0x80000000):
                msb = (low >> 31) & 1
                output_bit(msb)
                low = ((low << 1) & 0xFFFFFFFF)
                high = (((high << 1) | 1) & 0xFFFFFFFF)
            elif (low & 0x40000000) != 0 and (high & 0x40000000) == 0:
                underflow += 1
                low = (((low << 1) ^ 0x80000000) & 0xFFFFFFFF)
                high = ((((high << 1) ^ 0x80000000) | 1) & 0xFFFFFFFF)
            else:
                break
    
    if low < 0x40000000:
        output_bit(0)
        output_bit(1)
    else:
        output_bit(1)
        output_bit(0)
    
    byte_len = (len(output_bits) + 7) // 8
    result = bytearray(byte_len)
    for i, b in enumerate(output_bits):
        result[i // 8] |= (b << (7 - (i % 8)))
    
    return bytes(result), p_byte


def arithmetic_decode(data: bytes, p_byte: int, total_bits: int) -> list[int]:
    """Arithmetic decoding."""
    p = p_byte / 255
    P_SCALE = 65536
    p_int = round(p * P_SCALE)
    
    input_bits = []
    for byte in data:
        for i in range(7, -1, -1):
            input_bits.append((byte >> i) & 1)
    
    bit_ptr = 0
    def read_bit():
        nonlocal bit_ptr
        if bit_ptr < len(input_bits):
            b = input_bits[bit_ptr]
            bit_ptr += 1
            return b
        return 0
    
    value = 0
    for _ in range(32):
        value = ((value << 1) | read_bit()) & 0xFFFFFFFF
    
    low, high = 0, 0xFFFFFFFF
    decoded = []
    for _ in range(total_bits):
        range_size = high - low + 1
        split = low + (range_size * (P_SCALE - p_int)) // P_SCALE
        if value <= split:
            decoded.append(0)
            high = split
        else:
            decoded.append(1)
            low = split + 1
        
        while True:
            if (low & 0x80000000) == (high & 0x80000000):
                low = ((low << 1) & 0xFFFFFFFF)
                high = (((high << 1) | 1) & 0xFFFFFFFF)
                value = ((value << 1) | read_bit()) & 0xFFFFFFFF
            elif (low & 0x40000000) != 0 and (high & 0x40000000) == 0:
                low = (((low << 1) ^ 0x80000000) & 0xFFFFFFFF)
                high = ((((high << 1) ^ 0x80000000) | 1) & 0xFFFFFFFF)
                value = (((value << 1) ^ 0x80000000) | read_bit()) & 0xFFFFFFFF
            else:
                break
    
    return decoded


# ── Serialization/Deserialization ────────────────────────────────────
def serialize_cip(width: int, height: int, palette: list, frequencies: list, 
                  total_bits: int, p_byte: int, compressed_bytes: bytes,
                  method: str = METHOD_MAX) -> bytes:
    """Serialize to .cip format."""
    K = len(palette)
    
    # Header: 23 bytes with 4-byte magic "CIP "
    header = bytearray(23)
    header[0:4] = b'CIP '
    struct.pack_into('<H', header, 4, width)
    struct.pack_into('<H', header, 6, height)
    header[8] = K
    header[9] = p_byte
    struct.pack_into('<I', header, 10, total_bits)
    struct.pack_into('<I', header, 14, len(compressed_bytes))
    header[18] = ord(method[0].upper())
    struct.pack_into('<I', header, 19, len(frequencies))
    
    result = bytearray(header)
    
    # Palette
    for r, g, b in palette:
        result.extend([r, g, b])
    
    # Frequencies
    for symbol, freq in frequencies:
        result.append(symbol)
        result.extend(struct.pack('<I', freq))
    
    # Compressed data
    result.extend(compressed_bytes)
    
    return bytes(result)


def deserialize_cip(data: bytes) -> dict:
    """Deserialize .cip format."""
    if data[:4] != b'CIP ':
        raise ValueError("Invalid .cip file")
    
    width, height = struct.unpack('<HH', data[4:8])
    K = data[8]
    p_byte = data[9]
    total_bits = struct.unpack('<I', data[10:14])[0]
    compressed_size = struct.unpack('<I', data[14:18])[0]
    method = chr(data[18])
    F = struct.unpack('<I', data[19:23])[0]
    
    offset = 23
    palette = []
    for _ in range(K):
        palette.append(tuple(data[offset:offset+3]))
        offset += 3
    
    frequencies = []
    for _ in range(F):
        symbol = data[offset]
        freq = struct.unpack('<I', data[offset+1:offset+5])[0]
        frequencies.append((symbol, freq))
        offset += 5
    
    compressed_bytes = data[offset:offset+compressed_size]
    
    return {
        'width': width, 'height': height,
        'palette': palette, 'frequencies': frequencies,
        'total_bits': total_bits, 'p_byte': p_byte,
        'compressed_bytes': compressed_bytes,
        'method': method
    }


# ── Main Compression Functions ──────────────────────────────────────
def compress_fast(pixels: bytes, width: int, height: int, quality: int) -> bytes:
    """Fast method: LZW + Huffman (Deflate-like)."""
    K = max(16, min(256, round(16 + ((quality - 10) / 90) * 240)))
    
    pixels_arr = np.frombuffer(pixels, dtype=np.uint8)
    palette, indices = quantize(pixels_arr, K)
    rle = rle_encode(indices)
    lzw_codes = lzw_encode(rle)
    
    # Split LZW codes to bytes
    lzw_bytes = np.zeros(len(lzw_codes) * 2, dtype=np.uint8)
    for i, code in enumerate(lzw_codes):
        lzw_bytes[i*2] = code >> 8
        lzw_bytes[i*2+1] = code & 0xFF
    
    # Huffman encode
    bits, frequencies = huffman_encode(lzw_bytes)
    compressed_bytes, p_byte = arithmetic_encode(bits)
    
    # Serialize with method indicator
    return serialize_cip(width, height, list(palette), frequencies, len(bits), p_byte, compressed_bytes, METHOD_FAST)


def compress_max(pixels: bytes, width: int, height: int, quality: int) -> bytes:
    """Max ratio method: LZW + Arithmetic (JPEG2000-like)."""
    K = max(16, min(256, round(16 + ((quality - 10) / 90) * 240)))
    
    pixels_arr = np.frombuffer(pixels, dtype=np.uint8)
    palette, indices = quantize(pixels_arr, K)
    rle = rle_encode(indices)
    lzw_codes = lzw_encode(rle)
    
    # Split LZW codes to bytes
    lzw_bytes = np.zeros(len(lzw_codes) * 2, dtype=np.uint8)
    for i, code in enumerate(lzw_codes):
        lzw_bytes[i*2] = code >> 8
        lzw_bytes[i*2+1] = code & 0xFF
    
    # Huffman encode first
    bits, frequencies = huffman_encode(lzw_bytes)
    
    # Arithmetic encode
    compressed_bytes, p_byte = arithmetic_encode(bits)
    
    # Serialize with method indicator
    return serialize_cip(width, height, list(palette), frequencies, len(bits), p_byte, compressed_bytes, METHOD_MAX)


def decompress(data: bytes) -> tuple[bytes, int, int]:
    """Decompress .cip to pixels."""
    metadata = deserialize_cip(data)
    method = metadata['method']
    
    P_SCALE = 65536
    p_min = int(max(0, (metadata['p_byte'] - 0.5) / 255) * P_SCALE)
    p_max = int(min(1, (metadata['p_byte'] + 0.5) / 255) * P_SCALE) + 1

    last_error = None
    
    for p_int in range(p_min, p_max + 1):
        try:
            # Custom arithmetic decode with exact p_int
            input_bits = []
            for byte in metadata['compressed_bytes']:
                for i in range(7, -1, -1):
                    input_bits.append((byte >> i) & 1)
            
            bit_ptr = 0
            def read_bit():
                nonlocal bit_ptr
                if bit_ptr < len(input_bits):
                    b = input_bits[bit_ptr]
                    bit_ptr += 1
                    return b
                return 0
            
            value = 0
            for _ in range(32):
                value = ((value << 1) | read_bit()) & 0xFFFFFFFF
            
            low, high = 0, 0xFFFFFFFF
            bits = []
            for _ in range(metadata['total_bits']):
                range_size = high - low + 1
                split = low + (range_size * (P_SCALE - p_int)) // P_SCALE
                if value <= split:
                    bits.append(0)
                    high = split
                else:
                    bits.append(1)
                    low = split + 1
                
                while True:
                    if (low & 0x80000000) == (high & 0x80000000):
                        low = ((low << 1) & 0xFFFFFFFF)
                        high = (((high << 1) | 1) & 0xFFFFFFFF)
                        value = ((value << 1) | read_bit()) & 0xFFFFFFFF
                    elif (low & 0x40000000) != 0 and (high & 0x40000000) == 0:
                        low = (((low << 1) ^ 0x80000000) & 0xFFFFFFFF)
                        high = ((((high << 1) ^ 0x80000000) | 1) & 0xFFFFFFFF)
                        value = (((value << 1) ^ 0x80000000) | read_bit()) & 0xFFFFFFFF
                    else:
                        break
            
            # Huffman decode
            huffman_bytes = huffman_decode(bits, metadata['frequencies'])
            if len(huffman_bytes) % 2 != 0:
                continue
            
            # LZW decode
            lzw_codes = np.zeros(len(huffman_bytes) // 2, dtype=np.uint16)
            for i in range(len(lzw_codes)):
                lzw_codes[i] = (huffman_bytes[i*2] << 8) | huffman_bytes[i*2+1]
            rle = lzw_decode(lzw_codes)
            
            # RLE decode
            total_pixels = metadata['width'] * metadata['height']
            indices = rle_decode(rle, total_pixels)
            
            # Reconstruct pixels
            pixels = bytearray(total_pixels * 3)
            for i, idx in enumerate(indices):
                r, g, b = metadata['palette'][idx]
                pixels[i*3] = r
                pixels[i*3+1] = g
                pixels[i*3+2] = b
            
            return bytes(pixels), metadata['width'], metadata['height']
            
        except Exception as e:
            last_error = e
            continue
            
    raise ValueError(f"Failed to decompress CIP: all p_int candidates failed. Last error: {last_error}")


def compress_image(pixels: bytes, width: int, height: int, quality: int, 
                   method: str = METHOD_MAX) -> bytes:
    """Main compression entry point. Choose method: 'fast' or 'max'."""
    if method.lower() == METHOD_FAST:
        return compress_fast(pixels, width, height, quality)
    else:
        return compress_max(pixels, width, height, quality)
