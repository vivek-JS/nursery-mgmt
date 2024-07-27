import React from "react"
import { Divider } from "@mui/material"
import { useAdminController } from "./admin.controller"
import AppTabs from "components/Loader/ReusableComponents/tabs"

function Settings() {
    const { activeTab, handleChange, dummyData, value } = useAdminController()

    return (
        <div>
            <h2>Admin</h2>
            <Divider />
            <AppTabs dummy={dummyData} activeTab={activeTab} handleChange={handleChange} value={value} />
        </div>
    )
}

export default Settings
