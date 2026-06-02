"use client"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"

interface Props { id: string; data: { strength?: number } }

export function SharpenNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const strength = data.strength ?? 1.0

  return (
    <BaseNode id={id} title="Sharpen" color="#34d399">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Strength</span>
          <span>{strength.toFixed(1)}</span>
        </div>
        <input
          type="range" min="0.1" max="5" step="0.1" value={strength}
          onChange={(e) => updateNodeData(id, { strength: Number(e.target.value) })}
          className="w-full accent-emerald-400"
        />
      </div>
    </BaseNode>
  )
}
