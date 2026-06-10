import numpy as np
from PIL import Image

img = Image.open('../Test.png').convert('RGB')
arr = np.array(img)
print(f'Max value: {np.max(arr)}, Min value: {np.min(arr)}')
print(f'Values > 10: {np.count_nonzero(arr > 10)}')
print(f'Values > 50: {np.count_nonzero(arr > 50)}')
print(f'Values > 100: {np.count_nonzero(arr > 100)}')
print(f'Mean value: {np.mean(arr)}')
