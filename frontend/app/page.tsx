"use client"

import { useEffect, useState, useCallback } from "react"
import { ProjectCard } from "@/components/dashboard/ProjectCard"
import { NewProjectModal } from "@/components/dashboard/NewProjectModal"
import { projectApi } from "@/lib/api"
import { useProjectStore } from "@/stores/project-store"

import Link from "next/link"

export default function Dashboard() {
  const { projects, setProjects, isLoading, setLoading, error, setError } = useProjectStore()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await projectApi.list()
      setProjects(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect to backend")
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setProjects])

  useEffect(() => { load() }, [load])

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="dashboard-layout">
      {/* ── Sidebar ── */}
      <aside className="dashboard-sidebar">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            CIP
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Mini Photoshop</p>
            <p className="text-xs text-zinc-600 mt-0.5">Ciprog</p>
          </div>
        </div>

        <nav className="p-4 flex flex-col gap-0.5 mt-1">
          <button className="dashboard-nav-item active">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 3h11M2 7.5h11M2 12h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            All Projects
          </button>
          <Link href="/cip-viewer" className="dashboard-nav-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            CIP File Viewer
          </Link>
        </nav>

        <div className="mt-auto p-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="dashboard-main">
        {/* Header */}
        <div className="dashboard-topbar">
          <div>
            <h1 className="text-lg font-semibold">Projects</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Your image processing workspaces</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field text-sm w-56"
            />
            <button
              onClick={() => setShowNew(true)}
              className="editor-button flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span>
              New Project
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="dashboard-content">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-600">
              <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-blue-500 animate-spin" />
              <p className="text-sm">Loading projects…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-600">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="16" stroke="#ef4444" strokeWidth="1.5"/>
                <path d="M20 12v10M20 27v2" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className="text-sm text-red-400">{error}</p>
              <p className="text-xs text-zinc-600">Make sure the backend is running on port 8000</p>
              <button onClick={load} className="editor-button text-sm">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-600">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="10" width="32" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 22h16M16 28h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-sm">
                {search ? `No projects matching "${search}"` : "No projects yet"}
              </p>
              {!search && (
                <button onClick={() => setShowNew(true)} className="editor-button text-sm">
                  Create your first project
                </button>
              )}
            </div>
          ) : (
            <div className="project-grid">
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDeleted={load}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
