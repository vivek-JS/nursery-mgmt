import React, { Suspense } from "react"
import { BrowserRouter, Route, Navigate, Routes } from "react-router-dom"
import { AuthContext } from "../auth/AuthContext"
import { PrivateRoutes, PublicRoutes } from "./routes"
import Error404 from "pages/Error404"
import AppLoader from "components/Loader/AppLoader"
import { useIsLoggedIn } from "hooks/state"
import Login from "pages/public/login"
import LoginTest from "components/LoginTest"

import PrivateLayout from "layout/privateLayout"

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("🚨 Component Error:", error)
    console.error("🚨 Error Info:", errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "red" }}>
          <h2>Something went wrong.</h2>
          <p>Error: {this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      )
    }

    return this.props.children
  }
}

const Router = () => {
  const isLoggedIn = useIsLoggedIn()

  // Debug logging for router
  console.log("🛣️ Router Debug:", {
    isLoggedIn,
    currentPath: window.location.pathname,
    timestamp: new Date().toISOString(),
    willRedirectTo: isLoggedIn === true ? "/u/dashboard" : "/auth/login"
  })

  // If authentication state is still loading, show loading
  if (isLoggedIn === undefined) {
    console.log("🔄 Router: Authentication state loading...")
    return <div>Loading...</div>
  }

  return (
    <AuthContext.Provider value={isLoggedIn}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              isLoggedIn === true ? (
                <Navigate to="/u/dashboard" replace />
              ) : (
                <Navigate to="/auth/login" replace />
              )
            }
          />

          {/* Test route for backend connectivity */}
          <Route path="/test-login" element={<LoginTest />} />

          {/* Login routes without Suspense */}
          <Route
            path="/auth/login"
            element={
              isLoggedIn === true ? <Navigate to="/u/dashboard" replace={true} /> : <Login />
            }
          />
          <Route
            path="/login"
            element={
              isLoggedIn === true ? <Navigate to="/u/dashboard" replace={true} /> : <Login />
            }
          />
          <Route
            path="/auth/loginsss"
            element={
              isLoggedIn === true ? <Navigate to="/u/dashboard" replace={true} /> : <Login />
            }
          />

          {/* Other public routes with Suspense */}
          {PublicRoutes.filter(
            (route) =>
              route.path !== "/auth/login" &&
              route.path !== "/login" &&
              route.path !== "/auth/loginsss"
          ).map(({ component: Component, ...route }) => (
            <Route
              key={`Route-${route.path}`}
              path={route.path}
              element={
                <Suspense fallback={<AppLoader visible={true} />}>
                  {isLoggedIn === true ? (
                    <Navigate to="/u/dashboard" replace={true} />
                  ) : (
                    <Component />
                  )}
                </Suspense>
              }
            />
          ))}

          {/* All the private routes */}
          {PrivateRoutes.map(({ component: Component, ...route }) => {
            console.log(`🛣️ Setting up route: ${route.path}`, {
              Component: Component?.name || "Unknown"
            })
            return (
              <Route
                key={`Route-${route.path}`}
                path={route.path}
                element={
                  <Suspense fallback={<AppLoader visible={true} />}>
                    <PrivateLayout isLoggedIn={isLoggedIn}>
                      {isLoggedIn !== true ? (
                        <Navigate to="/auth/login" replace={true} />
                      ) : (
                        <ErrorBoundary>
                          {console.log(`🔄 Rendering component for route: ${route.path}`)}
                          <Component />
                        </ErrorBoundary>
                      )}
                    </PrivateLayout>
                  </Suspense>
                }
              />
            )
          })}

          {/* 404 page route */}
          <Route path="*" element={<Error404 />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default Router
