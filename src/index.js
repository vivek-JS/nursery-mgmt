import React from "react"
import ReactDOM from "react-dom/client"
import "./reactDatepickerEntry"
import "./index.css"
import App from "./App"
import reportWebVitals from "./reportWebVitals"

// After `npm start` restarts or a new deploy, an open tab can still reference
// old lazy-chunk URLs; the dev server then returns index.html for those paths
// ("Unexpected token '<'" + ChunkLoadError). One reload picks up the new bundle.
const CHUNK_RELOAD_KEY = "nursery_chunk_reload_once"
if (typeof window !== "undefined") {
  const isChunkFailure = (err, message) =>
    err?.name === "ChunkLoadError" ||
    (typeof message === "string" &&
      (/Loading chunk [\w.-]+ failed/i.test(message) ||
        /Failed to fetch dynamically imported module/i.test(message)))

  window.addEventListener("error", (e) => {
    if (!isChunkFailure(e.error, e.message)) return
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1")
    window.location.reload()
  })
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason
    if (!isChunkFailure(r, r?.message)) return
    e.preventDefault()
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1")
    window.location.reload()
  })
  window.addEventListener("load", () => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  })
}

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(<App />)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
