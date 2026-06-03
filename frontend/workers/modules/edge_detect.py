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
    """True Canny edge detection in NumPy."""
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
    
    # 3. Non-Maximum Suppression (NMS)
    h, w_dim = gray.shape
    nms = np.zeros_like(magnitude)
    mag_pad = np.pad(magnitude, 1, mode='constant', constant_values=0)
    
    for i in range(1, h + 1):
        for j in range(1, w_dim + 1):
            q = 255
            r = 255
            ang = angle[i-1, j-1]
            
            # Angle 0 degrees (horizontal)
            if (0 <= ang < 22.5) or (157.5 <= ang <= 180):
                q = mag_pad[i, j+1]
                r = mag_pad[i, j-1]
            # Angle 45 degrees (diagonal)
            elif (22.5 <= ang < 67.5):
                q = mag_pad[i+1, j-1]
                r = mag_pad[i-1, j+1]
            # Angle 90 degrees (vertical)
            elif (67.5 <= ang < 112.5):
                q = mag_pad[i+1, j]
                r = mag_pad[i-1, j]
            # Angle 135 degrees (diagonal)
            elif (112.5 <= ang < 157.5):
                q = mag_pad[i-1, j-1]
                r = mag_pad[i+1, j+1]
                
            if (mag_pad[i, j] >= q) and (mag_pad[i, j] >= r):
                nms[i-1, j-1] = mag_pad[i, j]
            else:
                nms[i-1, j-1] = 0
                
    # 4. Double Thresholding
    res = np.zeros_like(nms)
    strong_i, strong_j = np.where(nms >= high_threshold)
    weak_i, weak_j = np.where((nms >= low_threshold) & (nms < high_threshold))
    
    res[strong_i, strong_j] = 255
    res[weak_i, weak_j] = 50
    
    # 5. Hysteresis (Edge Tracking)
    final_res = np.zeros_like(res)
    h_res, w_res = res.shape
    for i in range(1, h_res - 1):
        for j in range(1, w_res - 1):
            if res[i, j] == 50:
                # If any of the 8 neighbors is strong (255)
                neighbors = res[i-1:i+2, j-1:j+2]
                if np.any(neighbors == 255):
                    final_res[i, j] = 255
            elif res[i, j] == 255:
                final_res[i, j] = 255
                
    return final_res
