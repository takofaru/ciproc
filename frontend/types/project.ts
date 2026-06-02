export interface NodeData {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface EdgeData {
  id: string
  source: string
  target: string
}

export interface Project {
  id: string
  name: string
  description: string
  nodes: NodeData[]
  edges: EdgeData[]
  has_image: boolean
  thumbnail: string | null
  created_at: string
  updated_at: string
}

export interface ProjectSummary {
  id: string
  name: string
  description: string
  has_image: boolean
  thumbnail: string | null
  created_at: string
  updated_at: string
}

export interface ProjectCreate {
  name: string
  description?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string
  nodes?: NodeData[]
  edges?: EdgeData[]
}
