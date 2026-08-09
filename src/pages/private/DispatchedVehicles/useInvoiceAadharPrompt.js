import React, { useCallback, useRef, useState } from "react";
import InvoiceAadharDialog from "./InvoiceAadharDialog";

export function useInvoiceAadharPrompt() {
  const resolverRef = useRef(null);
  const [dialogState, setDialogState] = useState({ open: false, dispatch: null });

  const prompt = useCallback((dispatch) => {
    if (!dispatch) return Promise.resolve({ confirmed: false, aadharByOrderId: {} });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({ open: true, dispatch });
    });
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState({ open: false, dispatch: null });
    resolverRef.current?.({ confirmed: false, aadharByOrderId: {} });
    resolverRef.current = null;
  }, []);

  const handleConfirm = useCallback((aadharByOrderId) => {
    setDialogState({ open: false, dispatch: null });
    resolverRef.current?.({ confirmed: true, aadharByOrderId: aadharByOrderId || {} });
    resolverRef.current = null;
  }, []);

  const dialog = (
    <InvoiceAadharDialog
      open={dialogState.open}
      dispatch={dialogState.dispatch}
      onConfirm={handleConfirm}
      onClose={closeDialog}
    />
  );

  return { prompt, dialog };
}
