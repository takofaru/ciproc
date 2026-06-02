"use client"

import { CanvasPreview } from "./CanvasPreview"
import CanvasOverlay from "./CanvasOverlay"

export function ImageViewport() {
  return (
    <div className="relative w-full h-full">
      <CanvasPreview />
      <CanvasOverlay />
    </div>
  )
}