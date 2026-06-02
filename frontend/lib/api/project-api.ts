import type {
  Project, ProjectSummary, ProjectCreate, ProjectUpdate
} from "@/types/project"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? "Request failed")
  }
  return res.json() as Promise<T>
}

export const projectApi = {
  list: () =>
    request<ProjectSummary[]>("/projects/"),

  get: (id: string) =>
    request<Project>(`/projects/${id}`),

  create: (body: ProjectCreate) =>
    request<Project>("/projects/", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: string, body: ProjectUpdate) =>
    request<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" }),

  duplicate: (id: string) =>
    request<Project>(`/projects/${id}/duplicate`, { method: "POST" }),

  uploadImage: async (id: string, file: File): Promise<{ ok: boolean; thumbnail: string }> => {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch(`${BASE}/projects/${id}/image`, {
      method: "POST",
      body: fd,
    })
    if (!res.ok) throw new Error("Image upload failed")
    return res.json()
  },

  getImageUrl: (id: string) => `${BASE}/projects/${id}/image`,
}
