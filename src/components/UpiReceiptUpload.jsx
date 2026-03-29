import React, { useState } from "react"

/**
 * Multipart OCR endpoint — same prefix as other APIs: /api/v1/ocr/upi-receipt
 */
export function getUpiOcrUrl() {
  const base = (process.env.REACT_APP_BASE_URL || "http://localhost:8000/api/v1").replace(/\/+$/, "")
  return `${base}/ocr/upi-receipt`
}

/**
 * Upload a UPI payment screenshot; server returns structured JSON from Gemini.
 */
export default function UpiReceiptUpload() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!file) {
      setError("Choose an image first.")
      return
    }

    const formData = new FormData()
    formData.append("image", file)

    setLoading(true)
    try {
      const res = await fetch(getUpiOcrUrl(), {
        method: "POST",
        body: formData,
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || `Request failed (${res.status})`)
        return
      }
      setResult(json)
    } catch (err) {
      setError(err?.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h2>UPI receipt (screenshot OCR)</h2>
      <p style={{ color: "#666" }}>
        Upload a payment screenshot. The API reads it with Gemini and returns name, amount, UTR, etc.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading || !file}>
          {loading ? "Extracting…" : "Extract details"}
        </button>
      </form>

      {error && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fee",
            color: "#c00",
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </pre>
      )}

      {result != null && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "#f5f5f5",
            overflow: "auto",
            fontSize: 13,
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
