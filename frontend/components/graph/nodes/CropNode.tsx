"use client"

import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"
import { useCropStore } from "@/stores/crop-store"
import { useCanvasStore } from "@/stores/canvas-store"

interface Props {
  id: string
  data: { cropX?: number; cropY?: number; cropW?: number; cropH?: number; }
}

export function CropNode({ id, data }: Props) {
  const { originalWidth, originalHeight } = useCanvasStore()
  const activate = useCropStore((s) => s.activate)
  const isActive = useCropStore((s) => s.isActive)
  const pendingNodeId = useCropStore((s) => s.pendingNodeId)

  const hasRect = data.cropW && data.cropH

  const openCrop = () => {
    activate(id, hasRect ? {
      x: data.cropX ?? 0,
      y: data.cropY ?? 0,
      width:  data.cropW  ?? (originalWidth  || 800),
      height: data.cropH ?? (originalHeight || 600),
    } : undefined)
  }

  const isThisActive = isActive && pendingNodeId === id

  return (
    <BaseNode id={id} title="Crop" color="#f59e0b">
      <div className="flex flex-col gap-2 min-w-[180px]">
        {/* Current crop info */}
        {hasRect ? (
          <div className="rounded px-2 py-1.5 text-xs flex flex-col gap-1" style={{ background: "#0d1117" }}>
            <div className="flex justify-between text-zinc-400">
              <span>Position</span>
              <span className="font-mono">{data.cropX ?? 0}, {data.cropY ?? 0}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Size</span>
              <span className="font-mono">{data.cropW} × {data.cropH} px</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-600">No crop selection</p>
        )}

        {/* Open crop tool button */}
        <button
          onClick={openCrop}
          disabled={isActive && !isThisActive}
          className={`w-full py-1.5 rounded-md text-xs font-medium transition-colors ${
            isThisActive
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
              : "bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isThisActive ? "● Cropping…" : hasRect ? "Edit Crop" : "Select Crop Area"}
        </button>
      </div>
    </BaseNode>
  )
}
