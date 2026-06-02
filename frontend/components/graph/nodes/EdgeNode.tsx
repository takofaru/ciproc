"use client"
import { BaseNode } from "./BaseNode"

interface Props { id: string; data: {} }

export function EdgeNode({ id }: Props) {
  return (
    <BaseNode id={id} title="Edge Detect" color="#fb7185">
      <p className="text-xs text-zinc-400">Sobel gradient magnitude</p>
    </BaseNode>
  )
}
