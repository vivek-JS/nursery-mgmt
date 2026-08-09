/** Extract PDF URL fields from generate-pdfs API response (handles APIResponse nesting). */
export function parseGeneratePdfsResponse(res) {
  const body = res?.data ?? res
  if (!body || typeof body !== "object") return null

  const candidates = [body.data, body]
  for (const c of candidates) {
    if (!c || typeof c !== "object" || Array.isArray(c)) continue
    if (
      "deliveryChallanPdfUrl" in c ||
      "completeInvoicePdfUrl" in c ||
      c.data?.deliveryChallanPdfUrl != null ||
      c.data?.completeInvoicePdfUrl != null
    ) {
      if (c.data && typeof c.data === "object" && !Array.isArray(c.data)) {
        return c.data
      }
      return c
    }
  }
  return null
}

export function pickPdfUrlFromPayload(payload, types = []) {
  if (!payload || typeof payload !== "object") return ""
  const t = Array.isArray(types) ? types : []
  if (t.includes("complete_invoice")) {
    return String(payload.completeInvoicePdfUrl || "").trim()
  }
  if (t.includes("delivery_challan")) {
    return String(payload.deliveryChallanPdfUrl || "").trim()
  }
  return String(
    payload.completeInvoicePdfUrl || payload.deliveryChallanPdfUrl || ""
  ).trim()
}

export function isOpenableDispatchPdfUrl(url) {
  const u = String(url || "").trim()
  if (!u) return false
  // Relative paths and http(s) absolute URLs are fine
  if (u.startsWith("/") || /^https?:\/\//i.test(u)) return true
  // Allow data: / blob: for local buffers
  if (/^(data|blob):/i.test(u)) return true
  return false
}

/** Call synchronously in a click handler before any await (avoids popup blockers). */
export function preparePdfTab() {
  try {
    return window.open("about:blank", "_blank")
  } catch {
    return null
  }
}

export function closePdfTab(tab) {
  try {
    if (tab && !tab.closed) tab.close()
  } catch {
    /* ignore */
  }
}

/**
 * Open PDF in a new tab.
 * Prefer assigning into a tab opened synchronously (preparePdfTab) so popup blockers do not block.
 * Avoid feature string "noopener" on window.open — it makes the return value null and breaks detection.
 */
export function openDispatchPdfUrl(url, preparedTab = null) {
  const u = String(url || "").trim()
  if (!isOpenableDispatchPdfUrl(u)) {
    closePdfTab(preparedTab)
    return false
  }

  if (preparedTab && !preparedTab.closed) {
    try {
      try {
        preparedTab.opener = null
      } catch {
        /* ignore */
      }
      preparedTab.location.href = u
      return true
    } catch {
      closePdfTab(preparedTab)
    }
  }

  try {
    const opened = window.open(u, "_blank")
    if (opened) {
      try {
        opened.opener = null
      } catch {
        /* ignore */
      }
      return true
    }
  } catch {
    /* fall through */
  }

  try {
    const a = document.createElement("a")
    a.href = u
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    a.remove()
    return true
  } catch {
    return false
  }
}
