import { Dates } from "helpers/app-dates/dates"
export const CookieKeys = {
  Auth: `${process.env.REACT_APP_APP_ENV || "dev"}:Auth-Token`,
  API_TOKEN: `${process.env.REACT_APP_APP_ENV || "dev"}:api-key`,
  REFRESH_TOKEN: `${process.env.REACT_APP_APP_ENV || "dev"}:Refresh-Token`
}

export const CookieOptions = {
  expires: Dates().addInCurrent(10, "days")._d,
  sameSite: "lax", // Changed from "strict" to "lax" for better compatibility
  path: "/",
  httpOnly: false, // Allow JavaScript access
  secure: false // Disable secure for localhost development
}
