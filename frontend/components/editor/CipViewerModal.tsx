"use client"

import React, { useState, useRef } from "react"
import { decompressCip } from "@/lib/utils/cip-decoder"
import { useCanvasStore } from "@/stores/canvas-store"

interface CipViewerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CipViewerModal({ isOpen, onClose }: CipViewerModalProps) {
  const { setSourceImage, setProcessedImage } = useCanvasStore()
  const [isDecompressing, setIsDecompressing] = useState(false)
  const [progress, setProgress] = useState<{ percentage: number; stage: string }>({
    percentage: 0,
    stage: "",
  })
  const [result, setResult] = useState<{
    dataUrl: string
    originalSize: number
    compressedSize: number
    ratio: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsDecompressing(true)
    setResult(null)
    setProgress({ percentage: 0, stage: "Reading file..." })

    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      // Decode header
      const view = new DataView(bytes.buffer)
      const width = view.getUint16(3, true)
      const height = view.getUint16(5, true)

      // Decompress using pure JS
      const { pixels } = decompressCip(bytes)

      // Convert to data URL
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas error")

      const imgData = ctx.createImageData(width, height)
      for (let i = 0; i < pixels.length; i += 3) {
        const idx = i * 4
        imgData.data[idx] = pixels[i]
        imgData.data[idx + 1] = pixels[i + 1]
        imgData.data[idx + 2] = pixels[i + 2]
        imgData.data[idx + 3] = 255
      }
      ctx.putImageData(imgData, 0, 0)
      const dataUrl = canvas.toDataURL("image/png")

      setResult({
        dataUrl,
        originalSize: width * height * 3,
        compressedSize: bytes.length,
        ratio: (1 - bytes.length / (width * height * 3)) * 100,
      })
      setIsDecompressing(false)
    } catch (e) {
      console.error(e)
      setProgress({ percentage: 0, stage: `Error: ${(e as Error).message}` })
      setTimeout(() => setIsDecompressing(false), 2000)
    }
  }

  const handleLoadIntoCanvas = () => {
    if (!result) return
    setSourceImage(result.dataUrl)
    setProcessedImage(result.dataUrl)
    onClose()
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box max-w-lg border-zinc-800 bg-[#161b22] text-zinc-100 shadow-2xl">
        <div className="modal-header border-zinc-800 flex items-center justify-between px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Import & Decompress Custom (.cip) File</h3>
          <button onClick={onClose} disabled={isDecompressing} className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer text-lg font-bold">&times;</button>
        </div>

        <div className="modal-body px-5 py-5 flex flex-col gap-4">
          {!isDecompressing && !result && (
            <div onClick={triggerUpload} className="border-2 border-dashed border-zinc-800 hover:border-blue-500/50 bg-[#0d1117] rounded-xl py-10 px-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">Click to upload .cip file</p>
                <p className="text-xs text-zinc-600 mt-1">Files are decompressed entirely client-side with pure JS</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".cip" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          {isDecompressing && (
            <div className="flex flex-col gap-4 py-8">
              <div className="flex justify-between text-xs font-medium text-zinc-400">
                <span className="truncate">{progress.stage}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress.percentage}%` }} />
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-5">
              <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-[#0d1117] p-2 flex justify-center items-center">
                <img src={result.dataUrl} alt="Reconstructed" className="max-h-[260px] w-auto object-contain rounded shadow" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0d1117] border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Original Size</span>
                  <span className="text-sm font-mono font-bold text-zinc-300">{formatSize(result.originalSize)}</span>
                  <span className="text-[10px] text-zinc-600">Raw 24-bit RGB</span>
                </div>
                <div className="bg-[#0d1117] border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Compressed Size</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{formatSize(result.compressedSize)}</span>
                  <span className="text-[10px] text-zinc-600">Binary .cip file</span>
                </div>
                <div className="bg-[#0d1117] border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Space Saved</span>
                  <span className="text-sm font-mono font-bold text-blue-400">{result.ratio.toFixed(1)}%</span>
                  <span className="text-[10px] text-zinc-600">Compression ratio</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer border-zinc-800 flex justify-between gap-2 px-5 py-4">
          <div>
            {result && (
              <button onClick={() => { setResult(null); setIsDecompressing(false) }} className="px-4 py-2 rounded-lg text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700 transition-colors cursor-pointer">Clear File</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={isDecompressing} className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer">Close</button>
            {result && (
              <button onClick={handleLoadIntoCanvas} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer">Load into Workspace</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
