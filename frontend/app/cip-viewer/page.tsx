"use client"

import React, { useState, useRef } from "react"
import Link from "next/link"
import { decompressCip } from "@/lib/utils/cip-decoder"

export default function CipViewerPage() {
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
    width: number
    height: number
    colors: number
  } | null>(null)

  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const decompressFile = async (file: File) => {
    setIsDecompressing(true)
    setResult(null)
    setProgress({ percentage: 0, stage: "Reading file..." })

    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      // Decode header
      if (bytes[0] !== 67 || bytes[1] !== 73 || bytes[2] !== 80) {
        throw new Error("Invalid .cip file")
      }
      const view = new DataView(bytes.buffer)
      const width = view.getUint16(3, true)
      const height = view.getUint16(5, true)
      const colors = view.getUint8(7)

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
        width,
        height,
        colors,
      })
      setIsDecompressing(false)
    } catch (e) {
      console.error(e)
      setProgress({ percentage: 0, stage: `Error: ${(e as Error).message}` })
      setTimeout(() => setIsDecompressing(false), 2500)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) decompressFile(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith(".cip")) {
      decompressFile(file)
    }
  }

  const handleDownloadPng = () => {
    if (!result) return
    const link = document.createElement("a")
    link.href = result.dataUrl
    link.download = "decompressed_image.png"
    link.click()
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-zinc-100 flex flex-col font-sans">
      <header className="border-b border-zinc-800 bg-[#161b22] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
            CIP
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              CIPROC File Viewer
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full lowercase">
                decoder
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors">
            Dashboard
          </Link>
          <Link href="/editor" className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm">
            Go to Editor
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto flex flex-col justify-center gap-8">
        {!isDecompressing && !result && (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerUpload}
            className={`border-2 border-dashed rounded-2xl py-20 px-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 group ${
              dragActive
                ? "border-blue-500 bg-blue-500/5 shadow-2xl scale-[1.01]"
                : "border-zinc-800 bg-[#161b22] hover:border-zinc-700 hover:bg-[#1c212b]"
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-zinc-200">Drag and drop your .cip file here</p>
              <p className="text-xs text-zinc-500 mt-1.5">or click to browse from folders</p>
            </div>
            <div className="max-w-md text-[11px] text-zinc-600 mt-4 leading-relaxed border-t border-zinc-800/60 pt-4">
              Decodes Ciproc Image Packages using a 5-tier lossless logic chain.
            </div>
            <input ref={fileInputRef} type="file" accept=".cip" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {isDecompressing && (
          <div className="bg-[#161b22] border border-zinc-800 rounded-2xl p-8 max-w-md w-full mx-auto flex flex-col gap-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-zinc-700 border-t-emerald-500 animate-spin" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Decompressing File</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-xs font-medium text-zinc-300">
                <span className="truncate">{progress.stage}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress.percentage}%` }} />
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2 flex flex-col gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-[#161b22] p-4 flex justify-center items-center shadow-lg relative min-h-[300px]">
                <div
                  className="absolute inset-0 opacity-15 rounded-2xl"
                  style={{
                    backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  }}
                />
                <img src={result.dataUrl} alt="Decompressed" className="max-h-[450px] max-w-full object-contain rounded shadow-2xl z-10 border border-zinc-800" />
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-500 px-2">
                <span>Resolution: {result.width} &times; {result.height} pixels</span>
                <span>Colors: {result.colors}</span>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-[#161b22] border border-zinc-800 rounded-2xl p-5 flex flex-col gap-6 shadow-lg">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-3">Metrics & Savings</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
                    <span className="text-xs text-zinc-500">Compressed Size</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">{formatSize(result.compressedSize)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
                    <span className="text-xs text-zinc-500">Uncompressed RGB</span>
                    <span className="text-sm font-mono font-bold text-zinc-300">{formatSize(result.originalSize)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Space Saved Ratio</span>
                    <span className="text-sm font-mono font-bold text-blue-400">{result.ratio.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full bg-[#0d1117] border border-zinc-800 rounded-xl p-3 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Format Verification</span>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Header magic matches "CIP"</div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Decoded with pure JS</div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <button onClick={handleDownloadPng} className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Export as PNG
                </button>
                <button onClick={() => setResult(null)} className="w-full py-3 px-4 rounded-xl border border-zinc-800 bg-[#161b22] hover:border-zinc-700 hover:text-zinc-200 text-zinc-400 text-xs font-bold transition-colors cursor-pointer">Load Different File</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
