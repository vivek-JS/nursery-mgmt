import React from "react"
import "./SubtypeCard.css"

const SubtypeCard = ({ subtype, plantName, index }) => {
  const hasRates = subtype.rates && subtype.rates.length > 0
  const avgRate = hasRates 
    ? (subtype.rates.reduce((a, b) => a + b, 0) / subtype.rates.length).toFixed(2)
    : "N/A"

  return (
    <div 
      className="subtype-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Card Glow */}
      <div className="subtype-glow"></div>
      
      {/* Subtype Header */}
      <div className="subtype-header">
        <div className="subtype-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h4 className="subtype-name">{subtype.name}</h4>
      </div>

      {/* Subtype Info Grid */}
      <div className="subtype-info-grid">
        {/* Plant Ready Days */}
        <div className="info-item">
          <div className="info-label">
            <span className="label-icon">🌱</span>
            Ready Days
          </div>
          <div className="info-value">
            {subtype.plantReadyDays || 0} days
          </div>
        </div>

        {/* Average Rate */}
        <div className="info-item">
          <div className="info-label">
            <span className="label-icon">💰</span>
            Avg Rate
          </div>
          <div className="info-value">
            ₹{avgRate}
          </div>
        </div>

        {/* Buffer */}
        <div className="info-item">
          <div className="info-label">
            <span className="label-icon">🛡️</span>
            Buffer
          </div>
          <div className="info-value">
            {subtype.buffer || 0}
          </div>
        </div>

        {/* Daily Dispatch */}
        <div className="info-item">
          <div className="info-label">
            <span className="label-icon">📤</span>
            Daily Dispatch
          </div>
          <div className="info-value">
            {subtype.dailyDispatch || 0}
          </div>
        </div>
      </div>

      {/* Rates List */}
      {hasRates && (
        <div className="rates-section">
          <div className="rates-label">Rates:</div>
          <div className="rates-list">
            {subtype.rates.map((rate, rateIndex) => (
              <span key={rateIndex} className="rate-badge">
                ₹{rate}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {subtype.description && (
        <div className="subtype-description">
          <p>{subtype.description}</p>
        </div>
      )}

      {/* Hover Effect */}
      <div className="subtype-hover-effect"></div>
    </div>
  )
}

export default SubtypeCard


