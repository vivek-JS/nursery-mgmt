import React from "react"
import SubtypeCard from "./SubtypeCard"
import "./PlantCard.css"

const PlantCard = ({ plant, index, isExpanded, onClick }) => {
  const hasSubtypes = plant.subtypes && plant.subtypes.length > 0
  const subtypesCount = hasSubtypes ? plant.subtypes.length : 0

  return (
    <div 
      className={`plant-card ${isExpanded ? 'expanded' : ''}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Main Plant Card */}
      <div 
        className="plant-card-main"
        onClick={onClick}
      >
        {/* Card Glow Effect */}
        <div className="card-glow"></div>
        
        {/* Plant Icon */}
        <div className="plant-icon-wrapper">
          <div className="plant-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Plant Info */}
        <div className="plant-info">
          <h3 className="plant-name">{plant.name}</h3>
          <div className="plant-meta">
            <span className="meta-badge">
              <span className="badge-icon">📦</span>
              Slot: {plant.slotSize || "N/A"}
            </span>
            {plant.sowingAllowed && (
              <span className="meta-badge sowing-allowed">
                <span className="badge-icon">✓</span>
                Sowing Allowed
              </span>
            )}
          </div>
        </div>

        {/* Subtypes Indicator */}
        {hasSubtypes && (
          <div className="subtypes-indicator">
            <div className="indicator-dot"></div>
            <span className="indicator-text">
              {subtypesCount} {subtypesCount === 1 ? "Subtype" : "Subtypes"}
            </span>
            <div className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M6 9L12 15L18 9" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Hover Effect */}
        <div className="card-hover-effect"></div>
      </div>

      {/* Expanded Subtypes Section */}
      {isExpanded && hasSubtypes && (
        <div className="subtypes-container">
          <div className="subtypes-header">
            <div className="subtypes-line"></div>
            <span className="subtypes-title">Subtypes</span>
            <div className="subtypes-line"></div>
          </div>
          <div className="subtypes-grid">
            {plant.subtypes.map((subtype, subIndex) => (
              <SubtypeCard
                key={subtype._id}
                subtype={subtype}
                plantName={plant.name}
                index={subIndex}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PlantCard

