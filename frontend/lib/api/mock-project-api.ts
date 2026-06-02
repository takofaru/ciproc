/**
 * Mock implementation of projectApi — no backend needed.
 * Swap import in lib/api/index.ts to use this while BE is offline.
 * Data lives in memory; resets on page refresh.
 */
import type { Project, ProjectSummary, ProjectCreate, ProjectUpdate } from "@/types/project"
import { MOCK_PROJECTS } from "./mock-data"

let store: Project[] = structuredClone(MOCK_PROJECTS)

function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms))
}

function toSummary(p: Project): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    has_image: p.has_image,
    thumbnail: p.thumbnail,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }
}

export const mockProjectApi = {
  list: async (): Promise<ProjectSummary[]> => {
    await delay()
    return [...store].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    ).map(toSummary)
  },

  get: async (id: string): Promise<Project> => {
    await delay()
    const p = store.find((x) => x.id === id)
    if (!p) throw new Error("Project not found")
    return structuredClone(p)
  },

  create: async (body: ProjectCreate): Promise<Project> => {
    await delay()
    const now = new Date().toISOString()
    const p: Project = {
      id: `mock-${Date.now()}`,
      name: body.name,
      description: body.description ?? "",
      nodes: [],
      edges: [],
      has_image: false,
      thumbnail: null,
      created_at: now,
      updated_at: now,
    }
    store.unshift(p)
    return structuredClone(p)
  },

  update: async (id: string, body: ProjectUpdate): Promise<Project> => {
    await delay(100)
    const idx = store.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error("Project not found")
    store[idx] = {
      ...store[idx],
      ...body,
      updated_at: new Date().toISOString(),
    }
    return structuredClone(store[idx])
  },

  delete: async (id: string): Promise<{ ok: boolean }> => {
    await delay()
    store = store.filter((x) => x.id !== id)
    return { ok: true }
  },

  duplicate: async (id: string): Promise<Project> => {
    await delay()
    const src = store.find((x) => x.id === id)
    if (!src) throw new Error("Project not found")
    const now = new Date().toISOString()
    const p: Project = {
      ...structuredClone(src),
      id: `mock-${Date.now()}`,
      name: `${src.name} (copy)`,
      created_at: now,
      updated_at: now,
    }
    store.unshift(p)
    return structuredClone(p)
  },

  uploadImage: async (_id: string, file: File): Promise<{ ok: boolean; thumbnail: string }> => {
    await delay(200)
    // Generate a local object URL thumbnail — no server needed
    const url = URL.createObjectURL(file)
    const idx = store.findIndex((x) => x.id === _id)
    if (idx !== -1) {
      store[idx].has_image = true
      store[idx].thumbnail = url
    }
    return { ok: true, thumbnail: url }
  },

  getImageUrl: (id: string): string => {
    // Return a placeholder — image was set via uploadImage objectURL
    const p = store.find((x) => x.id === id)
    return p?.thumbnail ?? ""
  },
}
