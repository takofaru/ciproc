import { create } from "zustand"
import type { Project, ProjectSummary } from "@/types/project"

interface ProjectStore {
  projects: ProjectSummary[]
  activeProject: Project | null
  isLoading: boolean
  error: string | null

  setProjects: (p: ProjectSummary[]) => void
  setActiveProject: (p: Project | null) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  updateProject: (p: ProjectSummary) => void
  removeProject: (id: string) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProject: null,
  isLoading: false,
  error: null,

  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  updateProject: (updated) =>
    set((s) => ({
      projects: s.projects.map((p) => p.id === updated.id ? updated : p),
    })),

  removeProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
    })),
}))
