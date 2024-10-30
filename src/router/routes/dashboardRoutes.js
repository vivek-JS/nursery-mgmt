// Export all routes that should be in the side menu
import React from "react"
import HomeIcon from "@mui/icons-material/Dashboard"
import DateRangeOutlinedIcon from "@mui/icons-material/DateRangeOutlined"
import InventoryIcon from "@mui/icons-material/Inventory"
// import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest"
import PaidIcon from "@mui/icons-material/Paid"
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings"
import GroupIcon from "@mui/icons-material/Group"
import AodIcon from "@mui/icons-material/Aod"
import BiotechIcon from '@mui/icons-material/Biotech';

class MenuPath {
  constructor(title, icon, route, alias = null) {
    this.title = title
    this.icon = icon
    this.route = route
    this.alias = alias || title.replace(" ", "_").toLowerCase()
  }
}

export const DashboardMenus = [
  new MenuPath("Dahboard", <HomeIcon />, "/u/dashboard"),
  new MenuPath("Weekly", <DateRangeOutlinedIcon />, "/u/weekly"),
  new MenuPath("Transactions", <PaidIcon />, "/u/transactions"),
  new MenuPath("Employees", <GroupIcon />, "/u/employeese"),
  new MenuPath("Inventory", <InventoryIcon />, "/u/inventory"),
  // new MenuPath("Settings", <SettingsSuggestIcon />, "/u/settings"),
  new MenuPath("Admin", <AdminPanelSettingsIcon />, "/u/admin"),
  new MenuPath("CMS", <AodIcon />, "/u/cms"),
  new MenuPath("Labs", <BiotechIcon />, "/u/labs"),


]
