"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ProjectSummary } from "@/types/project"
import { projectApi } from "@/lib/api"
import { useProjectStore } from "@/stores/project-store"

interface Props {
  project: ProjectSummary
  onDeleted: () => void
}

export function ProjectCard({ project, onDeleted }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const removeProject = useProjectStore((s) => s.removeProject)

  const open = () => router.push(`/editor/${project.id}`)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete "${project.name}"?`)) return
    setDeleting(true)
    try {
      await projectApi.delete(project.id)
      removeProject(project.id)
      onDeleted()
    } catch {
      setDeleting(false)
    }
  }

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await projectApi.duplicate(project.id)
    onDeleted()
  }

  const date = new Date(project.updated_at).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  })

  return (
    <div onClick={open} className="project-card group">
      {/* Thumbnail */}
      <div className="project-thumb">
        {project.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-700">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="8" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="13" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 24 l8-8 5 5 5-7 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs">No image</span>
          </div>
        )}
        <div className="project-thumb-overlay">
          <span className="text-sm font-medium">Open Project</span>
        </div>
      </div>

      {/* Footer */}
      <div className="project-footer">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{project.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{date}</p>
        </div>

        {/* Context menu — pure CSS open/close via group + peer */}
        <div
          className="relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hidden checkbox drives open state */}
          <input
            type="checkbox"
            id={`menu-${project.id}`}
            className="peer sr-only"
          />

          {/* Trigger button */}
          <label
            htmlFor={`menu-${project.id}`}
            className="w-7 h-7 rounded-md flex items-center justify-center
              text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700
              transition-colors cursor-pointer select-none"
          >
            •••
          </label>

          {/* Backdrop — clicking it unchecks via label trick */}
          <label
            htmlFor={`menu-${project.id}`}
            className="fixed inset-0 z-10 hidden peer-checked:block cursor-default"
          />

          {/* Dropdown */}
          <div className="absolute right-0 bottom-9 z-20 context-menu
            hidden peer-checked:block">
            <button onClick={handleDuplicate} className="context-menu-item">
              Duplicate
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="context-menu-item text-red-400 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
