"use client"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"

interface Props {
  id: string
  data: { method?: string; size?: number }
}

export function MorphologyNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const method = data.method ?? "erosion"
  const size = data.size ?? 3

  return (
    <BaseNode id={id} title="Morphology" color="#f43f5e">
      <div className="flex flex-col gap-2 min-w-[150px]">
        {/* Method Select */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">Operation</span>
          <select
            value={method}
            onChange={(e) => updateNodeData(id, { method: e.target.value })}
            className="w-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 px-2 py-1 rounded outline-none cursor-pointer"
          >
            <option value="erosion">Erosion (Min)</option>
            <option value="dilation">Dilation (Max)</option>
          </select>
        </div>

        {/* Kernel Size Select */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">Kernel Size</span>
          <select
            value={size}
            onChange={(e) => updateNodeData(id, { size: Number(e.target.value) })}
            className="w-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 px-2 py-1 rounded outline-none cursor-pointer"
          >
            <option value={3}>3 x 3</option>
            <option value={5}>5 x 5</option>
            <option value={7}>7 x 7</option>
          </select>
        </div>
      </div>
    </BaseNode>
  )
}
