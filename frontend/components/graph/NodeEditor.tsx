"use client"

import { useCallback, useEffect, useRef } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  // useReactFlow,
} from "reactflow"
import "reactflow/dist/style.css"

import { useEditorStore } from "@/stores/editor-store"
import { nodeTypes } from "@/lib/graph/node-registry"
import { useGraphStore } from "@/stores/graph-store"
import { useCanvasStore } from "@/stores/canvas-store"
import { executePipeline } from "@/lib/graph/pipeline-executor"
import { initPyodideWorker } from "@/lib/pyodide/pyodide-client"
import { EditorNode } from "@/types/graph"

export function NodeEditor() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGraphStore()
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode)
  const sourceImage = useCanvasStore((s) => s.sourceImage)
  const setProcessedImage = useCanvasStore((s) => s.setProcessedImage)
  const setProcessing = useCanvasStore((s) => s.setProcessing)
  const isPyodideReady = useCanvasStore((s) => s.isPyodideReady)
  const setPyodideReady = useCanvasStore((s) => s.setPyodideReady)

  // Track last processed state to avoid re-running identical pipelines
  const lastRunRef = useRef<string>("")

  // Init Pyodide in background
  useEffect(() => {
    initPyodideWorker().then(() => setPyodideReady(true)).catch(console.error)
  }, [setPyodideReady])

  // Re-run pipeline whenever nodes/edges/sourceImage change
  useEffect(() => {
    if (!sourceImage || !isPyodideReady) return

    const key = JSON.stringify({ nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })), edges })
    if (key === lastRunRef.current) return
    lastRunRef.current = key

    setProcessing(true)
    executePipeline(sourceImage, nodes, edges)
      .then((result) => {
        setProcessedImage(result)
      })
      .catch(console.error)
      .finally(() => setProcessing(false))
  }, [nodes, edges, sourceImage, isPyodideReady]) // eslint-disable-line

  return (
    <div className="editor-panel h-full" style={{ background: "#0d1117" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node as EditorNode)}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#2a313c"
          gap={20}
          size={1}
        />
        <MiniMap
          style={{ background: "#171b22", border: "1px solid #2a313c" }}
          nodeColor={(n) => {
            const colors: Record<string, string> = {
              imageInput: "#22c55e", brightness: "#facc15", contrast: "#f97316",
              grayscale: "#94a3b8", invert: "#c084fc", sepia: "#a16207",
              blur: "#67e8f9", sharpen: "#34d399", edge: "#fb7185", output: "#f472b6",
            }
            return colors[n.type ?? ""] ?? "#4f8cff"
          }}
          maskColor="rgba(0,0,0,0.5)"
        />
        <Controls style={{ background: "#171b22", border: "1px solid #2a313c" }} />
      </ReactFlow>
    </div>
  )
}
