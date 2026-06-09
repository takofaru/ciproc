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

  history: Array<{ nodes: EditorNode[]; edges: EditorEdge[] }>
  future:  Array<{ nodes: EditorNode[]; edges: EditorEdge[] }>

  onNodesChange: (changes: EditorNodeChange[]) => void
  onEdgesChange: (changes: EditorEdgeChange[]) => void
  onConnect: (connection: EditorConnection) => void

  setNodes: (nodes: EditorNode[]) => void
  setEdges: (edges: EditorEdge[]) => void
  updateNodeData: (id: string, data: Partial<EditorNode["data"]>) => void

  snapshot: () => void
  undo: () => void
  redo: () => void
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  history: [],
  future: [],

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

  snapshot: () => {
    const { nodes, edges, history } = get()
    set({
      history: [...history.slice(-49), { nodes, edges }], //max 49step
      future: [],
    })
  },

  undo: () => {
    const { history, future, nodes, edges } = get()
    if (!history.length) return
    const prev = history[history.length - 1]
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      history: history.slice(0, -1),
      future: [{ nodes, edges}, ...future],
    })
  },

  redo: ()=> {
    const { history, future, nodes, edges } = get()
    if (!future.length) return
    const next = future[0]
    set({
      nodes: next.nodes,
      edges: next.edges,
      history: [...history, { nodes, edges }],
      future: future.slice(1),
    })
  },

  updateNodeData: (id, data) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }),
    
}))
