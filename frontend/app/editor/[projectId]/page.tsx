"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ReactFlowProvider } from "reactflow"
import { EditorLayout } from "@/components/editor/EditorLayout"
import { useGraphStore } from "@/stores/graph-store"
import { useProjectStore } from "@/stores/project-store"
import { useCanvasStore } from "@/stores/canvas-store"
import { projectApi } from "@/lib/api"
import type { EditorNode, EditorEdge } from "@/types/graph"

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const setNodes = useGraphStore((s) => s.setNodes)
  const setEdges = useGraphStore((s) => s.setEdges)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const setSourceImage = useCanvasStore((s) => s.setSourceImage)
  const setProcessedImage = useCanvasStore((s) => s.setProcessedImage)

  useEffect(() => {
    async function load() {
      try {
        const project = await projectApi.get(projectId)
        setActiveProject(project)

        // Restore node graph or set default
        if (project.nodes.length > 0) {
          setNodes(project.nodes as EditorNode[])
          setEdges(project.edges as EditorEdge[])
        } else {
          const { nanoid } = await import("nanoid")
          const inputId = nanoid()
          const brightnessId = nanoid()
          const outputId = nanoid()
          setNodes([
            { id: inputId,      type: "imageInput", position: { x: 60,  y: 120 }, data: {} },
            { id: brightnessId, type: "brightness",  position: { x: 280, y: 120 }, data: { value: 0 } },
            { id: outputId,     type: "output",      position: { x: 500, y: 120 }, data: {} },
          ])
          setEdges([
            { id: nanoid(), source: inputId,      target: brightnessId },
            { id: nanoid(), source: brightnessId, target: outputId },
          ])
        }

        // Load source image — works for both real URL and blob: objectURL
        if (project.has_image) {
          const url = projectApi.getImageUrl(projectId)
          if (!url) return
          try {
            const res = await fetch(url)
            const blob = await res.blob()
            const reader = new FileReader()
            reader.onload = (ev) => {
              const b64 = ev.target?.result as string
              setSourceImage(b64)
              setProcessedImage(b64)
            }
            reader.readAsDataURL(blob)
          } catch {
            // Image URL unreachable (e.g. mock objectURL expired) — silently skip
          }
        }
      } catch {
        router.push("/")
      }
    }
    load()
  }, [projectId]) // eslint-disable-line

  return (
    <ReactFlowProvider>
      <EditorLayout />
    </ReactFlowProvider>
  )
}
