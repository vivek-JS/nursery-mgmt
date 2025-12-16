import React, { useState, useEffect } from "react"
import NetworkManager from "network/core/networkManager"
import { API } from "network/config/endpoints"
import "./SowingFlowChart.css"

const SowingFlowChart = () => {
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedPlant, setExpandedPlant] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPlants()
  }, [])

  const fetchPlants = async () => {
    try {
      setLoading(true)
      setError(null)
      const instance = NetworkManager(API.plantCms.GET_PLANTS)
      const response = await instance.request()
      
      if (response?.data?.success && response?.data?.data) {
        setPlants(response.data.data)
      } else {
        setError("Failed to fetch plants")
      }
    } catch (err) {
      console.error("Error fetching plants:", err)
      setError("Error loading plants. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handlePlantClick = (plantId) => {
    setExpandedPlant(expandedPlant === plantId ? null : plantId)
  }

  if (loading) {
    return (
      <div className="sowing-loading">
        <div className="loading-spinner"></div>
        <p>Loading plants...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sowing-error">
        <p>{error}</p>
        <button onClick={fetchPlants} className="retry-button">Retry</button>
      </div>
    )
  }

  if (!plants || plants.length === 0) {
    return (
      <div className="sowing-empty">
        <p>No plants found</p>
      </div>
    )
  }

  return (
    <div className="decision-tree">
      {plants.map((plant, index) => {
        const isExpanded = expandedPlant === plant._id
        const hasSubtypes = plant.subtypes && plant.subtypes.length > 0
        
        return (
          <div key={plant._id} className="tree-node">
            {/* Plant Node */}
            <div 
              className={`node plant-node ${isExpanded ? 'expanded' : ''}`}
              onClick={() => handlePlantClick(plant._id)}
            >
              <div className="node-content">
                <div className="node-title">{plant.name}</div>
                <div className="node-info">
                  <span>Slot: {plant.slotSize || "N/A"}</span>
                  {plant.sowingAllowed && <span className="badge">Sowing Allowed</span>}
                  {hasSubtypes && (
                    <span className="subtype-count">{plant.subtypes.length} subtypes</span>
                  )}
                </div>
              </div>
              {hasSubtypes && (
                <div className="expand-icon">{isExpanded ? '−' : '+'}</div>
              )}
            </div>

            {/* Subtypes Branch */}
            {isExpanded && hasSubtypes && (
              <div className="tree-branch">
                <div className="branch-line"></div>
                <div className="subtypes-container">
                  {plant.subtypes.map((subtype, subIndex) => {
                    const hasRates = subtype.rates && subtype.rates.length > 0
                    const avgRate = hasRates 
                      ? (subtype.rates.reduce((a, b) => a + b, 0) / subtype.rates.length).toFixed(2)
                      : "N/A"
                    
                    return (
                      <div key={subtype._id} className="node subtype-node">
                        <div className="node-content">
                          <div className="node-title">{subtype.name}</div>
                          <div className="node-info">
                            <span>Ready: {subtype.plantReadyDays || 0} days</span>
                            <span>Rate: ₹{avgRate}</span>
                            {subtype.buffer > 0 && <span>Buffer: {subtype.buffer}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default SowingFlowChart
