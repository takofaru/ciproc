import numpy as np
from PIL import Image

img = Image.open('../Test.png').convert('RGB')
arr = np.array(img)
non_zero = np.count_nonzero(arr)
print(f'Test.png converted to RGB: shape {arr.shape}, non-zero count: {non_zero} out of {arr.size}')
