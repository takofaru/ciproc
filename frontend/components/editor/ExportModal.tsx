"use client"

import React, { useState } from "react"
import { compressImage } from "@/lib/pyodide/pyodide-client"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  processedImage: string | null
  imageInputName?: string
}

export function ExportModal({
  isOpen,
  onClose,
  processedImage,
  imageInputName = "export",
}: ExportModalProps) {
  const [format, setFormat] = useState<"jpg" | "png" | "cip">("jpg")
  const [quality, setQuality] = useState<number>(80)
  const [method, setMethod] = useState<"fast" | "max">("fast")
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [progress, setProgress] = useState<{ percentage: number; stage: string }>({
    percentage: 0,
    stage: "",
  })

  if (!isOpen) return null

  const handleExport = async () => {
    if (!processedImage) return
    setIsExporting(true)
    setProgress({ percentage: 0, stage: "Initializing export..." })

    try {
      if (format === "cip") {
        const result = await compressImage(processedImage, quality, method)
        const compressedData = atob(result.data)
        const bytes = new Uint8Array(compressedData.length)
        for (let i = 0; i < compressedData.length; i++) {
          bytes[i] = compressedData.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: "application/octet-stream" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${imageInputName}.cip`
        link.click()
        URL.revokeObjectURL(url)
        setProgress({ percentage: 100, stage: `Exported: ${result.compressedSize} bytes` })
      } else {
        setProgress({ percentage: 50, stage: "Rendering image..." })
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.src = processedImage
        await new Promise((resolve, reject) => {
          img.onload = () => {
            const canvas = document.createElement("canvas")
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext("2d")
            if (!ctx) { reject(new Error("Canvas context error")); return }
            ctx.drawImage(img, 0, 0)
            const mimeType = format === "jpg" ? "image/jpeg" : "image/png"
            const finalQuality = format === "jpg" ? quality / 100 : undefined
            const dataUrl = canvas.toDataURL(mimeType, finalQuality)
            const link = document.createElement("a")
            link.href = dataUrl
            link.download = `${imageInputName}.${format}`
            link.click()
            resolve(null)
          }
          img.onerror = (e) => reject(e)
        })
        setProgress({ percentage: 100, stage: "Export completed!" })
      }
      setTimeout(() => { setIsExporting(false); onClose() }, 600)
    } catch (e) {
      console.error(e)
      setProgress({ percentage: 0, stage: `Error: ${(e as Error).message}` })
      setTimeout(() => setIsExporting(false), 2000)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box max-w-md border-zinc-800 bg-[#161b22] text-zinc-100 shadow-2xl">
        <div className="modal-header border-zinc-800 flex items-center justify-between px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Export Image</h3>
          <button onClick={onClose} disabled={isExporting} className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer text-lg font-bold">&times;</button>
        </div>

        <div className="modal-body px-5 py-5 flex flex-col gap-5">
          {isExporting ? (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex justify-between text-xs font-medium text-zinc-400">
                <span className="truncate">{progress.stage}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${progress.percentage}%` }} />
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["jpg", "png", "cip"] as const).map((fmt) => (
                    <button key={fmt} type="button" onClick={() => setFormat(fmt)} className={`py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      format === fmt ? "bg-blue-600/10 border-blue-500 text-blue-400" : "border-zinc-800 bg-[#0d1117] text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                    }`}>
                      {fmt === "cip" ? "Custom (.cip)" : fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
                {format === "cip" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Compression method:</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setMethod("fast")} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${method === "fast" ? "bg-blue-600/10 border-blue-500 text-blue-400" : "border-zinc-800 bg-[#0d1117] text-zinc-400 hover:border-zinc-700"}`}>Fast (LZW+Huffman)</button>
                      <button type="button" onClick={() => setMethod("max")} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${method === "max" ? "bg-blue-600/10 border-blue-500 text-blue-400" : "border-zinc-800 bg-[#0d1117] text-zinc-400 hover:border-zinc-700"}`}>Max (LZW+Arith)</button>
                    </div>
                  </div>
                )}
              </div>

              {format !== "png" && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{format === "cip" ? "Color Compression" : "Quality"}</label>
                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{quality}%</span>
                  </div>
                  <input type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                  <div className="flex justify-between text-[10px] text-zinc-500"><span>High Compression (Low Quality)</span><span>Lossless Colors (High Quality)</span></div>
                </div>
              )}
            </>
          )}
        </div>

        {!isExporting && (
          <div className="modal-footer border-zinc-800 flex justify-end gap-2 px-5 py-4">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleExport} disabled={!processedImage} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Export</button>
          </div>
        )}
      </div>
    </div>
  )
}
