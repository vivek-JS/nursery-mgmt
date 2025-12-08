import React, { Suspense } from "react"
import { HashRouter, Route, Navigate, Routes } from "react-router-dom"
import { AuthContext } from "../auth/AuthContext"
import { PrivateRoutes, PublicRoutes } from "./routes"
import Error404 from "pages/Error404"
import AppLoader from "components/Loader/AppLoader"
import { useIsLoggedIn } from "hooks/state"

import PrivateLayout from "layout/privateLayout"

const Router = () => {
  const isLoggedIn = useIsLoggedIn()

  return (
    <AuthContext.Provider value={isLoggedIn}>
      <Suspense fallback={<AppLoader visible={true} />}>
        <HashRouter>
          <Routes>
            {/* All the public routes - MUST be before other routes */}
            {/* Public routes are accessible WITHOUT authentication - always render, no auth check */}
            {PublicRoutes.map(({ component: Component, allowWhenLoggedIn, ...route }) => {
              // For public farmer form routes, ALWAYS allow access - no conditions, no auth check
              // This ensures it works in production, incognito, mobile, first visit, etc.
              const isPublicFarmerRoute = route.path?.startsWith("/public/add-farmer")
              
              // Public farmer routes: UNCONDITIONAL access - always render, never redirect
              if (isPublicFarmerRoute) {
                return (
                  <Route
                    key={`Route-${route.path}`}
                    path={route.path}
                    element={<Component />}
                  />
                )
              }
              
              // Other public routes: check allowWhenLoggedIn flag
              return (
                <Route
                  key={`Route-${route.path}`}
                  path={route.path}
                  element={
                    // If route allows logged in users OR user is not logged in, show component
                    // Otherwise redirect to dashboard (for login/signup pages when already logged in)
                    allowWhenLoggedIn || !isLoggedIn ? (
                      <Component />
                    ) : (
                      <Navigate to="/u/dashboard" replace={true} />
                    )
                  }
                />
              )
            })}
            
            <Route path="/" element={<Navigate to="/u/dashboard" replace />} />

            {/* All the private routes */}
            {PrivateRoutes.map(({ component: Component, ...route }) => (
              <Route
                key={`Route-${route.path}`}
                element={<PrivateLayout isLoggedIn={isLoggedIn} />}>
                <Route
                  path={route.path}
                  element={
                    isLoggedIn !== true ? (
                      <Navigate to="/auth/login" replace={true} />
                    ) : (
                      <Component />
                    )
                  }
                />
              </Route>
            ))}

            {/* 404 page route */}
            <Route exact path="*" element={<Error404 />} />
          </Routes>
        </HashRouter>
      </Suspense>
    </AuthContext.Provider>
  )
}

export default Router
