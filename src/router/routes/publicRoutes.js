// Export all the public routes
import React from "react"

const ForgotPassword = React.lazy(() => import("pages/public/forgot-password"))
const Login = React.lazy(() => import("pages/public/login"))
const SignUp = React.lazy(() => import("pages/public/signup"))
const ResetPassword = React.lazy(() => import("pages/public/reset-password"))
const HospitalOnboarding = React.lazy(() => import("components/Modals/HospitalOnboarding"))
const PublicAddFarmer = React.lazy(() => import("pages/public/add-farmer/PublicAddFarmer"))
const CallListMobile = React.lazy(() => import("pages/public/CallListMobile"))
const RateApprovalPage = React.lazy(() => import("pages/public/RateApprovalPage"))
const AgriLoadPage = React.lazy(() => import("pages/public/AgriLoadPage"))
const LagwadPreview = React.lazy(() => import("pages/public/__LagwadPreview"))

export const PublicRoutes = [
  { path: "/auth/login", component: Login },
  { path: "/auth/loginsss", component: Login },
  { path: "/auth/signup", component: SignUp },
  { path: "/auth/forgot-password", component: ForgotPassword },
  { path: "/auth/reset-password/:id", component: ResetPassword },
  { path: "/HospitalOnboarding", component: HospitalOnboarding },
  // Public farmer form: accessible even when logged in
  { path: "/public/add-farmer/:slug", component: PublicAddFarmer, allowWhenLoggedIn: true },
  // Call list mobile page: token-based, no login required
  { path: "/call-list/:id/:token", component: CallListMobile, allowWhenLoggedIn: true },
  // Rate change approval page: WhatsApp link with token + phone, accessible without login
  { path: "/rate-approval", component: RateApprovalPage, allowWhenLoggedIn: true },
  // Agri load mark-loaded page: WhatsApp one-click link, auto-marks order as LOADED
  { path: "/agri-load", component: AgriLoadPage, allowWhenLoggedIn: true },
  { path: "/__lagwad-preview", component: LagwadPreview, allowWhenLoggedIn: true },
]
