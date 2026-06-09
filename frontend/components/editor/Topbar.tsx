"use client"

import { useRef } from "react"
import { useCanvasStore } from "@/stores/canvas-store"
import { useGraphStore } from "@/stores/graph-store"
import { executePipeline } from "@/lib/graph/pipeline-executor"

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { sourceImage, processedImage, imageTransform, setSourceImage, setProcessedImage, isPyodideReady, isProcessing } = useCanvasStore()
  const { nodes, edges } = useGraphStore()

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string
      setSourceImage(b64)
      setProcessedImage(b64)
    }
    reader.readAsDataURL(file)
  }

  const handleExport = async () => {
    if (!sourceImage) return

    // Export = run pipeline WITH geometry permanently applied
    const geoParams = {
      rotation: imageTransform.rotation,
      scaleX: imageTransform.scaleX,
      scaleY: imageTransform.scaleY,
      translateX: imageTransform.x,
      translateY: imageTransform.y,
    }

    try {
      const finalImage = await executePipeline(sourceImage, nodes, edges, geoParams)

      // Trigger download
      const link = document.createElement("a")
      link.href = finalImage
      link.download = "minips-export.jpg"
      link.click()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  return (
    <header className="panel m-2 flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {/* Logo mark */}
          <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
            CIP
          </div>
          <h1 className="font-semibold text-sm">Mini Photoshop</h1>
        </div>

        <div className="h-4 w-px bg-zinc-700" />

        <label className="editor-button text-sm cursor-pointer">
          Import Image
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImport}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        {/* Pyodide status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isProcessing
                ? "bg-yellow-400 animate-pulse"
                : isPyodideReady
                ? "bg-emerald-400"
                : "bg-zinc-600"
            }`}
          />
          <span className="text-xs text-zinc-500">
            {isProcessing ? "Processing…" : isPyodideReady ? "Python ready" : "Loading Python…"}
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-700" />

        <button
          onClick={handleExport}
          disabled={!processedImage || isProcessing}
          className="editor-button text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Export .jpg
        </button>
      </div>
    </header>
  )
}
