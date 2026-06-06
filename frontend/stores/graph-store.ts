import { create } from "zustand"
import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow"
import type {
  EditorConnection,
  EditorEdge,
  EditorEdgeChange,
  EditorNode,
  EditorNodeChange,
} from "@/types/graph"

interface GraphStore {
  nodes: EditorNode[]
  edges: EditorEdge[]

  setNodes: (nodes: EditorNode[]) => void
  setEdges: (edges: EditorEdge[]) => void
  onNodesChange: (changes: EditorNodeChange[]) => void
  onEdgesChange: (changes: EditorEdgeChange[]) => void
  onConnect: (connection: EditorConnection) => void
  updateNodeData: (id: string, data: Partial<EditorNode["data"]>) => void
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) => {
    const { source, target, sourceHandle, targetHandle } = connection
    if (!source || !target) return

    const existingEdges = get().edges
    const exactMatch = existingEdges.find(
      (e) =>
        e.source === source &&
        e.target === target &&
        e.sourceHandle === sourceHandle &&
        e.targetHandle === targetHandle
    )

    if (exactMatch) {
      // Toggle delete: remove the existing edge
      set({
        edges: existingEdges.filter((e) => e.id !== exactMatch.id),
      })
    } else {
      // 1-to-1 rule: remove any edges connected to the same target handle OR the same source handle
      const filteredEdges = existingEdges.filter(
        (e) =>
          !(e.source === source && e.sourceHandle === sourceHandle) &&
          !(e.target === target && e.targetHandle === targetHandle)
      )
      // Add the new edge
      set({
        edges: addEdge(connection, filteredEdges),
      })
    }
  },

  updateNodeData: (id, data) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }),
}))
