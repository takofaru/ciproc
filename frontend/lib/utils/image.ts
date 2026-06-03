/**
 * Image utilities for handling dimensions and client-side downscaling.
 */

export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Resolves the natural width and height of a base64 image.
 */
export function getImageDimensions(base64: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      reject(new Error("Failed to load image to get dimensions"))
    }
    img.src = base64
  })
}

/**
 * Downscales an image client-side to a max dimension while retaining aspect ratio.
 * Resolves to a base64 JPEG string. If image is within bounds, returns original base64.
 */
export function createProxyImage(base64: string, maxDim = 800): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = img

      // No downscaling needed if it's already smaller than maxDim
      if (width <= maxDim && height <= maxDim) {
        resolve(base64)
        return
      }

      // Calculate new dimensions preserving aspect ratio
      let newW = width
      let newH = height
      if (width > height) {
        if (width > maxDim) {
          newH = Math.round((height * maxDim) / width)
          newW = maxDim
        }
      } else {
        if (height > maxDim) {
          newW = Math.round((width * maxDim) / height)
          newH = maxDim
        }
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(base64)
        return
      }

      canvas.width = newW
      canvas.height = newH
      ctx.drawImage(img, 0, 0, newW, newH)
      
      // Use JPEG format with high quality (90%) for the proxy image
      resolve(canvas.toDataURL("image/jpeg", 0.9))
    }
    img.onerror = () => {
      resolve(base64)
    }
    img.src = base64
  })
}
