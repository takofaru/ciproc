export interface WorkerRequest {
  type: string

  payload: {
    image?: string
    value?: number
  }
}

export interface WorkerResponse {
  image?: string
}