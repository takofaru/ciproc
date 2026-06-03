import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

def apply_edge(arr: np.ndarray, method: str = "sobel") -> np.ndarray:
    """
    Applies edge detection filters.
    Methods: 'sobel', 'prewitt', 'robert', 'laplacian', 'log', 'canny'
    """
    # All edge operators work on grayscale images first
    gray = 0.299 * arr[:,:,0] + 0.587 * arr[:,:,1] + 0.114 * arr[:,:,2]
    method_name = method.lower()
    
    if method_name == "sobel":
        padded = np.pad(gray, 1, mode='edge')
        w = sliding_window_view(padded, (3,3))
        kx = np.array([[-1,0,1],[-2,0,2],[-1,0,1]], dtype=np.float32)
        ky = np.array([[-1,-2,-1],[0,0,0],[1,2,1]], dtype=np.float32)
        gx = (w * kx).sum(axis=(-1,-2))
        gy = (w * ky).sum(axis=(-1,-2))
        mag = np.sqrt(gx**2 + gy**2)
        mag = mag / mag.max() * 255 if mag.max() > 0 else mag
        
    elif method_name == "prewitt":
        padded = np.pad(gray, 1, mode='edge')
        w = sliding_window_view(padded, (3,3))
        kx = np.array([[-1,0,1],[-1,0,1],[-1,0,1]], dtype=np.float32)
        ky = np.array([[-1,-1,-1],[0,0,0],[1,1,1]], dtype=np.float32)
        gx = (w * kx).sum(axis=(-1,-2))
        gy = (w * ky).sum(axis=(-1,-2))
        mag = np.sqrt(gx**2 + gy**2)
        mag = mag / mag.max() * 255 if mag.max() > 0 else mag
        
    elif method_name == "robert":
        # Roberts cross kernel (2x2)
        padded = np.pad(gray, ((0, 1), (0, 1)), mode='edge')
        w = sliding_window_view(padded, (2,2))
        kx = np.array([[1,0],[0,-1]], dtype=np.float32)
        ky = np.array([[0,1],[-1,0]], dtype=np.float32)
        gx = (w * kx).sum(axis=(-1,-2))
        gy = (w * ky).sum(axis=(-1,-2))
        mag = np.sqrt(gx**2 + gy**2)
        mag = mag / mag.max() * 255 if mag.max() > 0 else mag
        
    elif method_name == "laplacian":
        padded = np.pad(gray, 1, mode='edge')
        w = sliding_window_view(padded, (3,3))
        k = np.array([[0,1,0],[1,-4,1],[0,1,0]], dtype=np.float32)
        mag = (w * k).sum(axis=(-1,-2))
        # Take absolute value since Laplacian can be negative
        mag = np.abs(mag)
        mag = mag / mag.max() * 255 if mag.max() > 0 else mag
        
    elif method_name == "log":
        # Laplacian of Gaussian: Gaussian blur (radius=1) then Laplacian
        # 1. Gaussian blur
        size = 5
        pad = 2
        ax = np.linspace(-pad, pad, size)
        gauss = np.exp(-0.5 * np.square(ax) / np.square(1.0))
        g_kernel = np.outer(gauss, gauss)
        g_kernel = g_kernel / np.sum(g_kernel)
        
        padded_g = np.pad(gray, pad, mode='edge')
        blurred = (sliding_window_view(padded_g, (size, size)) * g_kernel).sum(axis=(-1,-2))
        
        # 2. Laplacian
        padded_l = np.pad(blurred, 1, mode='edge')
        w = sliding_window_view(padded_l, (3,3))
        k = np.array([[0,1,0],[1,-4,1],[0,1,0]], dtype=np.float32)
        mag = (w * k).sum(axis=(-1,-2))
        mag = np.abs(mag)
        mag = mag / mag.max() * 255 if mag.max() > 0 else mag
        
    elif method_name == "canny":
        mag = canny_edge_detection(gray)
        
    else:
        # Fallback to Sobel
        return apply_edge(arr, "sobel")
        
    return np.stack([mag, mag, mag], axis=-1)

def canny_edge_detection(gray: np.ndarray, low_threshold=25, high_threshold=60) -> np.ndarray:
    """True Canny edge detection in NumPy (Fully Vectorized)."""
    # 1. Gaussian Blur (radius = 1.0, size = 5)
    size = 5
    pad = 2
    ax = np.linspace(-pad, pad, size)
    gauss = np.exp(-0.5 * np.square(ax) / np.square(1.0))
    g_kernel = np.outer(gauss, gauss)
    g_kernel = g_kernel / np.sum(g_kernel)
    
    padded = np.pad(gray, pad, mode='edge')
    blurred = (sliding_window_view(padded, (size, size)) * g_kernel).sum(axis=(-1,-2))
    
    # 2. Sobel Gradients
    padded_b = np.pad(blurred, 1, mode='edge')
    w = sliding_window_view(padded_b, (3,3))
    kx = np.array([[-1,0,1],[-2,0,2],[-1,0,1]], dtype=np.float32)
    ky = np.array([[-1,-2,-1],[0,0,0],[1,2,1]], dtype=np.float32)
    gx = (w * kx).sum(axis=(-1,-2))
    gy = (w * ky).sum(axis=(-1,-2))
    
    magnitude = np.sqrt(gx**2 + gy**2)
    
    # Gradient angles in degrees [0, 180]
    angle = np.arctan2(gy, gx) * 180.0 / np.pi
    angle[angle < 0] += 180.0
    
    # 3. Vectorized Non-Maximum Suppression (NMS)
    # Categorize angles into 4 sectors (0, 45, 90, 135 degrees)
    angle_0 = ((0 <= angle) & (angle < 22.5)) | ((157.5 <= angle) & (angle <= 180))
    angle_45 = (22.5 <= angle) & (angle < 67.5)
    angle_90 = (67.5 <= angle) & (angle < 112.5)
    angle_135 = (112.5 <= angle) & (angle < 157.5)
    
    mag_pad = np.pad(magnitude, 1, mode='constant', constant_values=0)
    
    # Shifted magnitude arrays to get neighbors in all 8 directions
    mag_E = mag_pad[1:-1, 2:]
    mag_W = mag_pad[1:-1, :-2]
    mag_N = mag_pad[:-2, 1:-1]
    mag_S = mag_pad[2:, 1:-1]
    mag_NE = mag_pad[:-2, 2:]
    mag_SW = mag_pad[2:, :-2]
    mag_NW = mag_pad[:-2, :-2]
    mag_SE = mag_pad[2:, 2:]
    
    q = np.zeros_like(magnitude)
    r = np.zeros_like(magnitude)
    
    # Assign neighbors based on gradient direction
    q = np.where(angle_0, mag_E, q)
    r = np.where(angle_0, mag_W, r)
    
    q = np.where(angle_45, mag_NE, q)
    r = np.where(angle_45, mag_SW, r)
    
    q = np.where(angle_90, mag_N, q)
    r = np.where(angle_90, mag_S, r)
    
    q = np.where(angle_135, mag_NW, q)
    r = np.where(angle_135, mag_SE, r)
    
    nms = np.where((magnitude >= q) & (magnitude >= r), magnitude, 0.0)
    
    # 4. Double Thresholding
    weak = (nms >= low_threshold) & (nms < high_threshold)
    strong = (nms >= high_threshold)
    
    # 5. Vectorized Hysteresis Propagation (4 passes for robust local tracing)
    for _ in range(4):
        pad_strong = np.pad(strong, 1, mode='constant', constant_values=False)
        any_strong_neighbor = (
            pad_strong[:-2, 1:-1] | pad_strong[2:, 1:-1] |
            pad_strong[1:-1, :-2] | pad_strong[1:-1, 2:] |
            pad_strong[:-2, :-2] | pad_strong[:-2, 2:] |
            pad_strong[2:, :-2] | pad_strong[2:, 2:]
        )
        strong = strong | (weak & any_strong_neighbor)
        
    return np.where(strong, 255.0, 0.0)
