"use client"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"

interface Props { id: string; data: { value?: number } }

export function ContrastNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const value = data.value ?? 1.0

  return (
    <BaseNode id={id} title="Contrast" color="#f97316">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Factor (pivot 128)</span>
          <span>{value.toFixed(2)}×</span>
        </div>
        <input
          type="range" min="0" max="4" step="0.05" value={value}
          onChange={(e) => updateNodeData(id, { value: Number(e.target.value) })}
          className="w-full accent-orange-400"
        />
      </div>
    </BaseNode>
  )
}
