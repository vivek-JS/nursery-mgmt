import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useSelector } from "react-redux"
import {
  WORKSPACE_AGRI,
  WORKSPACE_BIOTECH,
  WORKSPACE_STORAGE_KEY,
  isAgriLockedRole,
  canUseWorkspaceSwitch,
} from "./agriAccess"

const WorkspaceContext = createContext(null)

function readStoredMode() {
  try {
    const v = localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (v === WORKSPACE_AGRI || v === WORKSPACE_BIOTECH) return v
  } catch {
    /* ignore */
  }
  return WORKSPACE_BIOTECH
}

export function WorkspaceProvider({ children }) {
  const userData = useSelector((state) => state?.userData?.userData)
  const locked = isAgriLockedRole(userData)
  const canSwitch = canUseWorkspaceSwitch(userData)

  const [mode, setModeState] = useState(() =>
    locked ? WORKSPACE_AGRI : readStoredMode()
  )

  useEffect(() => {
    if (locked) {
      setModeState(WORKSPACE_AGRI)
      try {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, WORKSPACE_AGRI)
      } catch {
        /* ignore */
      }
    }
  }, [locked])

  const setMode = useCallback(
    (next) => {
      if (locked) return
      if (!canSwitch && next === WORKSPACE_AGRI) return
      const value = next === WORKSPACE_AGRI ? WORKSPACE_AGRI : WORKSPACE_BIOTECH
      setModeState(value)
      try {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, value)
      } catch {
        /* ignore */
      }
    },
    [locked, canSwitch]
  )

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isAgriMode: mode === WORKSPACE_AGRI,
      isBiotechMode: mode === WORKSPACE_BIOTECH,
      canSwitch: canSwitch && !locked,
      isAgriLocked: locked,
    }),
    [mode, setMode, canSwitch, locked]
  )

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    return {
      mode: WORKSPACE_BIOTECH,
      setMode: () => {},
      isAgriMode: false,
      isBiotechMode: true,
      canSwitch: false,
      isAgriLocked: false,
    }
  }
  return ctx
}
