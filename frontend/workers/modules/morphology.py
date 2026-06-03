import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

def apply_morphology(arr: np.ndarray, method: str = "erosion", size: int = 3) -> np.ndarray:
    """
    Applies mathematical morphology operations.
    Methods: 'erosion', 'dilation'
    """
    pad = size // 2
    out = np.zeros_like(arr)
    
    method_name = method.lower()
    
    if method_name == "erosion":
        for c in range(3):
            ch = arr[:,:,c]
            padded = np.pad(ch, pad, mode='edge')
            windows = sliding_window_view(padded, (size, size))
            out[:,:,c] = np.min(windows, axis=(-1,-2))
            
    elif method_name == "dilation":
        for c in range(3):
            ch = arr[:,:,c]
            padded = np.pad(ch, pad, mode='edge')
            windows = sliding_window_view(padded, (size, size))
            out[:,:,c] = np.max(windows, axis=(-1,-2))
            
    else:
        # Default to no change if unknown morphology method
        return arr
        
    return out
