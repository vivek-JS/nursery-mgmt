import React, { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import { NetworkManager, API } from "network/core"
import {
  Plus,
  Trash2,
  Pencil,
  Trophy,
  Check,
  Users,
  Sparkles,
  RefreshCw,
} from "lucide-react"
import "./rewardsTheme.css"
import {
  PRESET_IMAGES,
  THEMES,
  AUDIENCE_ROLE_OPTIONS,
  PROGRESS_METRIC_OPTIONS,
  emptyMilestone,
  emptyProgram,
  themeClass,
  imageSrcFromKey,
} from "./rewardConstants"

function RewardProgramsAdmin() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [participants, setParticipants] = useState([])
  const [participantsLoading, setParticipantsLoading] = useState(false)

  const [progOpen, setProgOpen] = useState(false)
  const [progDraft, setProgDraft] = useState(emptyProgram())
  const [msOpen, setMsOpen] = useState(false)
  const [msDraft, setMsDraft] = useState(emptyMilestone())

  const selected = useMemo(
    () => programs.find((p) => p.id === selectedId) ?? programs[0],
    [programs, selectedId]
  )

  const loadPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const inst = NetworkManager(API.REWARDS.LIST_PROGRAMS)
      const res = await inst.request({})
      if (res?.data?.status === "success") {
        const list = res.data.data || []
        setPrograms(list)
        setSelectedId((prev) => prev || list[0]?.id || null)
      } else {
        toast.error(res?.data?.message || "Failed to load programs")
      }
    } catch (e) {
      toast.error(e?.message || "Failed to load programs")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadParticipants = useCallback(async (programId) => {
    if (!programId) return
    setParticipantsLoading(true)
    try {
      const inst = NetworkManager(API.REWARDS.GET_PARTICIPANTS)
      const res = await inst.request({}, [programId])
      if (res?.data?.status === "success") {
        setParticipants(res.data.data?.participants || [])
      }
    } catch {
      setParticipants([])
    } finally {
      setParticipantsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPrograms()
  }, [loadPrograms])

  useEffect(() => {
    if (selected?.id) loadParticipants(selected.id)
  }, [selected?.id, loadParticipants])

  const saveProgramToApi = async (draft, isNew) => {
    const body = {
      name: draft.name,
      audienceLabel: draft.audience || draft.audienceLabel,
      targetRoles: draft.targetRoles,
      theme: draft.theme,
      unit: draft.unit,
      progressMetric: draft.progressMetric,
      isActive: draft.isActive !== false,
      milestones: (draft.milestones || []).map((m) => ({
        id: m.id || undefined,
        title: m.title,
        description: m.description,
        target: m.target,
        reward: m.reward,
        imageKey: m.imageKey || PRESET_IMAGES.find((p) => p.src === m.image)?.id || "medal",
      })),
    }
    const inst = NetworkManager(
      isNew ? API.REWARDS.CREATE_PROGRAM : API.REWARDS.UPDATE_PROGRAM
    )
    const res = await inst.request(body, isNew ? [] : [draft.id])
    if (res?.data?.status !== "success") {
      throw new Error(res?.data?.message || "Save failed")
    }
    return res.data.data
  }

  const newProgram = () => {
    setProgDraft({ ...emptyProgram(), id: "" })
    setProgOpen(true)
  }

  const editProgram = (p) => {
    setProgDraft({
      ...p,
      audience: p.audience || p.audienceLabel,
      milestones: (p.milestones || []).map((m) => ({
        ...m,
        image: m.image || imageSrcFromKey(m.imageKey),
      })),
    })
    setProgOpen(true)
  }

  const submitProgram = async () => {
    if (!progDraft.name?.trim()) {
      toast.error("Program name required")
      return
    }
    if (!progDraft.targetRoles?.length) {
      toast.error("Select at least one audience role")
      return
    }
    try {
      const isNew = !programs.some((p) => p.id === progDraft.id)
      const saved = await saveProgramToApi(progDraft, isNew)
      toast.success(isNew ? "Program created" : "Program updated")
      setProgOpen(false)
      await loadPrograms()
      if (saved?.id) setSelectedId(saved.id)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const removeProgram = async (id) => {
    if (!window.confirm("Delete this reward program?")) return
    try {
      const inst = NetworkManager(API.REWARDS.DELETE_PROGRAM)
      const res = await inst.request({}, [id])
      if (res?.data?.status === "success") {
        toast.success("Program removed")
        const next = programs.filter((p) => p.id !== id)
        setPrograms(next)
        setSelectedId(next[0]?.id ?? null)
      }
    } catch (e) {
      toast.error(e.message)
    }
  }

  const persistMilestones = async (milestones) => {
    const updated = { ...selected, milestones }
    const inst = NetworkManager(API.REWARDS.UPDATE_PROGRAM)
    const res = await inst.request(
      {
        milestones: milestones.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          target: m.target,
          reward: m.reward,
          imageKey: m.imageKey || "medal",
        })),
      },
      [selected.id]
    )
    if (res?.data?.status !== "success") throw new Error(res?.data?.message)
    await loadPrograms()
  }

  const newMilestone = () => {
    setMsDraft({ ...emptyMilestone(), id: crypto.randomUUID() })
    setMsOpen(true)
  }

  const editMilestone = (m) => {
    setMsDraft({
      ...m,
      image: m.image || imageSrcFromKey(m.imageKey),
      imageKey: m.imageKey || "medal",
    })
    setMsOpen(true)
  }

  const submitMilestone = async () => {
    if (!selected) return
    if (!msDraft.title?.trim()) {
      toast.error("Title required")
      return
    }
    const exists = selected.milestones.some((m) => m.id === msDraft.id)
    const milestones = exists
      ? selected.milestones.map((m) => (m.id === msDraft.id ? msDraft : m))
      : [...selected.milestones, msDraft]
    try {
      await persistMilestones(milestones)
      setMsOpen(false)
      toast.success(exists ? "Milestone updated" : "Milestone added")
    } catch (e) {
      toast.error(e.message)
    }
  }

  const removeMilestone = async (id) => {
    if (!selected) return
    try {
      await persistMilestones(selected.milestones.filter((m) => m.id !== id))
      toast.success("Milestone removed")
    } catch (e) {
      toast.error(e.message)
    }
  }

  const refreshProgress = async () => {
    if (!selected?.id) return
    try {
      const inst = NetworkManager(API.REWARDS.REFRESH_PROGRESS)
      const res = await inst.request({}, [selected.id])
      if (res?.data?.status === "success") {
        toast.success("Progress refreshed from orders")
        loadParticipants(selected.id)
      }
    } catch (e) {
      toast.error(e.message)
    }
  }

  const adjustManual = async (userId, manualAdjustment) => {
    try {
      const inst = NetworkManager(API.REWARDS.PATCH_PROGRESS)
      const res = await inst.request({ manualAdjustment }, [selected.id, userId])
      if (res?.data?.status === "success") {
        loadParticipants(selected.id)
      }
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading && !programs.length) {
    return (
      <div className="rewards-page" style={{ padding: 48, textAlign: "center" }}>
        Loading reward programs…
      </div>
    )
  }

  return (
    <div className="rewards-page">
      <header className="rw-header">
        <div className="rw-header-inner">
          <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <div className="rw-icon-box rw-gradient-joy">
              <Trophy size={16} color="#fff" />
            </div>
            Reward Programs
          </div>
          <button type="button" className="rw-btn rw-btn-outline" onClick={refreshProgress} disabled={!selected}>
            <RefreshCw size={14} /> Refresh progress
          </button>
        </div>
      </header>

      <div className="rw-grid-admin">
        <aside>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--rw-muted-fg)" }}>
              Programs
            </h2>
            <button type="button" className="rw-btn rw-btn-primary" style={{ height: 32, padding: "0 10px" }} onClick={newProgram}>
              <Plus size={14} /> New
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {programs.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`rw-program-item ${p.id === selected?.id ? "active" : ""}`}
                onClick={() => setSelectedId(p.id)}>
                <div className={`rw-icon-box ${themeClass(p.theme)}`}>
                  <Sparkles size={18} color="#fff" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--rw-muted-fg)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Users size={12} /> {p.audience || p.targetRoles?.join(", ")}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 999,
                    padding: "2px 8px",
                    background: "var(--rw-muted)",
                  }}>
                  {p.milestones?.length ?? 0}
                </span>
              </button>
            ))}
            {!programs.length && (
              <div style={{ textAlign: "center", padding: 32, border: "2px dashed var(--rw-border)", borderRadius: 16, fontSize: 14, color: "var(--rw-muted-fg)" }}>
                No programs yet
              </div>
            )}
          </div>
        </aside>

        <section>
          {!selected ? (
            <div className="rw-card" style={{ padding: 40, textAlign: "center", color: "var(--rw-muted-fg)" }}>
              Create a program to get started.
            </div>
          ) : (
            <>
              <div
                className={`${themeClass(selected.theme)} rw-shadow-glow`}
                style={{ borderRadius: 24, padding: 24, marginBottom: 24, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
                      <Users size={12} /> {selected.audience || selected.targetRoles?.join(", ")}
                    </div>
                    <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 800, margin: "12px 0 4px" }}>
                      {selected.name}
                    </h1>
                    <p style={{ fontSize: 14, opacity: 0.9 }}>
                      {selected.milestones?.length ?? 0} milestones · tracked in {selected.unit} ·{" "}
                      {PROGRESS_METRIC_OPTIONS.find((m) => m.value === selected.progressMetric)?.label}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="rw-btn rw-btn-outline" onClick={() => editProgram(selected)}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button type="button" className="rw-btn rw-btn-ghost" onClick={() => removeProgram(selected.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Milestones</h2>
                <button type="button" className="rw-btn rw-btn-primary" onClick={newMilestone}>
                  <Plus size={16} /> Add milestone
                </button>
              </div>

              <div className="rw-milestone-grid">
                {[...(selected.milestones || [])]
                  .sort((a, b) => a.target - b.target)
                  .map((m) => (
                    <article key={m.id} className="rw-milestone-card">
                      <div className="rw-milestone-img">
                        <img src={m.image || imageSrcFromKey(m.imageKey)} alt={m.title} loading="lazy" />
                      </div>
                      <div style={{ padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <h3 style={{ fontWeight: 700 }}>{m.title}</h3>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "var(--rw-muted)", borderRadius: 999, padding: "4px 10px" }}>
                            {m.target} {selected.unit}
                          </span>
                        </div>
                        <p style={{ fontSize: 14, color: "var(--rw-muted-fg)", marginTop: 4 }}>{m.description}</p>
                        <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 12, background: "rgba(245,185,66,0.15)", fontSize: 14 }}>
                          🎁 {m.reward || "No reward set"}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                          <button type="button" className="rw-btn rw-btn-outline" style={{ flex: 1 }} onClick={() => editMilestone(m)}>
                            <Pencil size={14} /> Edit
                          </button>
                          <button type="button" className="rw-btn rw-btn-ghost" onClick={() => removeMilestone(m.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                <button type="button" className="rw-add-tile" onClick={newMilestone}>
                  <div className="rw-icon-box rw-gradient-joy">
                    <Plus size={24} color="#fff" />
                  </div>
                  <span style={{ fontWeight: 600 }}>Add milestone</span>
                </button>
              </div>

              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Participants</h2>
                {participantsLoading ? (
                  <p style={{ color: "var(--rw-muted-fg)" }}>Loading…</p>
                ) : (
                  <div className="rw-card" style={{ overflow: "auto" }}>
                    <table className="rw-participants-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Points</th>
                          <th>From orders</th>
                          <th>Manual adj.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((row) => (
                          <tr key={row.userId}>
                            <td>{row.name}</td>
                            <td>{row.jobTitle || row.role}</td>
                            <td><strong>{row.points}</strong></td>
                            <td>{row.computedPoints}</td>
                            <td>
                              <input
                                type="number"
                                className="rw-input"
                                style={{ width: 80, margin: 0 }}
                                defaultValue={row.manualAdjustment}
                                onBlur={(e) => {
                                  const v = Number(e.target.value)
                                  if (v !== row.manualAdjustment) adjustManual(row.userId, v)
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                        {!participants.length && (
                          <tr>
                            <td colSpan={5} style={{ color: "var(--rw-muted-fg)", textAlign: "center" }}>
                              No users match this program&apos;s audience roles.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {progOpen && (
        <div className="rw-dialog-backdrop" onClick={() => setProgOpen(false)} role="presentation">
          <div className="rw-dialog" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>
              {programs.some((p) => p.id === progDraft.id) ? "Edit program" : "New program"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label>
                <span className="rw-label">Program name</span>
                <input className="rw-input" value={progDraft.name} onChange={(e) => setProgDraft({ ...progDraft, name: e.target.value })} placeholder="e.g. Dealer Sprint Q2" />
              </label>
              <label>
                <span className="rw-label">Audience label (display)</span>
                <input className="rw-input" value={progDraft.audience} onChange={(e) => setProgDraft({ ...progDraft, audience: e.target.value })} placeholder="e.g. All dealers" />
              </label>
              <div>
                <span className="rw-label">Target roles</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {AUDIENCE_ROLE_OPTIONS.map((opt) => {
                    const checked = progDraft.targetRoles?.includes(opt.value)
                    return (
                      <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? progDraft.targetRoles.filter((r) => r !== opt.value)
                              : [...(progDraft.targetRoles || []), opt.value]
                            setProgDraft({ ...progDraft, targetRoles: next })
                          }}
                        />
                        {opt.label}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  <span className="rw-label">Unit</span>
                  <input className="rw-input" value={progDraft.unit} onChange={(e) => setProgDraft({ ...progDraft, unit: e.target.value })} placeholder="orders, plants…" />
                </label>
                <label>
                  <span className="rw-label">Progress from</span>
                  <select className="rw-select" value={progDraft.progressMetric} onChange={(e) => setProgDraft({ ...progDraft, progressMetric: e.target.value })}>
                    {PROGRESS_METRIC_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <span className="rw-label">Theme</span>
                <div className="rw-theme-pick">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`rw-theme-swatch ${t.className} ${progDraft.theme === t.id ? "selected" : ""}`}
                      onClick={() => setProgDraft({ ...progDraft, theme: t.id })}
                      aria-label={t.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button type="button" className="rw-btn rw-btn-outline" onClick={() => setProgOpen(false)}>Cancel</button>
              <button type="button" className="rw-btn rw-btn-primary" onClick={submitProgram}>Save</button>
            </div>
          </div>
        </div>
      )}

      {msOpen && (
        <div className="rw-dialog-backdrop" onClick={() => setMsOpen(false)} role="presentation">
          <div className="rw-dialog" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>
              {selected?.milestones?.some((m) => m.id === msDraft.id) ? "Edit milestone" : "New milestone"}
              {selected && <span style={{ fontWeight: 400, fontSize: 14, color: "var(--rw-muted-fg)" }}> in {selected.name}</span>}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label>
                <span className="rw-label">Title</span>
                <input className="rw-input" value={msDraft.title} onChange={(e) => setMsDraft({ ...msDraft, title: e.target.value })} />
              </label>
              <label>
                <span className="rw-label">Description</span>
                <textarea className="rw-textarea" rows={3} value={msDraft.description} onChange={(e) => setMsDraft({ ...msDraft, description: e.target.value })} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  <span className="rw-label">Target ({selected?.unit})</span>
                  <input type="number" className="rw-input" value={msDraft.target} onChange={(e) => setMsDraft({ ...msDraft, target: Number(e.target.value) || 0 })} />
                </label>
                <label>
                  <span className="rw-label">Reward</span>
                  <input className="rw-input" value={msDraft.reward} onChange={(e) => setMsDraft({ ...msDraft, reward: e.target.value })} placeholder="e.g. ₹500 bonus" />
                </label>
              </div>
              <div>
                <span className="rw-label">Achievement image</span>
                <div className="rw-image-pick">
                  {PRESET_IMAGES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={(msDraft.imageKey || "medal") === p.id ? "selected" : ""}
                      onClick={() => setMsDraft({ ...msDraft, imageKey: p.id, image: p.src })}>
                      <img src={p.src} alt={p.label} />
                      {(msDraft.imageKey || "medal") === p.id && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(196,77,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={20} color="#fff" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button type="button" className="rw-btn rw-btn-outline" onClick={() => setMsOpen(false)}>Cancel</button>
              <button type="button" className="rw-btn rw-btn-primary" onClick={submitMilestone}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RewardProgramsAdmin
