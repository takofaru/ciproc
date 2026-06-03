import numpy as np
from PIL import Image
import io, base64, json

def decode_image(b64: str) -> np.ndarray:
    data = base64.b64decode(b64.split(",")[-1])
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(img, dtype=np.float32)

def encode_image(arr: np.ndarray) -> str:
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return "data:image/jpeg;base64," + b64

# ── Module 1: Brightness ─────────────────────────────────────
def apply_brightness(arr: np.ndarray, value: float) -> np.ndarray:
    """value: -255 to +255 additive shift"""
    return arr + value

# ── Module 2: Contrast (pivot at 128) ───────────────────────
def apply_contrast(arr: np.ndarray, value: float) -> np.ndarray:
    """value: 0.0–4.0, 1.0 = no change, pivot = 128"""
    return (arr - 128.0) * value + 128.0

# ── Module 4: Grayscale ───────────────────────────────────────
def apply_grayscale(arr: np.ndarray) -> np.ndarray:
    gray = 0.299 * arr[:,:,0] + 0.587 * arr[:,:,1] + 0.114 * arr[:,:,2]
    return np.stack([gray, gray, gray], axis=-1)

# ── Module 5: Invert ─────────────────────────────────────────
def apply_invert(arr: np.ndarray) -> np.ndarray:
    return 255.0 - arr

# ── Module 6: Sepia ──────────────────────────────────────────
def apply_sepia(arr: np.ndarray) -> np.ndarray:
    r = arr[:,:,0]; g = arr[:,:,1]; b = arr[:,:,2]
    nr = 0.393*r + 0.769*g + 0.189*b
    ng = 0.349*r + 0.686*g + 0.168*b
    nb = 0.272*r + 0.534*g + 0.131*b
    return np.stack([nr, ng, nb], axis=-1)

# ── Module 7: Gaussian Blur (3x3 / 5x5 / 7x7) ───────────────
def apply_blur(arr: np.ndarray, radius: int = 1) -> np.ndarray:
    size = max(1, radius * 2 + 1)
    kernel = np.ones((size, size), dtype=np.float32) / (size * size)
    out = np.zeros_like(arr)
    for c in range(3):
        ch = arr[:,:,c]
        from numpy.lib.stride_tricks import sliding_window_view
        pad = size // 2
        padded = np.pad(ch, pad, mode='edge')
        windows = sliding_window_view(padded, (size, size))
        out[:,:,c] = (windows * kernel).sum(axis=(-1,-2))
    return out

# ── Module 8: Sharpen (Unsharp Mask) ────────────────────────
def apply_sharpen(arr: np.ndarray, strength: float = 1.0) -> np.ndarray:
    blurred = apply_blur(arr, 1)
    return arr + strength * (arr - blurred)

# ── Module 9: Canny-like Edge Detection ─────────────────────
def apply_edge(arr: np.ndarray) -> np.ndarray:
    gray = apply_grayscale(arr)[:,:,0]
    # Sobel X
    from numpy.lib.stride_tricks import sliding_window_view
    padded = np.pad(gray, 1, mode='edge')
    w = sliding_window_view(padded, (3,3))
    kx = np.array([[-1,0,1],[-2,0,2],[-1,0,1]], dtype=np.float32)
    ky = np.array([[-1,-2,-1],[0,0,0],[1,2,1]], dtype=np.float32)
    gx = (w * kx).sum(axis=(-1,-2))
    gy = (w * ky).sum(axis=(-1,-2))
    mag = np.sqrt(gx**2 + gy**2)
    mag = mag / mag.max() * 255 if mag.max() > 0 else mag
    return np.stack([mag, mag, mag], axis=-1)

# ── Module 3: Geometric (Export only — permanent on matrix) ──
def apply_geometry(arr: np.ndarray, params: dict) -> np.ndarray:
    """
    params: { rotation, scaleX, scaleY, translateX, translateY }
    Applied in order: flip → rotate → translate
    """
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    
    # Flip via negative scale
    sx = params.get("scaleX", 1.0)
    sy = params.get("scaleY", 1.0)
    if sx < 0:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if sy < 0:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)

    # Rotation (counter-clockwise in PIL expand=True keeps full image)
    rot = params.get("rotation", 0)
    if rot != 0:
        img = img.rotate(-rot, expand=True, resample=Image.BICUBIC)

    # Scale (resize)
    abs_sx = abs(sx) if abs(sx) != 1.0 else 1.0
    abs_sy = abs(sy) if abs(sy) != 1.0 else 1.0
    if abs_sx != 1.0 or abs_sy != 1.0:
        new_w = max(1, int(img.width * abs_sx))
        new_h = max(1, int(img.height * abs_sy))
        img = img.resize((new_w, new_h), Image.BICUBIC)

    # Translation: crop/pad
    tx = int(params.get("translateX", 0))
    ty = int(params.get("translateY", 0))
    if tx != 0 or ty != 0:
        canvas = Image.new("RGB", img.size, (0, 0, 0))
        canvas.paste(img, (tx, ty))
        img = canvas

    return np.array(img, dtype=np.float32)

print("Python engine ready")
