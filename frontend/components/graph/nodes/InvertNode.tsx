"use client"
import { BaseNode } from "./BaseNode"

interface Props { id: string; data: Record<string, never> }

export function InvertNode({ id }: Props) {
  return (
    <BaseNode id={id} title="Invert" color="#c084fc">
      <p className="text-xs text-zinc-400">255 − pixel</p>
    </BaseNode>
  )
}
