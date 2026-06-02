import type { Project, ProjectSummary } from "@/types/project"

const now = new Date().toISOString()

export const MOCK_PROJECTS: Project[] = [
  {
    id: "mock-1",
    name: "Contoh Project A",
    description: "Demo project dengan brightness & contrast",
    nodes: [],
    edges: [],
    has_image: false,
    thumbnail: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "mock-2",
    name: "Landscape Edit",
    description: "Edge detection experiment",
    nodes: [],
    edges: [],
    has_image: false,
    thumbnail: null,
    created_at: now,
    updated_at: now,
  },
]
