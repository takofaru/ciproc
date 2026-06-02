"use client"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"

interface Props { id: string; data: { value?: number } }

export function BrightnessNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const value = data.value ?? 0

  return (
    <BaseNode id={id} title="Brightness" color="#facc15">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Brightness</span>
          <span>{value}</span>
        </div>
        <input
          type="range" min="-255" max="255" value={value}
          onChange={(e) => updateNodeData(id, { value: Number(e.target.value) })}
          className="w-full accent-yellow-400"
        />
      </div>
    </BaseNode>
  )
}
