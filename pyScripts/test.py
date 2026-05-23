import numpy as np

def processImageModule(pixel_data, brightness, contrast):
    # Convert JsProxy (Uint8ClampedArray) to a NumPy array
    try:
        img_np = pixel_data.to_numpy()
    except AttributeError:
        img_np = np.array(pixel_data)
    
    # Reshape to (N, 4) to separate RGBA channels
    img_rgba = img_np.reshape(-1, 4).astype(np.float32)
    
    # 1. Handle Contrast
    # Mapping slider -100..100 to a factor
    # We use a formula that is more intuitive for this range
    # factor = (100 + contrast) / (100 - contrast) if contrast > 0
    # This prevents the image from clipping "purely" too early.
    if contrast >= 0:
        factor = (100 + contrast) / (100 - contrast) if contrast < 100 else 255.0
    else:
        factor = (100 + contrast) / 100.0

    # 2. Handle Brightness
    # Map -100..100 slider to a more useful -255..255 range for the math
    b_offset = (brightness / 100.0) * 128.0
    
    # Process only RGB channels
    rgb = img_rgba[:, :3]
    
    # Apply Contrast (centered at 128)
    rgb = 128.0 + factor * (rgb - 128.0)
    
    # Apply Brightness
    rgb = rgb + b_offset
    
    # Update RGB and clip to 0-255
    # Clipping ensures we don't exceed byte range, 
    # but the mapping above prevents it from being too "pure" 0 or 255 too quickly.
    img_rgba[:, :3] = np.clip(rgb, 0, 255)
    
    # Flatten back and convert to uint8
    return img_rgba.flatten().astype(np.uint8)
