import React, { useState } from "react"
import { Tabs, Tab, Box } from "@mui/material"
import SowingFlowChart from "./components/SowingFlowChart"
import OrdersFlowChart from "./components/OrdersFlowChart"
import SalesFlowChart from "./components/SalesFlowChart"
import DealersFlowChart from "./components/DealersFlowChart"
import "./FlowCharts.css"

const FlowCharts = () => {
  const [activeTab, setActiveTab] = useState(1) // Start with Sowing tab

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  const tabs = [
    { label: "Orders", component: <OrdersFlowChart /> },
    { label: "Sowing", component: <SowingFlowChart /> },
    { label: "Sales", component: <SalesFlowChart /> },
    { label: "Dealers", component: <DealersFlowChart /> }
  ]

  return (
    <div className="flowcharts-container">
      <div className="flowcharts-wrapper">
        {/* Simple Header */}
        <div className="flowcharts-header">
          <div className="header-content">
            <h1 className="header-title">Flow Charts</h1>
            <p className="header-subtitle">Decision tree view</p>
          </div>
        </div>

        {/* Tabs Container */}
        <Box
          className="tabs-container"
          sx={{
            width: "100%",
            bgcolor: "transparent",
            borderRadius: "8px",
            overflow: "hidden"
          }}>
          <Box
            className="tabs-header"
            sx={{
              borderBottom: "2px solid #e2e8f0",
              background: "#ffffff",
              position: "relative"
            }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="flow chart tabs"
              sx={{
                "& .MuiTab-root": {
                  color: "#718096",
                  fontWeight: 500,
                  fontSize: "1rem",
                  textTransform: "none",
                  minHeight: "56px",
                  padding: "0 24px",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    color: "#2d3748"
                  },
                  "&.Mui-selected": {
                    color: "#4299e1",
                    fontWeight: 600
                  }
                },
                "& .MuiTabs-indicator": {
                  height: "3px",
                  backgroundColor: "#4299e1"
                }
              }}>
              {tabs.map((tab, index) => (
                <Tab key={index} label={tab.label} />
              ))}
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box 
            className="tabs-content-wrapper"
            sx={{ 
              p: 0,
              minHeight: "600px",
              position: "relative"
            }}>
            <div 
              key={activeTab}
              className="tab-content-animated"
            >
              {tabs[activeTab].component}
            </div>
          </Box>
        </Box>
      </div>
    </div>
  )
}

export default FlowCharts
