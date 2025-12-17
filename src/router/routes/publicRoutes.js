// Export all the public routes
import React from "react"

const ForgotPassword = React.lazy(() => import("pages/public/forgot-password"))
const Login = React.lazy(() => import("pages/public/login"))
const SignUp = React.lazy(() => import("pages/public/signup"))
const ResetPassword = React.lazy(() => import("pages/public/reset-password"))
const HospitalOnboarding = React.lazy(() => import("components/Modals/HospitalOnboarding"))
const PublicAddFarmer = React.lazy(() => import("pages/public/add-farmer/PublicAddFarmer"))

export const PublicRoutes = [
  { path: "/auth/login", component: Login },
  { path: "/auth/loginsss", component: Login },
  { path: "/auth/signup", component: SignUp },
  { path: "/auth/forgot-password", component: ForgotPassword },
  { path: "/auth/reset-password/:id", component: ResetPassword },
  { path: "/HospitalOnboarding", component: HospitalOnboarding },
  // Public farmer form: accessible even when logged in
  { path: "/public/add-farmer/:slug", component: PublicAddFarmer, allowWhenLoggedIn: true }
]
