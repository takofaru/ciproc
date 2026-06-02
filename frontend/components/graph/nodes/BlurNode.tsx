"use client"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"

interface Props { id: string; data: { radius?: number } }

export function BlurNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const radius = data.radius ?? 1

  return (
    <BaseNode id={id} title="Blur" color="#67e8f9">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Radius</span>
          <span>{radius}px</span>
        </div>
        <input
          type="range" min="1" max="10" step="1" value={radius}
          onChange={(e) => updateNodeData(id, { radius: Number(e.target.value) })}
          className="w-full accent-cyan-400"
        />
      </div>
    </BaseNode>
  )
}
