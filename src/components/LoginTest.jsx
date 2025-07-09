import React, { useState } from "react"
import { Button, TextField, Box, Typography, Alert } from "@mui/material"

const LoginTest = () => {
  const [phoneNumber, setPhoneNumber] = useState("7588686452")
  const [password, setPassword] = useState("passsword123443")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const testLogin = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log("🧪 Testing login with:", { phoneNumber, password: "***" })

      const response = await fetch("http://localhost:8000/api/v1/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        // Remove credentials since we're not using cookies
        body: JSON.stringify({
          phoneNumber: parseInt(phoneNumber),
          password: password
        })
      })

      console.log("📡 Response status:", response.status)
      console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log("📡 Response data:", data)

      if (response.ok) {
        // Store tokens in localStorage
        if (data.data?.accessToken) {
          localStorage.setItem("accessToken", data.data.accessToken)
          console.log("💾 Access token stored in localStorage")
        }
        if (data.data?.refreshToken) {
          localStorage.setItem("refreshToken", data.data.refreshToken)
          console.log("💾 Refresh token stored in localStorage")
        }

        setResult({
          type: "success",
          message: "Login successful! Tokens stored in localStorage.",
          data: data
        })
      } else {
        setResult({
          type: "error",
          message: `Login failed: ${data.message || "Unknown error"}`,
          data: data
        })
      }
    } catch (error) {
      console.error("❌ Login test error:", error)
      setResult({
        type: "error",
        message: `Network error: ${error.message}`,
        data: null
      })
    } finally {
      setLoading(false)
    }
  }

  const testCORS = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log("🧪 Testing CORS...")

      const response = await fetch("http://localhost:8000/cors-test", {
        method: "GET"
        // Remove credentials since we're not using cookies
      })

      const data = await response.json()
      console.log("📡 CORS test response:", data)

      setResult({
        type: "success",
        message: "CORS test successful!",
        data: data
      })
    } catch (error) {
      console.error("❌ CORS test error:", error)
      setResult({
        type: "error",
        message: `CORS test failed: ${error.message}`,
        data: null
      })
    } finally {
      setLoading(false)
    }
  }

  const clearTokens = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    setResult({
      type: "info",
      message: "Tokens cleared from localStorage",
      data: null
    })
  }

  const checkTokens = () => {
    const accessToken = localStorage.getItem("accessToken")
    const refreshToken = localStorage.getItem("refreshToken")

    setResult({
      type: "info",
      message: "Current tokens in localStorage:",
      data: {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenLength: accessToken ? accessToken.length : 0,
        refreshTokenLength: refreshToken ? refreshToken.length : 0
      }
    })
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        🔐 Backend Login Test (No Cookies)
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        Test the login functionality with your backend running on port 8000. Uses localStorage
        instead of cookies.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Phone Number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Button variant="contained" onClick={testLogin} disabled={loading} sx={{ mr: 2 }}>
          {loading ? "Testing..." : "Test Login"}
        </Button>

        <Button variant="outlined" onClick={testCORS} disabled={loading} sx={{ mr: 2 }}>
          Test CORS
        </Button>

        <Button variant="outlined" onClick={checkTokens} sx={{ mr: 2 }}>
          Check Tokens
        </Button>

        <Button variant="outlined" onClick={clearTokens} color="warning">
          Clear Tokens
        </Button>
      </Box>

      {result && (
        <Alert severity={result.type} sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {result.message}
          </Typography>
          {result.data && (
            <Typography variant="body2" component="pre" sx={{ fontSize: "12px", overflow: "auto" }}>
              {JSON.stringify(result.data, null, 2)}
            </Typography>
          )}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        <strong>Instructions:</strong>
        <br />
        1. Make sure your backend is running on port 8000
        <br />
        2. Click "Test CORS" first to verify connectivity
        <br />
        3. Click "Test Login" to test the login functionality
        <br />
        4. Use "Check Tokens" to see what's stored in localStorage
        <br />
        5. Use "Clear Tokens" to remove stored tokens
        <br />
        6. Check the browser console for detailed logs
      </Typography>
    </Box>
  )
}

export default LoginTest
