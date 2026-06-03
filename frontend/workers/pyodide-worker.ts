// Pyodide Web Worker — Python image processing engine
// Runs entirely in a separate thread to keep the UI responsive

let pyodide: unknown = null
interface PyodideInstance {
    loadPackage: (pkgs: string[]) => Promise<void>
    runPythonAsync: (code: string) => Promise<unknown>
    globals: {
        set: (key: string, value: unknown) =>void
    }
}

// Bootstrap Pyodide + NumPy/Pillow once
async function initPyodide(): Promise<PyodideInstance> {
  if (pyodide) return pyodide as PyodideInstance

  // @ts-expect-error – CDN import tidak ada type declaration
  importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.3/full/pyodide.js")

  // @ts-expect-error – loadPyodide ditambahkan oleh importScripts di atas
  pyodide = await (self as DedicatedWorkerGlobalScope & { loadPyodide: (opts: { indexURL: string }) => Promise<unknown> }).loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/",
  })

  const py = pyodide as PyodideInstance
  await py.loadPackage(["numpy", "Pillow"])

  // Python helpers defined once — loaded dynamically from the modules folder
  const pythonScriptUrl = new URL("./modules/image_processor.py", import.meta.url)
  const response = await fetch(pythonScriptUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch Python script: ${response.statusText}`)
  }
  const pythonCode = await response.text()
  await py.runPythonAsync(pythonCode)

  return pyodide as PyodideInstance
}

// Pipeline executor — applies a list of ops in sequence
async function runPipeline(imageB64: string, ops: Array<{type: string, params: Record<string, number>}>, geometryParams?: Record<string, number>): Promise<string> {
  const py = await initPyodide()
  
  py.globals.set("_b64_input", imageB64)
  py.globals.set("_ops_json", JSON.stringify(ops))
  py.globals.set("_geo_json", JSON.stringify(geometryParams ?? null))
  
  const result = await py.runPythonAsync(`
import json

arr = decode_image(_b64_input)
ops = json.loads(_ops_json)
geo = json.loads(_geo_json)

for op in ops:
    t = op["type"]
    p = op.get("params", {})
    
    if t == "brightness":
        arr = apply_brightness(arr, p.get("value", 0))
    elif t == "contrast":
        arr = apply_contrast(arr, p.get("value", 1.0))
    elif t == "grayscale":
        arr = apply_grayscale(arr)
    elif t == "invert":
        arr = apply_invert(arr)
    elif t == "sepia":
        arr = apply_sepia(arr)
    elif t == "blur":
        arr = apply_blur(arr, int(p.get("radius", 1)))
    elif t == "sharpen":
        arr = apply_sharpen(arr, p.get("strength", 1.0))
    elif t == "edge":
        arr = apply_edge(arr)

# Apply geometry only on export
if geo:
    arr = apply_geometry(arr, geo)

encode_image(arr)
  `) as string

  return result
}

self.addEventListener("message", async (e) => {
  const { id, type, payload } = e.data

  try {
    if (type === "init") {
      await initPyodide()
      self.postMessage({ id, type: "init_done" })
      return
    }

    if (type === "process") {
      const { imageB64, ops, geometryParams } = payload
      const result = await runPipeline(imageB64, ops, geometryParams)
      self.postMessage({ id, type: "result", imageB64: result })
      return
    }

    self.postMessage({ id, type: "error", message: `Unknown type: ${type}` })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ id, type: "error", message })
  }
})
