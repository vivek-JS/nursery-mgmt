import React from "react"

function Dashboard() {
  console.log("🏠 Dashboard component rendered")

  return (
    <div style={{ padding: 20, backgroundColor: "lightblue" }}>
      <h1>Dashboard Test</h1>
      <p>If you can see this, the Dashboard component is working!</p>
      <button onClick={() => console.log("Button clicked!")}>Test Button</button>
    </div>
  )
}

export default Dashboard
