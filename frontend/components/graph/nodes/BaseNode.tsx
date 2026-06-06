"use client"
import { Handle, Position } from "reactflow"
import { useEditorStore } from "@/stores/editor-store"
import { useGraphStore } from "@/stores/graph-store"

interface Props {
  id: string
  title: string
  color?: string
  children?: React.ReactNode
  hasInput?: boolean
  hasOutput?: boolean
}

export function BaseNode({ id, title, color = "#4f8cff", children, hasInput = true, hasOutput = true, onSelect }: Props & { onSelect?: () => void }) {
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode)
  const node = useGraphStore((s) => s.nodes.find((n) => n.id === id))
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const disabled = node?.data?.disabled ?? false

  return (
    <div
      className="node-container"
      onClick={onSelect}
      style={{
        opacity: disabled ? 0.45 : 1,
        transition: "opacity 0.2s ease, border-color 0.2s ease",
        border: disabled ? "1px dashed #ef4444" : undefined,
      }}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: color, width: 10, height: 10 }}
        />
      )}

      <div className="node-header flex items-center justify-between gap-4" style={{ borderTop: `3px solid ${color}` }}>
        <span>{title}</span>
        {hasInput && hasOutput && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateNodeData(id, { disabled: !disabled })
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              disabled
                ? "bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-750 hover:text-zinc-400"
                : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900"
            }`}
          >
            {disabled ? "Disabled" : "Active"}
          </button>
        )}
      </div>

      <div className="node-content">{children}</div>

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: color, width: 10, height: 10 }}
        />
      )}
    </div>
  )
}
