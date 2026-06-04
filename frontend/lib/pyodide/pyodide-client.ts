// Pyodide client — manages worker lifecycle and promise-based messaging

let worker: Worker | null = null
const pendingRequests = new Map<string, { resolve: (v: string) => void; reject: (e: unknown) => void }>()
let ready = false
let readyListeners: (() => void)[] = []

function generateId() {
  return Math.random().toString(36).slice(2)
}

function getWorker(): Worker {
  if (worker) return worker

  worker = new Worker(
    new URL("../../workers/pyodide-worker.ts", import.meta.url),
    { type: "module" }
  )

  worker.onmessage = (e) => {
    const { id, type, imageB64, message } = e.data

    const pending = pendingRequests.get(id)

    if (type === "init_done") {
      ready = true
      if (pending) {
        pendingRequests.delete(id)
        pending.resolve("")
      }
      readyListeners.forEach((fn) => fn())
      readyListeners = []
      return
    }

    if (!pending) return
    pendingRequests.delete(id)

    if (type === "error") {
      pending.reject(new Error(message))
    } else if (type === "histogram_result") {
      pending.resolve(e.data.data)
    } else {
      pending.resolve(imageB64)
    }
  }

  return worker
}

function waitForReady(): Promise<void> {
  if (ready) return Promise.resolve()
  return new Promise((resolve) => readyListeners.push(resolve))
}

export async function initPyodideWorker(): Promise<void> {
  const w = getWorker()
  if (ready) return
  
  return new Promise((resolve, reject) => {
    const id = generateId()
    pendingRequests.set(id, {
      resolve: () => resolve(),
      reject,
    })
    w.postMessage({ id, type: "init", payload: {} })
  })
}

export async function processImage(
  imageB64: string,
  ops: Array<{ type: string; params: Record<string, number> }>,
  geometryParams?: Record<string, number>
): Promise<string> {
  const w = getWorker()
  await waitForReady()

  return new Promise((resolve, reject) => {
    const id = generateId()
    pendingRequests.set(id, { resolve, reject })
    w.postMessage({
      id,
      type: "process",
      payload: { imageB64, ops, geometryParams },
    })
  })
}

// ── Histogram request ─────────────────────────────────────────
export async function computeHistogram(imageB64: string): Promise<{
  r: number[]; g: number[]; b: number[]; gray: number[]
}> {
  const w = getWorker()
  await waitForReady()
  return new Promise((resolve, reject) => {
    const id = generateId()
    pendingRequests.set(id, {
      resolve: (v: string) => resolve(JSON.parse(v)),
      reject,
    })
    w.postMessage({ id, type: "histogram", payload: { imageB64 } })
  })
}
