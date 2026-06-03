import numpy as np
from PIL import Image

def apply_brightness(arr: np.ndarray, value: float) -> np.ndarray:
    """value: -255 to +255 additive shift"""
    return arr + value

def apply_contrast(arr: np.ndarray, value: float) -> np.ndarray:
    """value: 0.0–4.0, 1.0 = no change, pivot = 128"""
    return (arr - 128.0) * value + 128.0

def apply_grayscale(arr: np.ndarray) -> np.ndarray:
    gray = 0.299 * arr[:,:,0] + 0.587 * arr[:,:,1] + 0.114 * arr[:,:,2]
    return np.stack([gray, gray, gray], axis=-1)

def apply_invert(arr: np.ndarray) -> np.ndarray:
    return 255.0 - arr

def apply_sepia(arr: np.ndarray) -> np.ndarray:
    r = arr[:,:,0]; g = arr[:,:,1]; b = arr[:,:,2]
    nr = 0.393*r + 0.769*g + 0.189*b
    ng = 0.349*r + 0.686*g + 0.168*b
    nb = 0.272*r + 0.534*g + 0.131*b
    return np.stack([nr, ng, nb], axis=-1)

def apply_histogram_eq(arr: np.ndarray) -> np.ndarray:
    """YCbCr based histogram equalization of the luma channel."""
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    y = 0.299 * r + 0.587 * g + 0.114 * b
    cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128.0
    cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128.0
    
    y_uint8 = np.clip(y, 0, 255).astype(np.uint8)
    hist, bins = np.histogram(y_uint8.flatten(), 256, [0, 256])
    cdf = hist.cumsum()
    cdf_normalized = cdf * 255 / cdf[-1]
    
    y_equalized = cdf_normalized[y_uint8]
    
    cby = cb - 128.0
    cry = cr - 128.0
    nr = y_equalized + 1.402 * cry
    ng = y_equalized - 0.344136 * cby - 0.714136 * cry
    nb = y_equalized + 1.772 * cby
    
    return np.stack([nr, ng, nb], axis=-1)

def apply_channel_split(arr: np.ndarray, channel: str) -> np.ndarray:
    """Isolates the red, green, or blue channel (other channels set to 0)."""
    out = np.zeros_like(arr)
    c_idx = {'r': 0, 'g': 1, 'b': 2}[channel.lower()]
    out[:,:,c_idx] = arr[:,:,c_idx]
    return out

def apply_hsl(arr: np.ndarray, hue: float = 0.0, saturation: float = 1.0, luminance: float = 1.0) -> np.ndarray:
    """Modifies Hue (-180 to 180), Saturation (0.0 to 3.0), and Luminance/Value (0.0 to 3.0) using HSV space."""
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    hsv = img.convert("HSV")
    h_ch, s_ch, v_ch = hsv.split()
    
    h_arr = np.array(h_ch, dtype=np.float32)
    s_arr = np.array(s_ch, dtype=np.float32)
    v_arr = np.array(v_ch, dtype=np.float32)
    
    # 360 degrees = 256 units in PIL HSV
    h_shift = (hue / 360.0) * 255.0
    h_arr = (h_arr + h_shift) % 256.0
    
    s_arr = np.clip(s_arr * saturation, 0, 255)
    v_arr = np.clip(v_arr * luminance, 0, 255)
    
    nh_ch = Image.fromarray(h_arr.astype(np.uint8))
    ns_ch = Image.fromarray(s_arr.astype(np.uint8))
    nv_ch = Image.fromarray(v_arr.astype(np.uint8))
    
    nhsv = Image.merge("HSV", (nh_ch, ns_ch, nv_ch))
    nrgb = nhsv.convert("RGB")
    return np.array(nrgb, dtype=np.float32)

def apply_threshold(arr: np.ndarray, value: float = 128.0) -> np.ndarray:
    """Grayscale conversion followed by binary thresholding."""
    gray = 0.299 * arr[:,:,0] + 0.587 * arr[:,:,1] + 0.114 * arr[:,:,2]
    binary = np.where(gray >= value, 255.0, 0.0)
    return np.stack([binary, binary, binary], axis=-1)
