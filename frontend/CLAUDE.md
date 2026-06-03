# Developer Guide & Agent Handoff

This document details the architecture, design patterns, recent optimizations, and current state of the `ciproc` frontend to allow other agents or developers to seamlessly continue development.

---

## 🚀 Commands
*   **Run Development Server:** `npm run dev`
*   **Verify Production Build:** `npm run build`
*   **Build Engine & Worker:** Handled automatically by Webpack/Turbopack in the Next.js runtime.

---

## 🏗️ Architecture Overview

The application is structured into three layers to keep the main UI thread highly responsive:

```
[ UI/React Thread ]  <--- (Base64 Proxy/Original) --->  [ Web Worker (TS) ]
 (Zustand Stores)                                      (pyodide-worker.ts)
 (React Flow UI)                                                |
                                                       [ Pyodide Runtime ]
                                                        (MEMFS Virtual FS)
                                                                |
                                                      [ Python Modules ]
                                                     (NumPy / Pillow engine)
```

1.  **UI Thread (React & React Flow):**
    *   **Node Graph Editor:** Built using `reactflow`. Mappings and components are registered in `lib/graph/node-registry.ts` and `types/graph.ts`.
    *   **Dual-Matrix Viewport:** Manages canvas rendering, panning, zooming, and drawing in [CanvasPreview.tsx](file:///home/takofaru/Data/tugas/semester-4/project/ciproc/frontend/components/canvas/CanvasPreview.tsx).
    *   **Canvas Store:** Located in [canvas-store.ts](file:///home/takofaru/Data/tugas/semester-4/project/ciproc/frontend/stores/canvas-store.ts). Operates a **dual-resolution proxy system**:
        *   Pre-processes source images client-side to a maximum resolution of `800px` (Proxy Image) for real-time viewport feedback during slider adjustments.
        *   Retains the original high-resolution base64 string (Source Image) to execute full-resolution rendering upon exporting/downloading.
2.  **Web Worker Thread ([pyodide-worker.ts](file:///home/takofaru/Data/tugas/semester-4/project/ciproc/frontend/workers/pyodide-worker.ts)):**
    *   Imports Pyodide WebAssembly runtime from CDN.
    *   Loads Pyodide packages (`numpy`, `Pillow`).
    *   Fetches Python module files via statically declared URLs (allowing Next.js Turbopack to correctly bundle and trace them).
    *   Writes code into Pyodide's virtual filesystem (MEMFS) at `/home/pyodide/`.
    *   Executes pipeline operations.
3.  **Python Processing Engine (`workers/modules/`):**
    *   [image_io.py](file:///home/takofaru/Data/tugas/semester-4/project/ciproc/frontend/workers/modules/image_io.py): Base64 image decoding/encoding.
    *   [intensity.py](file:///home/takofaru/Data/tugas/semester-4/project/ciproc/frontend/workers/modules/intensity.py): HSL mapping, YCbCr luma histogram equalization, splitting, thresholding.
    *   [spatial.py](file:///home/takofaru/Data/tugas/semester-4/project/ciproc/frontend/workers/modules/spatial.py): Convolutions (Gaussian, Mean, Min, Max, Median) and sharpening.
    *   [edge_detect.py](file:///home/takofaru/Data/tugas/semester-4/project/ciproc/frontend/workers/modules/edge_detect.py): Roberts, Sobel, Prewitt, Laplacian, LoG, and Canny filters.
    *   [morphology.py](file:///home/takofaru/Data/tugas/semester-4/project/ciproc/frontend/workers/modules/morphology.py): Grayscale and binary Erosion and Dilation.
    *   [geometry.py](file:///home/takofaru/Data/tugas/semester-4/project/ciproc/frontend/workers/modules/geometry.py): Rotations, flips, scales, and translations.

---

## ⚡ Important Conventions & Core Rules

### 1. Turbopack Static URLs Constraint
Dynamic template strings (e.g. ``new URL(`./modules/${name}.py`, import.meta.url)``) fail compilation under Next.js Turbopack at build time because assets cannot be statically analyzed. URLs must be declared statically:
```typescript
const moduleUrls: Record<string, URL> = {
  image_io: new URL("./modules/image_io.py", import.meta.url),
  ...
}
```

### 2. Singleton Initialization Promise
To prevent race conditions from concurrent initialization requests (such as React mounts/HMR calls), `initPyodide()` uses a cached `initPromise` singleton:
```typescript
let initPromise: Promise<PyodideInstance> | null = null
async function initPyodide() {
  if (initPromise) return initPromise
  initPromise = (async () => { ... })()
  return initPromise
}
```

### 3. Execution Scope Imports
To avoid `NameError` exceptions inside the Pyodide WebWorker thread due to module scope pollution or cache clearing, python module wildcard imports must be injected at the top of the `runPipeline` evaluation block:
```python
from image_io import *
from intensity import *
# ... (ensures symbols are bound inside runPythonAsync execution namespace)
```

### 4. Vectorized Python Code
Any nested loops over pixels in Python will cause severe lagging in Pyodide. All image processing steps must be fully vectorized in NumPy. For example, Canny Edge Detection utilizes shifted NumPy arrays and Boolean arrays to run NMS and hysteresis in `15ms` rather than `3000ms`.

### 5. Screen-Space Checkerboard Background
Drawing the canvas checkerboard background in viewport-scaled coordinates creates massive performance bottlenecks when zoomed out (since the coordinates bounds expand by `1/zoom`). The checkerboard background must be drawn in **unscaled screen coordinates** offset by `viewport.panX % (size * 2)` to simulate panning without scaling.

---

## 🛠️ Recent Optimizations & Completed Tasks

1.  **Pyodide Import Race Conditions Resolved:** Fixed issues where `apply_brightness` or other methods were thrown as `NameError` by moving worker initialization to a cached promise and executing local scope module imports inside `runPipeline`.
2.  **Canny Edge Detection Speedup:** Vectorized the nested Python loops for Non-Maximum Suppression (NMS) and Hysteresis inside `canny_edge_detection` using NumPy masking and vector shifts.
3.  **Low-Zoom Lag Fixed:** Resolved UI freeze/lag when zooming out below 20% by drawing the checkerboard background in screen space with modulo pan offsets instead of viewport-scaled space.
4.  **Canvas Centering & ResizeObserver:** Synced stage centering logic with ResizeObserver size adjustments and the asynchronous image load events (`imageLoadedCount`) to guarantee that imported images fit and center correctly without jumping when adjusting sliders.

---

## 📋 Next Steps for Future Work

*   **Matplotlib Rendering Data Export:** Instead of plotting graphs with matplotlib directly in python (which is slow and complex to display in canvas), gather histogram frequency distribution bins inside the Python scope and return them to the JS client thread as a JSON string to render them using lightweight JS charting libraries (e.g., Chart.js or Recharts).
*   **Staging/Production Pipeline Verification:** Run and test on a real production staging environment to verify pipeline throughput on extremely large images (e.g., above 4K resolution).
