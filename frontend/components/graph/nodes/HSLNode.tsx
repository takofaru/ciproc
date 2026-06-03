"use client"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"

interface Props {
  id: string
  data: { hue?: number; saturation?: number; luminance?: number }
}

export function HSLNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const hue = data.hue ?? 0
  const saturation = data.saturation ?? 1.0
  const luminance = data.luminance ?? 1.0

  return (
    <BaseNode id={id} title="HSL Adjust" color="#10b981">
      <div className="flex flex-col gap-2.5 min-w-[160px]">
        {/* Hue Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-zinc-500 font-semibold uppercase">
            <span>Hue</span>
            <span className="text-zinc-400 font-normal">{hue}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={hue}
            onChange={(e) => updateNodeData(id, { hue: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
        </div>

        {/* Saturation Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-zinc-500 font-semibold uppercase">
            <span>Saturation</span>
            <span className="text-zinc-400 font-normal">{saturation.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={saturation}
            onChange={(e) => updateNodeData(id, { saturation: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
        </div>

        {/* Luminance Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-zinc-500 font-semibold uppercase">
            <span>Luminance</span>
            <span className="text-zinc-400 font-normal">{luminance.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={luminance}
            onChange={(e) => updateNodeData(id, { luminance: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
        </div>
      </div>
    </BaseNode>
  )
}
