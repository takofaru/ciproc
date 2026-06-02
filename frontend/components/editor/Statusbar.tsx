"use client"

import { useCanvasStore } from "@/stores/canvas-store"

export function Statusbar() {
  const { viewport, imageTransform, isPyodideReady, isProcessing, processedImage } = useCanvasStore()

  return (
    <footer className="panel mx-2 mb-2 px-3 flex items-center justify-between text-xs text-zinc-500">
      <div className="flex items-center gap-4">
        <span>
          Zoom: {Math.round(viewport.zoom * 100)}%
        </span>
        <span>
          Pan: {Math.round(viewport.panX)}, {Math.round(viewport.panY)}
        </span>
        <span>
          Rot: {imageTransform.rotation}°
        </span>
        {imageTransform.scaleX < 0 && <span className="text-blue-400">FlipH</span>}
        {imageTransform.scaleY < 0 && <span className="text-blue-400">FlipV</span>}
      </div>

      <div className="flex items-center gap-2">
        {isProcessing && (
          <span className="text-yellow-400 animate-pulse">● Processing</span>
        )}
        {!isProcessing && processedImage && (
          <span className="text-emerald-400">● Ready</span>
        )}
        {!isPyodideReady && (
          <span className="text-zinc-600">Initializing Python engine…</span>
        )}
      </div>
    </footer>
  )
}
