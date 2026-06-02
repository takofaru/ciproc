"use client"
import { BaseNode } from "./BaseNode"
import { useCanvasStore } from "@/stores/canvas-store"

interface Props { id: string; data: {} }

export function OutputNode({ id }: Props) {
  const processedImage = useCanvasStore((s) => s.processedImage)

  return (
    <BaseNode id={id} title="Output" color="#f472b6" hasOutput={false}>
      <div className="text-xs text-zinc-400">
        {processedImage ? (
          <span className="text-emerald-400">● Image ready</span>
        ) : (
          <span className="text-zinc-500">No image</span>
        )}
      </div>
    </BaseNode>
  )
}
