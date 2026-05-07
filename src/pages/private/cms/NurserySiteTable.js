import React, { useState, useEffect, useCallback } from "react"
import { NetworkManager, API } from "network/core"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { PageLoader } from "components"

const emptyForm = () => ({ name: "", code: "", sortOrder: 0 })

const NurserySiteTable = () => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const inst = NetworkManager(API.NURSERY_SITE.LIST)
      const res = await inst.request({}, { activeOnly: "false" })
      const raw = res?.data?.data
      setRows(Array.isArray(raw) ? raw : [])
    } catch (e) {
      console.error(e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setFormOpen(true)
  }

  const openEdit = (r) => {
    setEditing(r)
    setForm({
      name: r.name || "",
      code: r.code || "",
      sortOrder: r.sortOrder ?? 0,
    })
    setFormOpen(true)
  }

  const save = async () => {
    const name = String(form.name || "").trim()
    const code = String(form.code || "").trim().toUpperCase()
    if (!name || !code) {
      window.alert("Name and code are required")
      return
    }
    setLoading(true)
    try {
      if (editing?._id) {
        const inst = NetworkManager(API.NURSERY_SITE.UPDATE)
        await inst.request({ name, code, sortOrder: Number(form.sortOrder) || 0 }, [String(editing._id)])
      } else {
        const inst = NetworkManager(API.NURSERY_SITE.CREATE)
        await inst.request({ name, code, sortOrder: Number(form.sortOrder) || 0, isActive: true })
      }
      setFormOpen(false)
      await load()
    } catch (e) {
      console.error(e)
      window.alert(e?.response?.data?.message || e?.message || "Save failed")
    } finally {
      setLoading(false)
    }
  }

  const deactivate = async (r) => {
    if (!window.confirm(`Deactivate nursery site "${r.name}" (${r.code})?`)) return
    setLoading(true)
    try {
      const inst = NetworkManager(API.NURSERY_SITE.DELETE)
      await inst.request({}, [String(r._id)])
      await load()
    } catch (e) {
      console.error(e)
      window.alert(e?.response?.data?.message || e?.message || "Failed")
    } finally {
      setLoading(false)
    }
  }

  if (loading && !rows.length) {
    return <PageLoader />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          Codes appear on complete-dispatch and order forms (default <strong>RB</strong> when unset).
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus size={16} />
          Add site
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Sort</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  No nursery sites. Add RB, GH, SB, etc.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2">{r.sortOrder ?? 0}</td>
                  <td className="px-3 py-2">{r.isActive ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button type="button" onClick={() => openEdit(r)} className="text-indigo-600 mr-2">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => deactivate(r)} className="text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">
              {editing ? "Edit nursery site" : "New nursery site"}
            </h3>
            <div>
              <label className="text-xs font-medium text-slate-600">Display name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Code (e.g. RB)</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Sort order</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NurserySiteTable
