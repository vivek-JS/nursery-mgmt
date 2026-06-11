import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import SendIcon from "@mui/icons-material/Send"
import SmartToyIcon from "@mui/icons-material/SmartToy"
import RefreshIcon from "@mui/icons-material/Refresh"
import NewspaperIcon from "@mui/icons-material/Newspaper"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import TodayIcon from "@mui/icons-material/Today"
import InsightsIcon from "@mui/icons-material/Insights"
import ChatIcon from "@mui/icons-material/Chat"
import { aiAgentApi, unwrapData } from "services/aiAgentApi"

const QUICK_PROMPTS = [
  "Show me today's sales summary",
  "Latest agriculture news in Maharashtra, MP and Gujarat",
  "What is the latest market news?",
  "Predict July demand for all plants",
  "Are there any payment discrepancies?",
  "Give me full market insights",
  "Which farmers have pending dues?",
  "What should I reorder next week?",
]

function HealthChips({ health, loading }) {
  if (loading) return <CircularProgress size={20} sx={{ color: "white" }} />
  if (!health) return <Chip size="small" label="Agent offline" color="error" />
  const d = unwrapData(health)
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      <Chip
        size="small"
        label={`DB: ${d.mongodb || "?"}`}
        color={d.mongodb === "connected" ? "success" : "warning"}
        sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white" }}
      />
      <Chip
        size="small"
        label={`AI: ${d.ollama || "?"}`}
        color={d.ollama === "running" ? "success" : "default"}
        sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white" }}
      />
    </Stack>
  )
}

function MessageBubble({ role, text, intent }) {
  const isUser = role === "user"
  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", mb: 1.5 }}>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          maxWidth: "85%",
          bgcolor: isUser ? "primary.main" : "grey.100",
          color: isUser ? "primary.contrastText" : "text.primary",
          borderRadius: 2,
          borderTopRightRadius: isUser ? 0 : 2,
          borderTopLeftRadius: isUser ? 2 : 0,
        }}>
        {!isUser && intent && intent !== "welcome" && (
          <Chip label={intent.replace(/_/g, " ")} size="small" sx={{ mb: 0.5 }} />
        )}
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {text}
        </Typography>
      </Paper>
    </Box>
  )
}

function ReportPanel({ title, loading, error, children, onRefresh }) {
  return (
    <Card elevation={2} sx={{ borderRadius: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
          {onRefresh && (
            <IconButton onClick={onRefresh} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          )}
        </Box>
        {loading && (
          <Box display="flex" flexDirection="column" alignItems="center" py={4} gap={1}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading… may take up to 2 minutes
            </Typography>
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!loading && !error && children}
      </CardContent>
    </Card>
  )
}

function formatInr(n) {
  if (n == null || Number.isNaN(Number(n))) return "—"
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function NurseryAIAgentPage() {
  const [tab, setTab] = useState(0)
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I am your Nursery AI assistant. Ask about sales, payments, stock, market news (price, import, export), and demand forecasts — all from your live ERP data.",
      intent: "welcome",
    },
  ])
  const [input, setInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  const loadedTabsRef = useRef(new Set())

  const [daily, setDaily] = useState(null)
  const [dailyLoading, setDailyLoading] = useState(false)
  const [dailyError, setDailyError] = useState(null)

  const [news, setNews] = useState(null)
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsError, setNewsError] = useState(null)

  const [predictions, setPredictions] = useState(null)
  const [predLoading, setPredLoading] = useState(false)
  const [predError, setPredError] = useState(null)

  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState(null)

  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      setHealth(await aiAgentApi.health())
    } catch {
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, chatLoading])

  const sendMessage = async (text) => {
    const msg = (text || input).trim()
    if (!msg || chatLoading) return

    setInput("")
    setMessages((m) => [...m, { role: "user", text: msg }])
    setChatLoading(true)

    try {
      const res = await aiAgentApi.chat(msg)
      const data = res.data || {}
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: data.answer || "No answer returned.",
          intent: data.intent,
        },
      ])
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Could not reach the AI agent: ${e.message}\n\nCheck REACT_APP_AI_AGENT_URL and that the server is running.`,
          intent: "error",
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  const loadDaily = async () => {
    setDailyLoading(true)
    setDailyError(null)
    try {
      setDaily(unwrapData(await aiAgentApi.dailySummary()))
    } catch (e) {
      setDailyError(e.message)
    } finally {
      setDailyLoading(false)
    }
  }

  const loadNews = async (forceRefresh = false) => {
    setNewsLoading(true)
    setNewsError(null)
    try {
      setNews(
        unwrapData(
          await aiAgentApi.marketNews({
            forceRefresh,
            states: "Maharashtra,Madhya Pradesh,Gujarat",
          })
        )
      )
    } catch (e) {
      setNewsError(e.message)
    } finally {
      setNewsLoading(false)
    }
  }

  const loadPredictions = async () => {
    setPredLoading(true)
    setPredError(null)
    try {
      setPredictions(unwrapData(await aiAgentApi.predictionReport()))
    } catch (e) {
      setPredError(e.message)
    } finally {
      setPredLoading(false)
    }
  }

  const loadInsights = async () => {
    setInsightsLoading(true)
    setInsightsError(null)
    try {
      setInsights(unwrapData(await aiAgentApi.marketInsights()))
    } catch (e) {
      setInsightsError(e.message)
    } finally {
      setInsightsLoading(false)
    }
  }

  useEffect(() => {
    if (loadedTabsRef.current.has(tab)) return
    loadedTabsRef.current.add(tab)
    if (tab === 1) loadDaily()
    if (tab === 2) loadNews()
    if (tab === 3) loadPredictions()
    if (tab === 4) loadInsights()
  }, [tab])

  const newsPayload = news?.news || news
  const headlines = newsPayload?.headlines || []

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 1, sm: 2 }, pb: 4 }}>
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%)",
          color: "white",
        }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <SmartToyIcon fontSize="large" />
          <Typography variant="h5" fontWeight={800}>
            Nursery AI Agent
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
          Chat · market news · prices · predictions — powered by your ERP + old sales data
        </Typography>
        <HealthChips health={health} loading={healthLoading} />
        <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.75 }}>
          {aiAgentApi.baseUrl}
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        <Tab icon={<ChatIcon />} iconPosition="start" label="Chat" />
        <Tab icon={<TodayIcon />} iconPosition="start" label="Today" />
        <Tab icon={<NewspaperIcon />} iconPosition="start" label="Market News" />
        <Tab icon={<TrendingUpIcon />} iconPosition="start" label="Predictions" />
        <Tab icon={<InsightsIcon />} iconPosition="start" label="Full Insights" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Card
              elevation={2}
              sx={{
                borderRadius: 2,
                height: { md: "calc(100vh - 280px)" },
                minHeight: 420,
                display: "flex",
                flexDirection: "column",
              }}>
              <CardContent
                sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", pb: 1 }}>
                <Box sx={{ flex: 1, overflowY: "auto", pr: 1, mb: 2 }}>
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} role={msg.role} text={msg.text} intent={msg.intent} />
                  ))}
                  {chatLoading && (
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="text.secondary">
                        Thinking…
                      </Typography>
                    </Box>
                  )}
                  <div ref={chatEndRef} />
                </Box>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Ask about sales, news, July forecast, payments…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    disabled={chatLoading}
                    multiline
                    maxRows={3}
                  />
                  <Button
                    variant="contained"
                    onClick={() => sendMessage()}
                    disabled={chatLoading || !input.trim()}
                    sx={{ minWidth: 48, height: 40 }}>
                    <SendIcon />
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={1} sx={{ borderRadius: 2, mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Quick questions
                </Typography>
                <Stack spacing={1}>
                  {QUICK_PROMPTS.map((q) => (
                    <Chip
                      key={q}
                      label={q}
                      onClick={() => sendMessage(q)}
                      clickable
                      disabled={chatLoading}
                      sx={{
                        justifyContent: "flex-start",
                        height: "auto",
                        py: 1,
                        "& .MuiChip-label": { whiteSpace: "normal" },
                      }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              For AI-written answers, run <strong>./start-tunnel.sh</strong> on your Mac (Ollama).
              Numbers and reports still load without it.
            </Alert>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <ReportPanel title="Today's business summary" loading={dailyLoading} error={dailyError} onRefresh={loadDaily}>
          {daily && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                {[
                  ["Orders", daily.total_orders, ""],
                  ["Sales", formatInr(daily.total_sales_value), ""],
                  ["Collected", formatInr(daily.total_collected), "success.main"],
                  ["Pending", formatInr(daily.total_pending_amount), "warning.main"],
                ].map(([label, val, color]) => (
                  <Grid item xs={6} sm={3} key={label}>
                    <Paper sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="caption">{label}</Typography>
                      <Typography variant="h6" fontWeight={800} color={color || "text.primary"}>
                        {val}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              {daily.business_summary && (
                <>
                  <Divider />
                  <Typography variant="subtitle2" fontWeight={700}>
                    AI summary
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {daily.business_summary}
                  </Typography>
                </>
              )}
              {daily.risks?.length > 0 && (
                <Alert severity="warning">
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {daily.risks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Stack>
          )}
        </ReportPanel>
      )}

      {tab === 2 && (
        <ReportPanel
          title="Market news — Maharashtra, MP, Gujarat"
          loading={newsLoading}
          error={newsError}
          onRefresh={() => loadNews(true)}>
          {news && (
            <Stack spacing={2}>
              {news.ai_summary && (
                <Alert severity="info" sx={{ "& .MuiAlert-message": { whiteSpace: "pre-wrap" } }}>
                  {news.ai_summary}
                </Alert>
              )}
              {(newsPayload?.region_states || ["Maharashtra", "Madhya Pradesh", "Gujarat"]).map(
                (state) => {
                  const items = newsPayload?.by_state?.[state] || []
                  if (items.length === 0) return null
                  return (
                    <Box key={state}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        {state}
                      </Typography>
                      <Stack spacing={1}>
                        {items.slice(0, 5).map((item, i) => (
                          <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {item.title}
                            </Typography>
                            {item.summary && (
                              <Typography variant="caption" color="text.secondary">
                                {item.summary}
                              </Typography>
                            )}
                          </Paper>
                        ))}
                      </Stack>
                    </Box>
                  )
                }
              )}
              {newsPayload?.nursery_catalog?.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  <Typography variant="caption" sx={{ width: "100%", mb: 0.5 }}>
                    Your plants in catalog:
                  </Typography>
                  {newsPayload.nursery_catalog.map((c) => (
                    <Chip key={c.plant} label={c.plant} size="small" color="primary" variant="outlined" />
                  ))}
                </Stack>
              )}
              {headlines.length === 0 ? (
                <Typography color="text.secondary">No headlines. Click refresh.</Typography>
              ) : (
                headlines.map((h, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {h.title}
                    </Typography>
                    <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                      {h.matched_plants?.map((p) => (
                        <Chip key={p} label={p} size="small" color="primary" variant="outlined" />
                      ))}
                      {h.matched_states?.map((s) => (
                        <Chip key={s} label={s} size="small" color="secondary" variant="outlined" />
                      ))}
                      {h.matched_topics?.map((t) => (
                        <Chip key={t} label={t} size="small" />
                      ))}
                    </Stack>
                    {h.summary && (
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        {h.summary}
                      </Typography>
                    )}
                  </Paper>
                ))
              )}
            </Stack>
          )}
        </ReportPanel>
      )}

      {tab === 3 && (
        <ReportPanel title="Demand predictions" loading={predLoading} error={predError} onRefresh={loadPredictions}>
          {predictions && (
            <Stack spacing={2}>
              {predictions.july_totals && (
                <Alert severity="success">
                  July forecast:{" "}
                  <strong>{Number(predictions.july_totals.total_plants || 0).toLocaleString()}</strong> plants ·{" "}
                  {formatInr(predictions.july_totals.total_amount_inr)}
                </Alert>
              )}
              {predictions.ai_summary && (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {predictions.ai_summary}
                </Typography>
              )}
              <Typography variant="subtitle2" fontWeight={700}>
                July by plant
              </Typography>
              {(predictions.july_forecast || []).map((p) => (
                <Paper key={p.plant} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={700}>{p.plant}</Typography>
                    <Chip label={p.trend} size="small" />
                  </Stack>
                  <Typography variant="body2">
                    {Number(p.predicted_july_plants || 0).toLocaleString()} plants ·{" "}
                    {formatInr(p.predicted_july_amount)}
                  </Typography>
                </Paper>
              ))}
              {predictions.data_sources && (
                <Typography variant="caption" color="text.secondary">
                  Based on {predictions.data_sources.erp_orders} ERP orders +{" "}
                  {predictions.data_sources.old_sales_records} old sales records
                </Typography>
              )}
            </Stack>
          )}
        </ReportPanel>
      )}

      {tab === 4 && (
        <ReportPanel
          title="Full market & business insights"
          loading={insightsLoading}
          error={insightsError}
          onRefresh={loadInsights}>
          {insights && (
            <Stack spacing={2}>
              {insights.ai_summary && (
                <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                    {insights.ai_summary}
                  </Typography>
                </Paper>
              )}
              {insights.recommended_actions?.map((a, i) => (
                <Alert key={i} severity="warning">
                  {a}
                </Alert>
              ))}
            </Stack>
          )}
        </ReportPanel>
      )}
    </Box>
  )
}
