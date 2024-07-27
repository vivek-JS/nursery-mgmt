import { useState } from "react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import UpdateProfile from "pages/private/settings/updateprofile"
import UpdatePassword from "pages/private/settings/updatePassword"
import Others from "pages/private/settings/others"
import CommonSettings from "./commonSettings"
import Billing from "./billing"
import Save from "./Save"

const tabs = {
  "update-profile": true,
  "update-password": true,
  others: true,
  "common-settings": true,
  Billing: true,
  Prescription: true,
  Save: true
}

const dummyData = [
  {
    value: "update-profile",
    label: "Update Profile",
    comp: UpdateProfile
  },
  {
    value: "update-password",
    label: "Update Password",
    comp: UpdatePassword
  },
  {
    value: "common-settings",
    label: "Common Settings",
    comp: CommonSettings
  },
  {
    value: "Billing",
    label: "Billing",
    comp: Billing
  },
  {
    value: "Prescription",
    label: "Prescription",
    comp: Others
  },
  {
    value: "Save",
    label: "Save",
    comp: Save
  }
]

export const useUpdateSettingsController = () => {
  const [activeTab, setActiveTab] = useState()
  const value = activeTab ?? "update-profile"
  const navigate = useNavigate()
  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search)
    const tab = urlSearchParams.get("tab")
    setActiveTab(tab && tabs[tab] ? tab : "update-profile")
  }, [window.location.search])

  const handleChange = (event, newValue) => {
    navigate({
      pathname: "/u/settings",
      search: `?tab=${newValue}`
    })
  }

  return {
    activeTab,
    handleChange,
    value,
    dummyData
  }
}
