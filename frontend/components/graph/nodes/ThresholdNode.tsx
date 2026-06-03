"use client"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"

interface Props {
  id: string
  data: { value?: number }
}

export function ThresholdNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const value = data.value ?? 128

  return (
    <BaseNode id={id} title="Threshold" color="#a855f7">
      <div className="flex flex-col gap-2 min-w-[140px]">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Threshold</span>
          <span>{value}</span>
        </div>
        <input
          type="range"
          min="0"
          max="255"
          value={value}
          onChange={(e) => updateNodeData(id, { value: Number(e.target.value) })}
          className="w-full accent-purple-500"
        />
      </div>
    </BaseNode>
  )
}
