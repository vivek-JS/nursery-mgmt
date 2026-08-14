import React, { useCallback, useRef, useState } from "react"
import DuplicateInvoiceDialog from "./DuplicateInvoiceDialog"

/**
 * Returns a prompt(dispatch) → Promise<{ confirmed, rows }>
 * and the dialog element to mount once.
 */
export function useDuplicateInvoicePrompt() {
  const [open, setOpen] = useState(false)
  const [dispatch, setDispatch] = useState(null)
  const resolverRef = useRef(null)

  const close = useCallback((result) => {
    setOpen(false)
    setDispatch(null)
    const resolve = resolverRef.current
    resolverRef.current = null
    resolve?.(result)
  }, [])

  const prompt = useCallback((dispatchDoc) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDispatch(dispatchDoc || null)
      setOpen(true)
    })
  }, [])

  const dialog = (
    <DuplicateInvoiceDialog
      open={open}
      dispatch={dispatch}
      onClose={() => close({ confirmed: false, rows: [] })}
      onConfirm={(rows) => close({ confirmed: true, rows: rows || [] })}
    />
  )

  return { prompt, dialog }
}
