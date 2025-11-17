import React, { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

const PublicAddFarmer = () => {
  const { slug } = useParams()
  const [config, setConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successInfo, setSuccessInfo] = useState(null)

  useEffect(() => {
    if (!successInfo) return
    const timer = setTimeout(() => {
      setSuccessInfo(null)
    }, 3000)
    return () => clearTimeout(timer)
  }, [successInfo])
  const [form, setForm] = useState({
    name: "",
    mobileNumber: "",
    stateCode: "",
    stateName: "",
    districtCode: "",
    districtName: "",
    talukaCode: "",
    talukaName: "",
    villageName: ""
  })

  useEffect(() => {
    const loadConfig = async () => {
      setLoadingConfig(true)
      try {
        const instance = NetworkManager(API.PUBLIC_LINKS.GET_PUBLIC_CONFIG)
        const response = await instance.request(null, [slug])
        const link = response?.data?.data?.link
        if (!link) {
          throw new Error("Link not found")
        }
        setConfig(link)
      } catch (e) {
        console.error("Failed to load public link config", e)
        setConfig(null)
      } finally {
        setLoadingConfig(false)
      }
    }
    if (slug) {
      loadConfig()
    }
  }, [slug])

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const uniqueStates = config?.locationRules
    ? Array.from(
        new Map(
          config.locationRules.map((r) => [r.stateCode, { code: r.stateCode, name: r.stateName }])
        ).values()
      )
    : []

  const availableDistricts = config?.locationRules
    ? Array.from(
        new Map(
          config.locationRules
            .filter((r) => r.stateCode === form.stateCode)
            .flatMap((r) => r.districts || [])
            .map((d) => [d.districtCode, d])
        ).values()
      )
    : []

  const availableTalukas = config?.locationRules
    ? Array.from(
        new Map(
          config.locationRules
            .filter((r) => r.stateCode === form.stateCode)
            .flatMap((r) => r.talukas || [])
            .map((t) => [t.talukaCode, t])
        ).values()
      )
    : []

  const availableVillages = config?.locationRules
    ? Array.from(
        new Map(
          config.locationRules
            .filter((r) => r.stateCode === form.stateCode)
            .flatMap((r) => r.villages || [])
            .map((v) => [v.villageName.toLowerCase(), v])
        ).values()
      )
    : []

  const handleStateSelect = (code) => {
    const state = uniqueStates.find((s) => s.code === code)
    handleChange("stateCode", code)
    handleChange("stateName", state ? state.name : "")
    handleChange("districtCode", "")
    handleChange("districtName", "")
    handleChange("talukaCode", "")
    handleChange("talukaName", "")
    handleChange("villageName", "")
  }

  const handleDistrictSelect = (code) => {
    const district = availableDistricts.find((d) => d.districtCode === code)
    handleChange("districtCode", code)
    handleChange("districtName", district ? district.districtName : "")
    handleChange("talukaCode", "")
    handleChange("talukaName", "")
    handleChange("villageName", "")
  }

  const handleTalukaSelect = (code) => {
    const taluka = availableTalukas.find((t) => t.talukaCode === code)
    handleChange("talukaCode", code)
    handleChange("talukaName", taluka ? taluka.talukaName : "")
    handleChange("villageName", "")
  }

  // Auto-select state if only 1 available (when config loads)
  useEffect(() => {
    if (!config || !uniqueStates.length || form.stateCode) return

    if (uniqueStates.length === 1) {
      const singleState = uniqueStates[0]
      handleStateSelect(singleState.code)
    }
  }, [config, uniqueStates.length, form.stateCode])

  // Auto-select district if only 1 available (when state is selected)
  useEffect(() => {
    if (!form.stateCode || !availableDistricts.length || form.districtCode) return

    if (availableDistricts.length === 1) {
      const singleDistrict = availableDistricts[0]
      handleDistrictSelect(singleDistrict.districtCode)
    }
  }, [form.stateCode, availableDistricts.length, form.districtCode])

  // Auto-select taluka if only 1 available (when district is selected)
  useEffect(() => {
    if (!form.districtCode || !availableTalukas.length || form.talukaCode) return

    if (availableTalukas.length === 1) {
      const singleTaluka = availableTalukas[0]
      handleTalukaSelect(singleTaluka.talukaCode)
    }
  }, [form.districtCode, availableTalukas.length, form.talukaCode])

  // Auto-select village if only 1 available (when taluka is selected)
  useEffect(() => {
    if (!form.talukaCode || !availableVillages.length || form.villageName) return

    if (availableVillages.length === 1) {
      const singleVillage = availableVillages[0]
      handleChange("villageName", singleVillage.villageName)
    }
  }, [form.talukaCode, availableVillages.length, form.villageName])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.mobileNumber || form.mobileNumber.length !== 10) {
      Toast.error("कृपया शेतकऱ्याचे नाव आणि वैध १० अंकी मोबाईल क्रमांक भरा.")
      return
    }
    if (!form.stateCode || !form.districtCode || !form.talukaCode || !form.villageName) {
      Toast.error("कृपया राज्य, जिल्हा, तालुका आणि गाव निवडा.")
      return
    }

    const payload = {
      slug,
      ...form
    }

    try {
      setSubmitting(true)
      const instance = NetworkManager(API.PUBLIC_LINKS.CREATE_LEAD)
      await instance.request(payload)
      Toast.success("✅ शेतकरी नोंदणी यशस्वी झाली.")
      setSuccessInfo({
        name: form.name,
        mobileNumber: form.mobileNumber
      })
      setForm({
        name: "",
        mobileNumber: "",
        stateCode: form.stateCode,
        stateName: form.stateName,
        districtCode: "",
        districtName: "",
        talukaCode: "",
        talukaName: "",
        villageName: ""
      })
    } catch (e) {
      console.error("Failed to submit lead", e)
      const backendMessage = e?.response?.data?.message
      const message =
        backendMessage ||
        "नोंदणी पूर्ण झाली नाही. कृपया नेटवर्क तपासा किंवा थोड्या वेळाने पुन्हा प्रयत्न करा. समस्या कायम असल्यास नर्सरी टीमला WhatsApp वर संदेश पाठवा."
      Toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-600">Loading form...</div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-800 mb-2">Link not available</h1>
          <p className="text-sm text-gray-500">
            This farmer form link is invalid or has expired. Please contact your nursery team.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-gray-900">
            शेतकरी नोंदणी – {config.name}
          </h1>
          {config.description && (
            <p className="mt-1 text-xs text-gray-500">{config.description}</p>
          )}
        </div>
        {successInfo && (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
            <p className="font-semibold mb-1">✅ शेतकरी नोंदणी यशस्वी झाली.</p>
            <p>
              नाव: <span className="font-medium">{successInfo.name}</span>
            </p>
            <p>
              मोबाईल: <span className="font-mono">{successInfo.mobileNumber}</span>
            </p>
          </div>
        )}
        <form className="space-y-2" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              शेतकऱ्याचे नाव (Farmer Name)
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              मोबाईल क्रमांक (Mobile Number)
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.mobileNumber}
              onChange={(e) =>
                handleChange(
                  "mobileNumber",
                  e.target.value.replace(/[^0-9]/g, "").slice(0, 10)
                )
              }
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              राज्य (State)
            </label>
            <select
              value={form.stateCode}
              onChange={(e) => handleStateSelect(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">राज्य निवडा</option>
              {uniqueStates.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              जिल्हा (District)
            </label>
            <select
              value={form.districtCode}
              onChange={(e) => handleDistrictSelect(e.target.value)}
              disabled={!form.stateCode}
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
              <option value="">जिल्हा निवडा</option>
              {availableDistricts.map((d) => (
                <option key={d.districtCode} value={d.districtCode}>
                  {d.districtName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              तालुका (Taluka)
            </label>
            <select
              value={form.talukaCode}
              onChange={(e) => handleTalukaSelect(e.target.value)}
              disabled={!form.districtCode}
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
              <option value="">तालुका निवडा</option>
              {availableTalukas.map((t) => (
                <option key={t.talukaCode} value={t.talukaCode}>
                  {t.talukaName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              गाव (Village)
            </label>
            <select
              value={form.villageName}
              onChange={(e) => handleChange("villageName", e.target.value)}
              disabled={!form.talukaCode}
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
              <option value="">गाव निवडा</option>
              {availableVillages.map((v) => (
                <option key={v.villageName} value={v.villageName}>
                  {v.villageName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 inline-flex items-center justify-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60">
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PublicAddFarmer


