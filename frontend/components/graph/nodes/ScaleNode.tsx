"use client"

import { useState } from "react"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"
import { useCanvasStore } from "@/stores/canvas-store"

interface Props {
  id: string
  data: {
    mode?: "percent" | "pixel"
    scaleW?: number
    scaleH?: number
    width?: number
    height?: number
    keepAspect?: number
  }
}

export function ScaleNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const snapshot = useGraphStore((s) => s.snapshot)
  const originalWidth  = useCanvasStore((s) => s.originalWidth)
  const originalHeight = useCanvasStore((s) => s.originalHeight)

  const mode       = data.mode       ?? "percent"
  const scaleW     = data.scaleW     ?? 100
  const scaleH     = data.scaleH     ?? 100
  const width      = data.width      ?? (originalWidth  || 800)
  const height     = data.height     ?? (originalHeight || 600)
  const keepAspect = (data.keepAspect ?? 1) === 1

  const commit = (patch: Record<string, unknown>) => {
    snapshot()
    updateNodeData(id, patch)
  }

  const toggleKeep = () => commit({ keepAspect: keepAspect ? 0 : 1 })
  const toggleMode = (m: "percent" | "pixel") => commit({ mode: m })

  return (
    <BaseNode id={id} title="Scale / Resize" color="#818cf8">
      <div className="flex flex-col gap-3 min-w-[200px]">

        {/* Mode toggle */}
        <div className="flex gap-1 p-0.5 rounded-md" style={{ background: "#0d1117" }}>
          {(["percent", "pixel"] as const).map((m) => (
            <button key={m}
              onClick={() => toggleMode(m)}
              className={`flex-1 py-0.5 rounded text-xs font-medium transition-colors ${
                mode === m ? "bg-zinc-600 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {m === "percent" ? "%" : "px"}
            </button>
          ))}
        </div>

        {mode === "percent" ? (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-zinc-500 uppercase font-semibold">
                <span>Width</span><span className="text-zinc-400 normal-case">{scaleW}%</span>
              </div>
              <input type="range" min="1" max="400" value={scaleW}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  commit(keepAspect ? { scaleW: v, scaleH: v } : { scaleW: v })
                }}
                className="w-full accent-indigo-400"
              />
            </div>
            {!keepAspect && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-zinc-500 uppercase font-semibold">
                  <span>Height</span><span className="text-zinc-400 normal-case">{scaleH}%</span>
                </div>
                <input type="range" min="1" max="400" value={scaleH}
                  onChange={(e) => commit({ scaleH: Number(e.target.value) })}
                  className="w-full accent-indigo-400"
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">W</span>
              <input type="number" min="1" max="8000" value={width}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (keepAspect && originalWidth && originalHeight) {
                    const ratio = originalHeight / originalWidth
                    commit({ width: v, height: Math.round(v * ratio) })
                  } else {
                    commit({ width: v })
                  }
                }}
                className="w-full text-xs rounded px-2 py-1 outline-none text-zinc-200"
                style={{ background: "#0d1117", border: "1px solid #30363d" }}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">H</span>
              <input type="number" min="1" max="8000" value={height}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (keepAspect && originalWidth && originalHeight) {
                    const ratio = originalWidth / originalHeight
                    commit({ height: v, width: Math.round(v * ratio) })
                  } else {
                    commit({ height: v })
                  }
                }}
                className="w-full text-xs rounded px-2 py-1 outline-none text-zinc-200"
                style={{ background: "#0d1117", border: "1px solid #30363d" }}
              />
            </div>
          </div>
        )}

        {/* Keep aspect ratio */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={toggleKeep}
            className={`w-7 h-4 rounded-full relative transition-colors ${keepAspect ? "bg-indigo-500" : "bg-zinc-700"}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${keepAspect ? "translate-x-3.5" : "translate-x-0.5"}`} />
          </div>
          <span className="text-xs text-zinc-400">Keep aspect ratio</span>
        </label>

        {/* Preview output size */}
        {originalWidth > 0 && (
          <div className="text-[10px] text-zinc-600 text-center">
            {mode === "percent"
              ? `${Math.round(originalWidth * scaleW / 100)} × ${Math.round(originalHeight * (keepAspect ? scaleW : scaleH) / 100)} px`
              : `${width} × ${height} px`
            }
          </div>
        )}
      </div>
    </BaseNode>
  )
}
