"use client"
import { BaseNode } from "./BaseNode"

interface Props { id: string; data: {} }

export function SepiaNode({ id }: Props) {
  return (
    <BaseNode id={id} title="Sepia" color="#a16207">
      <p className="text-xs text-zinc-400">Vintage tone filter</p>
    </BaseNode>
  )
}
