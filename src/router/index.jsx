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
              // For public farmer form routes, always allow access (no redirect)
              const isPublicFarmerRoute = route.path?.startsWith("/public/add-farmer")
              
              return (
                <Route
                  key={`Route-${route.path}`}
                  path={route.path}
                  element={
                    // Public farmer routes: always accessible (mobile users, incognito, etc.)
                    // Other public routes: redirect to dashboard if logged in AND route doesn't allow logged in users
                    isPublicFarmerRoute || allowWhenLoggedIn || !isLoggedIn ? (
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
