"use client"
import { BaseNode } from "./BaseNode"

interface Props {
  id: string
}

export function HistogramEqNode({ id }: Props) {
  return (
    <BaseNode id={id} title="Histogram Equalization" color="#eab308">
      <div className="flex flex-col gap-1 text-[11px] text-zinc-400 min-w-[140px] leading-relaxed">
        <p>Equalizes luma channel (Y) histogram distribution.</p>
      </div>
    </BaseNode>
  )
}
