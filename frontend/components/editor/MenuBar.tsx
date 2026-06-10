"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProjectStore } from "@/stores/project-store"
import { useCanvasStore } from "@/stores/canvas-store"
import { useGraphStore } from "@/stores/graph-store"
import { projectApi } from "@/lib/api"
import { executePipeline } from "@/lib/graph/pipeline-executor"
import { nanoid } from "nanoid"
import { ExportModal } from "./ExportModal"
import { CipViewerModal } from "./CipViewerModal"
import { useCropStore } from "@/stores/crop-store"

// ── Types ────────────────────────────────────────────────────
type MenuItemDef =
  | { label: string; shortcut?: string; action: () => void; disabled?: boolean }
  | { separator: true }

interface MenuDef {
  label: string
  items: MenuItemDef[]
}

// ── Dropdown ─────────────────────────────────────────────────
function MenuDropdown({
  items,
  onClose,
}: {
  items: MenuItemDef[]
  onClose: () => void
}) {
  return (
    <div className="menu-dropdown">
      {items.map((item, i) => {
        if ("separator" in item) {
          return <div key={i} className="menu-separator" />
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => {
              item.action()
              onClose()
            }}
            className="menu-dropdown-item"
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── MenuBar ──────────────────────────────────────────────────
export function MenuBar() {
  const undo = useGraphStore((s) => s.undo)
  const redo = useGraphStore((s) => s.redo)
  const canUndo = useGraphStore((s) => s.history.length > 0)
  const canRedo = useGraphStore((s) => s.future.length > 0)

  const activate = useCropStore((s) => s.activate)
  const isActive = useCropStore((s) => s.isActive)

  const router = useRouter()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const INPUT_ID = "menu-file-input"

  const activeProject = useProjectStore((s) => s.activeProject)
  const {
    sourceImage,
    processedImage,
    imageTransform,
    setSourceImage,
    setProcessedImage,
    setImageTransform,
    resetImageTransform,
    resetViewport,
    isPyodideReady,
    isProcessing,
  } = useCanvasStore()
  const { nodes, edges, setNodes, setEdges } = useGraphStore()

  // Close on outside click
  useEffect(() => {
    if (!openMenu) return
    const handler = () => setOpenMenu(null)
    window.addEventListener("click", handler)
    return () => window.removeEventListener("click", handler)
  }, [openMenu])

  const toggle = (label: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenMenu((v) => (v === label ? null : label))
  }

  // ── Actions ─────────────────────────────────────────────────
  const saveProject = useCallback(async () => {
    if (!activeProject) return
    await projectApi.update(activeProject.id, {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type ?? "unknown",
        position: n.position,
        data: n.data as Record<string, unknown>,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    })
  }, [activeProject, nodes, edges])

  // Dibungkus useCallback agar referensi stabil — tidak diakses saat render
  const importImage = useCallback(() => {
    document.getElementById(INPUT_ID)?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !activeProject) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const b64 = ev.target?.result as string
        setSourceImage(b64)
        setProcessedImage(b64)
      }
      reader.readAsDataURL(file)
      await projectApi.uploadImage(activeProject.id, file)
    },
    [activeProject, setSourceImage, setProcessedImage]
  )

  const exportImage = useCallback(async () => {
    if (!sourceImage) return
    const geoParams = {
      rotation: imageTransform.rotation,
      scaleX: imageTransform.scaleX,
      scaleY: imageTransform.scaleY,
      translateX: imageTransform.x,
      translateY: imageTransform.y,
    }
    const finalImage = await executePipeline(sourceImage, nodes, edges, geoParams)
    const link = document.createElement("a")
    link.href = finalImage
    link.download = `${activeProject?.name ?? "export"}.jpg`
    link.click()
  }, [sourceImage, imageTransform, nodes, edges, activeProject])

  const resetGraph = useCallback(() => {
    const inputId = nanoid()
    const brightnessId = nanoid()
    const outputId = nanoid()
    setNodes([
      { id: inputId,      type: "imageInput", position: { x: 60,  y: 120 }, data: {} },
      { id: brightnessId, type: "brightness",  position: { x: 280, y: 120 }, data: { value: 0 } },
      { id: outputId,     type: "output",      position: { x: 500, y: 120 }, data: {} },
    ])
    setEdges([
      { id: nanoid(), source: inputId,      target: brightnessId },
      { id: nanoid(), source: brightnessId, target: outputId },
    ])
  }, [setNodes, setEdges])

  const snapshot = useGraphStore((s) => s.snapshot)
  const addNode = useCallback(
    (type: string) => {
      snapshot()
      const offset = (nodes.length % 6) * 40
      setNodes([
        ...nodes,
        { id: nanoid(), type, position: { x: 200 + offset, y: 100 + offset }, data: {} },
      ])
    },
    [nodes, setNodes, snapshot]
  )

  const disableAllEffects = useCallback(() => {
    const updatedNodes = nodes.map((n) => {
      if (n.type === "imageInput" || n.type === "output") {
        return n
      }
      return { ...n, data: { ...n.data, disabled: true } }
    })
    setNodes(updatedNodes)
  }, [nodes, setNodes])

  const enableAllEffects = useCallback(() => {
    const updatedNodes = nodes.map((n) => {
      if (n.type === "imageInput" || n.type === "output") {
        return n
      }
      return { ...n, data: { ...n.data, disabled: false } }
    })
    setNodes(updatedNodes)
  }, [nodes, setNodes])

  const handleAddScale = useCallback(() => {
    addNode("scale")
  }, [addNode])

  const handleAddCrop = useCallback(() => {
    const id = nanoid()
    snapshot()
    const offset = (nodes.length % 6) * 40
    setNodes([
      ...nodes,
      { id, type: "crop", position: { x: 200 + offset, y: 100 + offset }, data: {} },
    ])
    activate(id)
  }, [nodes, setNodes, snapshot, activate])

  // ── Menu definitions — computed OUTSIDE JSX via useMemo equivalent ──
  // Semua item hanya menyimpan referensi fungsi, tidak mengakses ref.current
  const menus: MenuDef[] = [
    {
      label: "File",
      items: [
        { label: "Save",             shortcut: "ctrl + S", action: saveProject,  disabled: !activeProject },
        { separator: true },
        { label: "Import Image…",    shortcut: "ctrl + O", action: importImage },
        { label: "Import Custom (.cip) File…", action: () => setIsImportOpen(true) },
        { separator: true },
        { label: "Export Image…",    shortcut: "ctrl + E", action: () => setIsExportOpen(true),  disabled: !processedImage },
        { separator: true },
        { label: "Back to Projects",                  action: () => router.push("/") },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "ctrl + z", action: undo, disabled: !canUndo },
        { label: "Redo", shortcut: "ctrl + y", action: redo, disabled: !canRedo },
        { separator: true },
        { label: "Reset Node Graph", action: resetGraph },
        { separator: true },
        { label: "Disable All Effects", action: disableAllEffects, disabled: !sourceImage },
        { label: "Enable All Effects",  action: enableAllEffects,  disabled: !sourceImage },
        { separator: true },
        { label: "Reset Transform",  action: resetImageTransform },
        { label: "Reset Viewport",   action: resetViewport },
      ],
    },
    {
      label: "Image",
      items: [
        { label: "Scale / Resize",  action: handleAddScale, disabled: !sourceImage },
        { label: "Crop…",           action: handleAddCrop,  disabled: !sourceImage || isActive },
        { separator: true },
        { label: "Flip Horizontal", disabled: !sourceImage, action: () => setImageTransform({ scaleX: imageTransform.scaleX * -1 }) },
        { label: "Flip Vertical",   disabled: !sourceImage, action: () => setImageTransform({ scaleY: imageTransform.scaleY * -1 }) },
        { separator: true },
        { label: "Rotate 90° CW",   disabled: !sourceImage, action: () => setImageTransform({ rotation: (imageTransform.rotation + 90)  % 360 }) },
        { label: "Rotate 90° CCW",  disabled: !sourceImage, action: () => setImageTransform({ rotation: (imageTransform.rotation - 90 + 360) % 360 }) },
        { label: "Rotate 180°",     disabled: !sourceImage, action: () => setImageTransform({ rotation: (imageTransform.rotation + 180) % 360 }) },
      ],
    },
    {
      label: "Filter",
      items: [
        { label: "Apply via Node Graph", action: () => {}, disabled: true },
        { separator: true },
        { label: "Add Brightness Node", action: () => addNode("brightness") },
        { label: "Add Contrast Node",   action: () => addNode("contrast") },
        { label: "Add Histogram Eq",    action: () => addNode("histogram_eq") },
        { label: "Add Threshold",       action: () => addNode("threshold") },
        { label: "Add Grayscale Node",  action: () => addNode("grayscale") },
        { label: "Add Invert Node",     action: () => addNode("invert") },
        { label: "Add Sepia Node",      action: () => addNode("sepia") },
        { label: "Add Channel Split",   action: () => addNode("channel_split") },
        { label: "Add HSL Adjust Node", action: () => addNode("hsl") },
        { label: "Add Smooth/Blur Node",action: () => addNode("smooth") },
        { label: "Add Sharpen Node",    action: () => addNode("sharpen") },
        { label: "Add Edge Detect",     action: () => addNode("edge") },
        { label: "Add Morphology Node", action: () => addNode("morphology") },
      ],
    },
        {
      label: "Segment",
      items: [
        { label: "K-Means Clustering", action: () => addNodeWithData("segmentation", { method: "kmeans" }), disabled: !sourceImage },
        { label: "Threshold Masking",  action: () => addNodeWithData("segmentation", { method: "mask"   }), disabled: !sourceImage },
        { label: "Region Extraction",  action: () => addNodeWithData("segmentation", { method: "region" }), disabled: !sourceImage },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Fit to Screen", shortcut: "⌘0", action: () => resetViewport() },
        { label: "Zoom 100%",     shortcut: "⌘1", action: () => useCanvasStore.getState().setViewport({ zoom: 1 }) },
        { label: "Zoom 200%",                      action: () => useCanvasStore.getState().setViewport({ zoom: 2 }) },
        { label: "Zoom 50%",                       action: () => useCanvasStore.getState().setViewport({ zoom: 0.5 }) },
      ],
    },
  ]

  return (
    <div className="menu-bar" onClick={(e) => e.stopPropagation()}>
      {/* Logo */}
      <div className="menu-logo">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          CIP
        </div>
      </div>

      {/* Menus */}
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            onClick={toggle(menu.label)}
            className={`menu-item ${openMenu === menu.label ? "menu-item-active" : ""}`}
          >
            {menu.label}
          </button>
          {openMenu === menu.label && (
            <MenuDropdown items={menu.items} onClose={() => setOpenMenu(null)} />
          )}
        </div>
      ))}

      {/* Project name */}
      <div className="menu-bar-center">
        <span className="text-sm text-zinc-400">{activeProject?.name ?? ""}</span>
        {isProcessing && (
          <span className="text-xs text-yellow-400 animate-pulse ml-3">● Processing…</span>
        )}
      </div>

      {/* Right */}
      <div className="menu-bar-right">
        <span
          className={`text-xs flex items-center gap-1.5 ${
            isPyodideReady ? "text-emerald-500" : "text-zinc-600"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPyodideReady ? "bg-emerald-500" : "bg-zinc-600"
            }`}
          />
          {isPyodideReady ? "Python ready" : "Loading engine…"}
        </span>
        <button
          onClick={saveProject}
          disabled={!activeProject}
          className="menu-save-btn"
        >
          Save
        </button>
      </div>

      {/* Hidden file input — hanya diakses via importImage() di event handler */}
      <input
        id={INPUT_ID}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        processedImage={processedImage}
        imageInputName={activeProject?.name ?? "export"}
      />

      <CipViewerModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </div>
  )
}