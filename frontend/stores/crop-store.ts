import { create } from "zustand"

export interface CropRect {
  x: number      // image pixel coords
  y: number
  width: number
  height: number
}

interface CropStore {
  isActive: boolean       // crop overlay visible
  rect: CropRect | null   // current selection, null = no selection yet
  pendingNodeId: string | null  // which node to update on Apply

  activate: (nodeId: string, initial?: CropRect) => void
  deactivate: () => void
  setRect: (r: CropRect) => void
}

export const useCropStore = create<CropStore>((set) => ({
  isActive: false,
  rect: null,
  pendingNodeId: null,

  activate: (nodeId, initial) =>
    set({ isActive: true, pendingNodeId: nodeId, rect: initial ?? null }),

  deactivate: () =>
    set({ isActive: false, pendingNodeId: null }),

  setRect: (r) => set({ rect: r }),
}))
