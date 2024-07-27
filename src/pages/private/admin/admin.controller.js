import { useState } from "react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import AddAdmin from "./addAdmin"
import ListAdmin from "./listAdmin"
import CommonSettings from "./commonSettings"
import UpdateProfile from "./updateProfile"
const tabs = {
  "add-admin": true,
  "list-admin": true,
  "common-settings": true,
  "update-profile": true
}

const dummyData = [
  {
    value: "add-admin",
    label: "Add Admin",
    comp: AddAdmin
  },
  {
    value: "list-admin",
    label: "List Admin",
    comp: ListAdmin
  },
  {
    value: "common-settings",
    label: "Common Settings",
    comp: CommonSettings
  },
  {
    value: "update-profile",
    label: "Update Profile",
    comp: UpdateProfile
  }
]

export const useAdminController = () => {
  const [activeTab, setActiveTab] = useState()
  const value = activeTab ?? "add-admin"
  const navigate = useNavigate()
  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search)
    const tab = urlSearchParams.get("tab")
    setActiveTab(tab && tabs[tab] ? tab : "add-admin")
  }, [window.location.search])

  const handleChange = (event, newValue) => {
    navigate({
      pathname: "/u/admin",
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
