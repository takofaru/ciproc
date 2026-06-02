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

  onConnect: (connection) =>
    set({ edges: addEdge(connection, get().edges) }),

  updateNodeData: (id, data) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }),
}))
