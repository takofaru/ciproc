import numpy as np

def apply_smooth(arr: np.ndarray, method: str = "gaussian", radius: int = 1) -> np.ndarray:
    """
    Applies spatial smoothing/blurring filters.
    Methods: 'gaussian', 'mean', 'median', 'max', 'min'
    """
    size = max(1, radius * 2 + 1)
    pad = size // 2
    out = np.zeros_like(arr)
    
    from numpy.lib.stride_tricks import sliding_window_view
    
    method_name = method.lower()
    
    if method_name == "gaussian":
        sigma = max(0.5, radius / 2.0)
        ax = np.linspace(-pad, pad, size)
        gauss = np.exp(-0.5 * np.square(ax) / np.square(sigma))
        kernel = np.outer(gauss, gauss)
        kernel = kernel / np.sum(kernel)
        
        for c in range(3):
            ch = arr[:,:,c]
            padded = np.pad(ch, pad, mode='edge')
            windows = sliding_window_view(padded, (size, size))
            out[:,:,c] = (windows * kernel).sum(axis=(-1,-2))
            
    elif method_name == "mean":
        kernel = np.ones((size, size), dtype=np.float32) / (size * size)
        for c in range(3):
            ch = arr[:,:,c]
            padded = np.pad(ch, pad, mode='edge')
            windows = sliding_window_view(padded, (size, size))
            out[:,:,c] = (windows * kernel).sum(axis=(-1,-2))
            
    elif method_name == "median":
        for c in range(3):
            ch = arr[:,:,c]
            padded = np.pad(ch, pad, mode='edge')
            windows = sliding_window_view(padded, (size, size))
            out[:,:,c] = np.median(windows, axis=(-1,-2))
            
    elif method_name == "max":
        for c in range(3):
            ch = arr[:,:,c]
            padded = np.pad(ch, pad, mode='edge')
            windows = sliding_window_view(padded, (size, size))
            out[:,:,c] = np.max(windows, axis=(-1,-2))
            
    elif method_name == "min":
        for c in range(3):
            ch = arr[:,:,c]
            padded = np.pad(ch, pad, mode='edge')
            windows = sliding_window_view(padded, (size, size))
            out[:,:,c] = np.min(windows, axis=(-1,-2))
            
    else:
        # Default to mean blur if unknown method
        return apply_smooth(arr, "mean", radius)
        
    return out

def apply_sharpen(arr: np.ndarray, strength: float = 1.0) -> np.ndarray:
    """Unsharp Masking: sharp = original + strength * (original - blurred)"""
    blurred = apply_smooth(arr, "gaussian", 1)
    return arr + strength * (arr - blurred)
