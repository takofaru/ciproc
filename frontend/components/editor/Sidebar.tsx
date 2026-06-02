"use client"

import { useCallback } from "react"
import { nanoid } from "nanoid"
import { useGraphStore } from "@/stores/graph-store"
import { NODE_CATALOG } from "@/lib/graph/node-registry"

const groups = ["Source", "Adjust", "Color", "Convolve", "Sink"]

export function Sidebar() {
  const nodes = useGraphStore((s) => s.nodes)
  const setNodes = useGraphStore((s) => s.setNodes)

  const addNode = useCallback((type: string) => {
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
  }, [nodes, setNodes])

  return (
    <aside className="editor-panel overflow-auto">
      <div className="panel-header">Modules</div>

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
