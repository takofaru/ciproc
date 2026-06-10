"use client"

import { useCallback } from "react"
import { nanoid } from "nanoid"
import { useGraphStore } from "@/stores/graph-store"
import { useCropStore } from "@/stores/crop-store"
import { NODE_CATALOG } from "@/lib/graph/node-registry"

const groups = ["Source", "Adjust", "Color", "Convolve", "Transform", "Sink"]

export function Sidebar() {
  const nodes = useGraphStore((s) => s.nodes)
  const setNodes = useGraphStore((s) => s.setNodes)
  const snapshot = useGraphStore((s) => s.snapshot)
  const activate = useCropStore((s) => s.activate)
  const isActive = useCropStore((s) => s.isActive)

  const addNode = useCallback((type: string) => {
    snapshot()
    const offset = (nodes.length % 6) * 40
    setNodes([
      ...nodes,
      {
        id: nanoid(),
        type,
        position: { x: 200 + offset, y: 100 + offset },
        data: {},
      },
    ])
  }, [nodes, setNodes, snapshot])

  // Tambah node Scale lalu langsung buka — node sudah cukup sebagai UI-nya
  const handleAddScale = useCallback(() => {
    addNode("scale")
  }, [addNode])

  // Tambah node Crop lalu langsung aktifkan crop overlay
  const handleAddCrop = useCallback(() => {
    const id = nanoid()
    snapshot()
    const offset = (nodes.length % 6) * 40
    setNodes([
      ...nodes,
      {
        id,
        type: "crop",
        position: { x: 200 + offset, y: 100 + offset },
        data: {},
      },
    ])
    // Langsung buka overlay setelah node dibuat
    activate(id)
  }, [nodes, setNodes, snapshot, activate])

  return (
    <aside className="editor-panel overflow-auto">
      <div className="panel-header">Modules</div>

      {/* ── Quick Actions ── */}
      <div className="px-3 py-3 border-b border-zinc-800 flex flex-col gap-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Quick Tools</p>

        <button
          onClick={handleAddScale}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
            bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20
            hover:border-indigo-500/40 transition-colors text-left"
        >
          <span className="text-base">⇲</span>
          <div>
            <p className="text-xs font-medium text-indigo-300">Scale / Resize</p>
            <p className="text-xs text-zinc-600">Percent or pixel dimensions</p>
          </div>
        </button>

        <button
          onClick={handleAddCrop}
          disabled={isActive}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
            bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20
            hover:border-amber-500/40 transition-colors text-left
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="text-base">⬚</span>
          <div>
            <p className="text-xs font-medium text-amber-300">Crop</p>
            <p className="text-xs text-zinc-600">Drag to select area</p>
          </div>
        </button>
      </div>

      {/* ── Node catalog ── */}
      <div className="p-2 flex flex-col gap-3">
        {groups.map((group) => {
          const items = NODE_CATALOG.filter((n) => n.group === group)
          if (!items.length) return null
          return (
            <div key={group}>
              <p className="text-xs text-zinc-500 px-2 mb-1 uppercase tracking-wider">{group}</p>
              {items.map((item) => (
                <button
                  key={item.type}
                  onClick={() => addNode(item.type)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm
                    hover:bg-zinc-800 transition-colors duration-100 flex items-center gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: item.color }}
                  />
                  {item.label}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </aside>
  )
}