import importlib.util
import sys
import os
import numpy as np

spec = importlib.util.spec_from_file_location("cmp", os.path.join(os.path.dirname(__file__), 'frontend', 'workers', 'modules', 'compression.py'))
cmp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cmp)

with open('Test.cip', 'rb') as f:
    data = f.read()

metadata = cmp.deserialize_cip(data)

def decode_with_pint(p_int):
    # custom arithmetic decode
    P_SCALE = 65536
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
    decoded = []
    for _ in range(metadata['total_bits']):
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

best_p = -1
for p_int in range(34050, 34320):
    try:
        bits = decode_with_pint(p_int)
        huffman_bytes = cmp.huffman_decode(bits, metadata['frequencies'])
        if len(huffman_bytes) % 2 != 0:
            continue
            
        lzw_codes = np.zeros(len(huffman_bytes) // 2, dtype=np.uint16)
        for i in range(len(lzw_codes)):
            lzw_codes[i] = (huffman_bytes[i*2] << 8) | huffman_bytes[i*2+1]
        
        rle = cmp.lzw_decode(lzw_codes)
        
        total_pixels = metadata['width'] * metadata['height']
        indices = cmp.rle_decode(rle, total_pixels)
        
        from PIL import Image
        img = Image.fromarray(indices.reshape((metadata['height'], metadata['width'])))
        palette_arr = np.array(metadata['palette'], dtype=np.uint8)
        img_rgb = Image.fromarray(palette_arr[indices].reshape((metadata['height'], metadata['width'], 3)))
        img_rgb.save('output.png')
        print(f"SUCCESS with p_int={p_int}, saved output.png")
        best_p = p_int
        break
    except Exception as e:
        pass

if best_p == -1:
    print("Brute force failed")

