"use client"
import { BaseNode } from "./BaseNode"

interface Props { id: string; data: Record<string, never> }

export function GrayscaleNode({ id }: Props) {
  return (
    <BaseNode id={id} title="Grayscale" color="#94a3b8">
      <p className="text-xs text-zinc-400">Luminance-weighted (BT.601)</p>
    </BaseNode>
  )
}
