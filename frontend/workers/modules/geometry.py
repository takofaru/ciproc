import numpy as np
from PIL import Image

def apply_geometry(arr: np.ndarray, params: dict) -> np.ndarray:
    """
    Applies affine transformations (flips, rotations, scaling, and translations)
    to the final output image.
    """
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    
    # 1. Flip via negative scale
    sx = params.get("scaleX", 1.0)
    sy = params.get("scaleY", 1.0)
    if sx < 0:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if sy < 0:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)

    # 2. Rotation
    rot = params.get("rotation", 0)
    if rot != 0:
        img = img.rotate(-rot, expand=True, resample=Image.BICUBIC)

    # 3. Scale (resize)
    abs_sx = abs(sx) if abs(sx) != 1.0 else 1.0
    abs_sy = abs(sy) if abs(sy) != 1.0 else 1.0
    if abs_sx != 1.0 or abs_sy != 1.0:
        new_w = max(1, int(img.width * abs_sx))
        new_h = max(1, int(img.height * abs_sy))
        img = img.resize((new_w, new_h), Image.BICUBIC)

    # 4. Translation: crop/pad
    tx = int(params.get("translateX", 0))
    ty = int(params.get("translateY", 0))
    if tx != 0 or ty != 0:
        canvas = Image.new("RGB", img.size, (0, 0, 0))
        canvas.paste(img, (tx, ty))
        img = canvas

    return np.array(img, dtype=np.float32)
