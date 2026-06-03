"use client"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"

interface Props {
  id: string
  data: { channel?: string }
}

export function ChannelSplitNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const channel = data.channel ?? "r"

  return (
    <BaseNode id={id} title="Channel Split" color="#3b82f6">
      <div className="flex flex-col gap-2 min-w-[140px]">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">Channel</span>
          <select
            value={channel}
            onChange={(e) => updateNodeData(id, { channel: e.target.value })}
            className="w-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 px-2 py-1 rounded outline-none cursor-pointer"
          >
            <option value="r">Red (R)</option>
            <option value="g">Green (G)</option>
            <option value="b">Blue (B)</option>
          </select>
        </div>
      </div>
    </BaseNode>
  )
}
