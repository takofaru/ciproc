"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { projectApi } from "@/lib/api"
import { useProjectStore } from "@/stores/project-store"

interface Props {
  onClose: () => void
}

export function NewProjectModal({ onClose }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const setProjects = useProjectStore((s) => s.setProjects)
  const projects = useProjectStore((s) => s.projects)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const project = await projectApi.create({ name: name.trim(), description })
      setProjects([{ ...project }, ...projects])
      router.push(`/editor/${project.id}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-base font-semibold">New Project</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center
              text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Project Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Project ABC"
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Description <span className="text-zinc-600">(optional)</span></label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description…"
              className="input-field"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="editor-button"
          >
            {loading ? "Creating…" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  )
}
