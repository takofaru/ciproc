import { create } from "zustand"
import { getImageDimensions, createProxyImage } from "@/lib/utils/image"

// Dual-matrix architecture per the spec:
// viewportState = camera (pan/zoom) — never exported
// imageState    = object transform  — sent to Python on export

export interface ViewportState {
  panX: number
  panY: number
  zoom: number
}

export interface ImageTransformState {
  x: number        // translateX
  y: number        // translateY
  rotation: number // degrees
  scaleX: number   // -1 = flip horizontal
  scaleY: number   // -1 = flip vertical
}

interface CanvasStore {
  // Source image (original, never mutated)
  sourceImage: string | null

  // Downscaled image for preview (max 800px)
  proxyImage: string | null

  // Natural dimensions of the original image
  originalWidth: number
  originalHeight: number

  // Processed image blob URL from Python (after filter ops)
  processedImage: string | null

  // Viewport (camera) state — not exported
  viewport: ViewportState

  // Image transform state — sent to Python on export
  imageTransform: ImageTransformState

  // Loading states
  isPyodideReady: boolean
  isProcessing: boolean

  // Actions
  setSourceImage: (img: string | null) => Promise<void>
  setProcessedImage: (img: string | null) => void
  setViewport: (vp: Partial<ViewportState>) => void
  setImageTransform: (tr: Partial<ImageTransformState>) => void
  setPyodideReady: (ready: boolean) => void
  setProcessing: (v: boolean) => void
  resetViewport: () => void
  resetImageTransform: () => void
}

const defaultViewport: ViewportState = { panX: 0, panY: 0, zoom: 1.0 }
const defaultImageTransform: ImageTransformState = {
  x: 0, y: 0, rotation: 0, scaleX: 1.0, scaleY: 1.0,
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  sourceImage: null,
  proxyImage: null,
  originalWidth: 0,
  originalHeight: 0,
  processedImage: null,
  viewport: { ...defaultViewport },
  imageTransform: { ...defaultImageTransform },
  isPyodideReady: false,
  isProcessing: false,

  setSourceImage: async (img) => {
    if (!img) {
      set({
        sourceImage: null,
        proxyImage: null,
        originalWidth: 0,
        originalHeight: 0,
      })
      return
    }

    try {
      // Fetch dimensions and generate proxy image asynchronously
      const [dimensions, proxy] = await Promise.all([
        getImageDimensions(img),
        createProxyImage(img, 800),
      ])

      set({
        sourceImage: img,
        proxyImage: proxy,
        originalWidth: dimensions.width,
        originalHeight: dimensions.height,
      })
    } catch (e) {
      console.error("Failed to load source image metadata:", e)
      // Fallback to setting source image directly without downscaling
      set({
        sourceImage: img,
        proxyImage: img,
        originalWidth: 0,
        originalHeight: 0,
      })
    }
  },
  setProcessedImage: (img) => set({ processedImage: img }),
  setViewport: (vp) =>
    set((s) => ({ viewport: { ...s.viewport, ...vp } })),
  setImageTransform: (tr) =>
    set((s) => ({ imageTransform: { ...s.imageTransform, ...tr } })),
  setPyodideReady: (ready) => set({ isPyodideReady: ready }),
  setProcessing: (v) => set({ isProcessing: v }),
  resetViewport: () => set({ viewport: { ...defaultViewport } }),
  resetImageTransform: () =>
    set({ imageTransform: { ...defaultImageTransform } }),
}))
