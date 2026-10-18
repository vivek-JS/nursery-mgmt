import React, { useEffect, useRef, useState } from "react"
import { Mic, Pause, Play } from "lucide-react"
import { APIConfig } from "network/config/serverConfig"

const origin = () => String(APIConfig.BASE_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "")

/** Relative `/uploads/…` paths are served by the API host. */
export const voiceNoteUrl = (url) => {
  const u = String(url || "").trim()
  return u.startsWith("/") ? `${origin()}${u}` : u
}

const clock = (sec) => {
  const s = Math.max(0, Math.round(Number(sec) || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

const caption = (n) =>
  [
    n.recordedByName,
    n.recordedAt &&
      new Date(n.recordedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }),
    n.source === "LATER" ? "added later" : "at booking"
  ]
    .filter(Boolean)
    .join(" · ")

/** Compact play/pause for table cells — plays the latest voice note. */
export function VoiceNoteChip({ notes = [] }) {
  const list = (notes || []).filter((n) => n?.url)
  const latest = list[list.length - 1]
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(
    () => () => {
      audioRef.current?.pause()
    },
    []
  )

  if (!latest) return null

  const toggle = (e) => {
    e.stopPropagation()
    if (!audioRef.current) {
      audioRef.current = new Audio(voiceNoteUrl(latest.url))
      audioRef.current.onended = () => setPlaying(false)
      audioRef.current.onpause = () => setPlaying(false)
      audioRef.current.onplay = () => setPlaying(true)
    }
    if (playing) audioRef.current.pause()
    else audioRef.current.play().catch(() => setPlaying(false))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={`${caption(latest)}${list.length > 1 ? ` · ${list.length} voice notes` : ""}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        playing
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
      }`}>
      {playing ? <Pause size={11} /> : <Play size={11} />}
      <Mic size={11} />
      {clock(latest.durationSec)}
      {list.length > 1 && <span className="opacity-75">+{list.length - 1}</span>}
    </button>
  )
}

/** Full list with native audio controls (order Remarks tab / remark dialog). */
export function VoiceNoteList({ notes = [], className = "" }) {
  const list = (notes || []).filter((n) => n?.url)
  if (!list.length) return null
  return (
    <div className={`space-y-2 ${className}`}>
      {list.map((n, i) => (
        <div key={n._id || `${n.url}-${i}`} className="rounded border border-brand-200 bg-brand-50/50 p-2">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-gray-600">
            <Mic size={12} className="text-brand-700" />
            <span>Voice note {list.length > 1 ? i + 1 : ""}</span>
            {n.durationSec > 0 && <span className="text-gray-400">· {clock(n.durationSec)}</span>}
            <span className="ml-auto text-gray-500">{caption(n)}</span>
          </div>
          <audio controls preload="none" src={voiceNoteUrl(n.url)} className="h-8 w-full" />
          {n.note && <div className="mt-1 text-xs text-gray-700">{n.note}</div>}
        </div>
      ))}
    </div>
  )
}
