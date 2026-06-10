import numpy as np

def apply_segmentation(img: np.ndarray, method: str, p: dict) -> np.ndarray:
    if method == "kmeans":
        return _seg_kmeans(img, int(p.get("k", 4)), int(p.get("iterations", 8)))
    elif method == "mask":
        return _seg_mask(
            img, 
            int(p.get("low", 80)), 
            int(p.get("high", 200)), 
            p.get("channel", "gray"), 
            p.get("maskMode", "extract")
        )
    elif method == "region":
        return _seg_region(
            img, 
            int(p.get("threshold", 128)), 
            int(p.get("minSize", 300)), 
            p.get("regionMode", "all")
        )
    return img

def _seg_kmeans(img: np.ndarray, k: int, iterations: int) -> np.ndarray:
    flat = img.reshape(-1, 3).astype(np.float32)
    # Initialize centroids by randomly picking pixels
    np.random.seed(42)
    idx = np.random.choice(len(flat), k, replace=False)
    centroids = flat[idx]
    
    for _ in range(iterations):
        # Calculate distances
        distances = np.linalg.norm(flat[:, np.newaxis] - centroids, axis=2)
        labels = np.argmin(distances, axis=1)
        
        # Update centroids
        new_centroids = np.zeros_like(centroids)
        for i in range(k):
            mask = (labels == i)
            if np.any(mask):
                new_centroids[i] = flat[mask].mean(axis=0)
            else:
                new_centroids[i] = flat[np.random.choice(len(flat))]
        centroids = new_centroids
        
    quantized = centroids[labels].astype(np.uint8)
    return quantized.reshape(img.shape)

def _seg_mask(img: np.ndarray, low: int, high: int, channel: str, mode: str) -> np.ndarray:
    if channel == "r":
        target = img[:, :, 0]
    elif channel == "g":
        target = img[:, :, 1]
    elif channel == "b":
        target = img[:, :, 2]
    else:
        target = (0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]).astype(np.uint8)
        
    mask = (target >= low) & (target <= high)
    
    if mode == "binary":
        out = np.zeros_like(img)
        out[mask] = [255, 255, 255]
        return out
    elif mode == "overlay":
        out = img.copy()
        # Tint masked area with red
        out[mask] = np.clip(out[mask] * 0.5 + np.array([255, 0, 0]) * 0.5, 0, 255).astype(np.uint8)
        return out
    else: # extract
        out = np.zeros_like(img)
        out[mask] = img[mask]
        return out

def _seg_region(img: np.ndarray, threshold: int, min_size: int, mode: str) -> np.ndarray:
    gray = (0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]).astype(np.uint8)
    binary = (gray > threshold).astype(np.uint8)
    
    # 2-pass connected components
    height, width = binary.shape
    labels = np.zeros((height, width), dtype=np.int32)
    next_label = 1
    
    # Simple recursive DFS is too deep for Python, use iterative BFS
    from collections import deque
    
    sizes = {}
    for y in range(height):
        for x in range(width):
            if binary[y, x] == 1 and labels[y, x] == 0:
                # Start new component
                q = deque([(y, x)])
                labels[y, x] = next_label
                count = 0
                
                while q:
                    cy, cx = q.popleft()
                    count += 1
                    
                    # 4-way connectivity
                    for ny, nx in [(cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)]:
                        if 0 <= ny < height and 0 <= nx < width:
                            if binary[ny, nx] == 1 and labels[ny, nx] == 0:
                                labels[ny, nx] = next_label
                                q.append((ny, nx))
                
                sizes[next_label] = count
                next_label += 1
                
    # Filter by size
    valid_labels = set(lbl for lbl, size in sizes.items() if size >= min_size)
    
    # Apply
    out = np.zeros_like(img)
    for y in range(height):
        for x in range(width):
            if labels[y, x] in valid_labels:
                if mode == "all" or mode == "extract":
                    out[y, x] = img[y, x]
                elif mode == "highlight":
                    # Cycle colors based on label
                    color = [
                        (labels[y, x] * 50) % 255,
                        (labels[y, x] * 120) % 255,
                        (labels[y, x] * 200) % 255
                    ]
                    out[y, x] = color
    return out
