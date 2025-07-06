import React from "react"
import { Provider } from "react-redux"
import AppRouter from "./router"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { defaultTheme } from "./themes/defaultTheme"

import { CookiesProvider } from "react-cookie"
import "./styles/global.scss"
import AppLoader from "components/Loader/AppLoader"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { SessionObserver } from "auth/Observer"
import { persistor, store } from "redux/store"
import { PersistGate } from "redux-persist/integration/react"
// import AuthDebugger from "components/AuthDebugger"

/**
 * @description Check if browser is Safar
 * @description It'll be usefull for web notifications
 */

if (window.safari) {
  // eslint-disable-next-line no-console
} else {
  // initializeFirebase();
}

function App() {
  const currentTheme = createTheme(defaultTheme)

  return (
    <CookiesProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider theme={currentTheme}>
            <AppLoader />

            <AppRouter />
            <ToastContainer />
            <SessionObserver />
            {/* <AuthDebugger /> */}
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </CookiesProvider>
  )
}

export default App
