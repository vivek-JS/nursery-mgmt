import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Flame, Lock, Sparkles, ChevronDown } from "lucide-react"
import { NetworkManager, API } from "network/core"
import "./rewardsTheme.css"
import { themeClass, imageSrcFromKey } from "./rewardConstants"

/** Desktop/web user rewards journey (dealers, sales, Ram Agri). */
function MyRewardsPage() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const inst = NetworkManager(API.REWARDS.MY_PROGRAMS)
      const res = await inst.request({})
      if (res?.data?.status === "success") {
        const list = res.data.data || []
        setPrograms(list)
        setActiveId((prev) => prev || list[0]?.id || "")
      }
    } catch {
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const program = useMemo(
    () => programs.find((p) => p.id === activeId) ?? programs[0],
    [programs, activeId]
  )

  const points = program?.points ?? 0

  if (loading) {
    return (
      <div className="rewards-page rw-mobile-shell">
        <p style={{ color: "var(--rw-muted-fg)" }}>Loading your rewards…</p>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="rewards-page rw-mobile-shell">
        <div className="rw-phone" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ color: "var(--rw-muted-fg)" }}>No reward programs available for your role yet.</p>
          <button type="button" className="rw-btn rw-btn-outline" style={{ marginTop: 16 }} onClick={() => navigate("/u/dashboard")}>
            Back
          </button>
        </div>
      </div>
    )
  }

  const sorted = [...(program.milestones || [])].sort((a, b) => a.target - b.target)
  const nextMs = sorted.find((m) => points < m.target)
  const unlockedCount = sorted.filter((m) => points >= m.target).length
  const progressToNext = nextMs ? Math.min(100, (points / nextMs.target) * 100) : 100
  const theme = themeClass(program.theme)

  return (
    <div className="rewards-page rw-mobile-shell">
      <div className="rw-phone">
        <div style={{ padding: "24px 20px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--rw-muted-fg)" }}>YOUR JOURNEY</div>
        </div>

        {programs.length > 1 && (
          <div style={{ padding: "0 16px 12px", position: "relative" }}>
            <select
              value={program.id}
              onChange={(e) => setActiveId(e.target.value)}
              className="rw-select"
              style={{ paddingRight: 36 }}>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.audience}
                </option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: "absolute", right: 28, top: 14, pointerEvents: "none", color: "var(--rw-muted-fg)" }} />
          </div>
        )}

        <section className={`${theme} rw-shadow-glow`} style={{ margin: "0 16px", borderRadius: 24, padding: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, opacity: 0.9 }}>
              <Flame size={14} /> {program.name}
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.02em" }}>{points}</span>
              <span style={{ opacity: 0.85, fontWeight: 500 }}>{program.unit}</span>
            </div>
            {nextMs ? (
              <>
                <div style={{ marginTop: 16, fontSize: 14, opacity: 0.95 }}>
                  <strong>{Math.max(0, nextMs.target - points)}</strong> {program.unit} to <strong>{nextMs.title}</strong>
                </div>
                <div style={{ marginTop: 8, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progressToNext}%`, background: "#fff", borderRadius: 999, transition: "width 0.7s" }} />
                </div>
              </>
            ) : (
              <div style={{ marginTop: 16, fontSize: 14, fontWeight: 600 }}>🎉 You&apos;ve unlocked everything!</div>
            )}
          </div>
        </section>

        <div style={{ padding: "24px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Achievements</h2>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--rw-muted-fg)" }}>
            {unlockedCount}/{sorted.length} unlocked
          </span>
        </div>

        <ol style={{ listStyle: "none", margin: 0, padding: "8px 20px 32px" }}>
          {sorted.map((m, i) => {
            const unlocked = points >= m.target
            const isNext = !unlocked && m.id === nextMs?.id
            const img = m.image || imageSrcFromKey(m.imageKey)
            return (
              <li key={m.id} className="rw-pop-in" style={{ animationDelay: `${i * 70}ms` }}>
                <article className={`rw-achievement ${unlocked ? "unlocked" : isNext ? "next" : "locked"}`}>
                  <div style={{ position: "relative", width: 80, height: 80, borderRadius: 16, overflow: "hidden", flexShrink: 0 }}>
                    <img
                      src={img}
                      alt={m.title}
                      className={unlocked ? "rw-animate-float" : "grayscale"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                    {!unlocked && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(26,16,40,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Lock size={20} color="#fff" />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</h3>
                      {unlocked && <Sparkles size={14} color="var(--rw-primary)" />}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--rw-muted-fg)", marginTop: 4 }}>{m.description}</p>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 999,
                          padding: "2px 8px",
                          background: unlocked ? "rgba(34,160,107,0.15)" : "var(--rw-muted)",
                          color: unlocked ? "var(--rw-success)" : "var(--rw-muted-fg)",
                        }}>
                        {unlocked ? "Unlocked" : `${m.target} ${program.unit}`}
                      </span>
                      {m.reward && <span style={{ fontSize: 11, color: "var(--rw-muted-fg)" }}>🎁 {m.reward}</span>}
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

export default MyRewardsPage
