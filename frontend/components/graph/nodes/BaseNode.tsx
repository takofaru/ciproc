"use client"
import { Handle, Position, useReactFlow } from "reactflow"
import { useEditorStore } from "@/stores/editor-store"

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
  const { getNode } = useReactFlow()

  return (
    <div
      className="node-container"
      onClick={onSelect}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: color, width: 10, height: 10 }}
        />
      )}

      <div className="node-header" style={{ borderTop: `3px solid ${color}` }}>
        {title}
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
