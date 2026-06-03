import numpy as np
from PIL import Image
import io
import base64

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
