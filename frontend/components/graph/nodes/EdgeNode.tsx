"use client"
import { BaseNode } from "./BaseNode"
import { useGraphStore } from "@/stores/graph-store"

interface Props {
  id: string
  data: { method?: string }
}

export function EdgeNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const method = data.method ?? "sobel"

  return (
    <BaseNode id={id} title="Edge Detect" color="#fb7185">
      <div className="flex flex-col gap-2 min-w-[145px]">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">Operator</span>
          <select
            value={method}
            onChange={(e) => updateNodeData(id, { method: e.target.value })}
            className="w-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 px-2 py-1 rounded outline-none cursor-pointer"
          >
            <option value="sobel">Sobel</option>
            <option value="prewitt">Prewitt</option>
            <option value="robert">Roberts Cross</option>
            <option value="laplacian">Laplacian</option>
            <option value="log">Laplacian of Gaussian</option>
            <option value="canny">Canny</option>
          </select>
        </div>
      </div>
    </BaseNode>
  )
}
