"use client"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"

interface Props {
  id: string
  data: { method?: string; radius?: number }
}

export function SmoothNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const method = data.method ?? "gaussian"
  const radius = data.radius ?? 1

  return (
    <BaseNode id={id} title="Smooth / Blur" color="#67e8f9">
      <div className="flex flex-col gap-2 min-w-[150px]">
        {/* Method Select */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">Method</span>
          <select
            value={method}
            onChange={(e) => updateNodeData(id, { method: e.target.value })}
            className="w-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 px-2 py-1 rounded outline-none cursor-pointer"
          >
            <option value="gaussian">Gaussian</option>
            <option value="mean">Mean (Box)</option>
            <option value="median">Median</option>
            <option value="max">Max (Dilation)</option>
            <option value="min">Min (Erosion)</option>
          </select>
        </div>

        {/* Radius Slider */}
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex justify-between text-[10px] text-zinc-500 font-semibold uppercase">
            <span>Radius</span>
            <span className="text-zinc-400 font-normal">{radius}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={radius}
            onChange={(e) => updateNodeData(id, { radius: Number(e.target.value) })}
            className="w-full accent-cyan-400"
          />
        </div>
      </div>
    </BaseNode>
  )
}
