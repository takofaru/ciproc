import { create } from "zustand"
import type { EditorNode } from "@/types/graph"

interface EditorStore {
  selectedNode: EditorNode | null
  setSelectedNode: (node: EditorNode | null) => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node }),
}))
