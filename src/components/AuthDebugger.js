import React, { useEffect, useState } from "react"
import { useUserSession } from "hooks/userSession"
import { useSelector } from "react-redux"
import { useIsLoggedIn } from "hooks/state"
import { CookieKeys } from "constants/cookieKeys"

const AuthDebugger = () => {
  const userSession = useUserSession()
  const { isLogged } = useSelector((store) => store.app)
  const isLoggedIn = useIsLoggedIn()
  const [cookies, setCookies] = useState({})

  useEffect(() => {
    // Get all cookies for debugging
    const allCookies = document.cookie.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=")
      acc[key] = value
      return acc
    }, {})
    setCookies(allCookies)

    // Test cookie storage
    console.log("🧪 Testing cookie storage...")
    const testKey = "test-cookie"
    const testValue = "test-value"
    document.cookie = `${testKey}=${testValue}; path=/; max-age=3600`

    // Check if test cookie was set
    const testCookie = document.cookie.split(";").find((c) => c.trim().startsWith(testKey))
    console.log("🧪 Test cookie result:", testCookie ? "✅ Set successfully" : "❌ Failed to set")
  }, [])

  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "#000",
        color: "#fff",
        padding: "10px",
        fontSize: "12px",
        zIndex: 9999,
        maxWidth: "300px",
        borderRadius: "5px"
      }}>
      <h4>🔍 Auth Debug</h4>
      <div>Session Valid: {userSession.isValidSession() ? "✅" : "❌"}</div>
      <div>Redux Logged: {isLogged ? "✅" : "❌"}</div>
      <div>Final Result: {isLoggedIn ? "✅" : "❌"}</div>
      <div>Cookies: {Object.keys(cookies).length}</div>
      <div>Cookie Keys: {Object.keys(cookies).join(", ")}</div>
      <div>Expected Auth Key: {CookieKeys.Auth}</div>
      <div>Expected Refresh Key: {CookieKeys.REFRESH_TOKEN}</div>
      <div>Path: {window.location.pathname}</div>
    </div>
  )
}

export default AuthDebugger
