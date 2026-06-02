"use client"
import { useCallback } from "react"
import { BaseNode } from "./BaseNode"
import { useCanvasStore } from "@/stores/canvas-store"
import { useGraphStore } from "@/stores/graph-store"

interface Props { id: string; data: { label?: string } }

export function ImageInputNode({ id, data }: Props) {
  const setSourceImage = useCanvasStore((s) => s.setSourceImage)
  const setProcessedImage = useCanvasStore((s) => s.setProcessedImage)

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string
      setSourceImage(b64)
      setProcessedImage(b64) // will be replaced by pipeline
    }
    reader.readAsDataURL(file)
  }, [setSourceImage, setProcessedImage])

  return (
    <BaseNode id={id} title="Image Input" color="#22c55e" hasInput={false}>
      <label className="editor-button text-sm cursor-pointer block text-center">
        Upload Image
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
    </BaseNode>
  )
}
