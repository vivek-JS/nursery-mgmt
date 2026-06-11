/**
 * Nursery AI Agent API client (Python FastAPI on port 8001).
 * Set REACT_APP_AI_AGENT_URL in .env (e.g. http://167.71.232.6:8001)
 */

const AI_BASE =
  (process.env.REACT_APP_AI_AGENT_URL || "http://167.71.232.6:8001").replace(/\/$/, "")

const CHAT_TIMEOUT_MS = 180000

async function agentFetch(path, options = {}) {
  const { method = "GET", body, timeout = 60000 } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${AI_BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = json?.detail?.error || json?.detail || json?.message || res.statusText
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
    }
    return json
  } finally {
    clearTimeout(timer)
  }
}

export const aiAgentApi = {
  baseUrl: AI_BASE,
  health: () => agentFetch("/agent/health"),
  dailySummary: () => agentFetch("/agent/daily-summary", { timeout: CHAT_TIMEOUT_MS }),
  discrepancyReport: () => agentFetch("/agent/discrepancy-report", { timeout: CHAT_TIMEOUT_MS }),
  predictionReport: () => agentFetch("/agent/prediction-report", { timeout: CHAT_TIMEOUT_MS }),
  marketInsights: () => agentFetch("/agent/market-insights", { timeout: CHAT_TIMEOUT_MS }),
  marketNews: ({ forceRefresh = false, states = "" } = {}) => {
    const params = new URLSearchParams()
    if (forceRefresh) params.set("force_refresh", "true")
    if (states) params.set("states", states)
    const qs = params.toString()
    return agentFetch(`/agent/market-news${qs ? `?${qs}` : ""}`, { timeout: CHAT_TIMEOUT_MS })
  },
  marketPrices: () => agentFetch("/agent/market-prices", { timeout: CHAT_TIMEOUT_MS }),
  fullAnalysis: () => agentFetch("/agent/full-analysis", { timeout: CHAT_TIMEOUT_MS }),
  chat: (message) =>
    agentFetch("/agent/chat", {
      method: "POST",
      body: { message },
      timeout: CHAT_TIMEOUT_MS,
    }),
}

export function unwrapData(response) {
  return response?.data ?? response
}
