import React, { useCallback, useState } from "react"
import { useIsSuperAdmin, useIsOfficeAdmin } from "utils/roleUtils"
import SlotStockPanel from "./SlotStockPanel"
import SlotExcessAssignDialog from "./SlotExcessAssignDialog"
import SlotToSlotTransferDialog from "./SlotToSlotTransferDialog"
import OrderCoverTransferDialog from "../order-cover-transfer/OrderCoverTransferDialog"

export default function SlotStockBoard({ refreshToken = 0, onLoaded, onRefresh }) {
  const isSuperAdmin = useIsSuperAdmin()
  const isOfficeAdmin = useIsOfficeAdmin()
  const canAssign = isSuperAdmin || isOfficeAdmin

  const [assignCtx, setAssignCtx] = useState(null)
  const [transferCtx, setTransferCtx] = useState(null)
  const [coverCtx, setCoverCtx] = useState(null)
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)

  const handleDone = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  return (
    <>
      <SlotStockPanel
        refreshToken={refreshToken}
        canAssign={canAssign}
        onLoaded={onLoaded}
        onAssign={setAssignCtx}
        onSlotTransfer={setTransferCtx}
        onCoverOrder={setCoverCtx}
        onOpenCoverPicker={() => setCoverPickerOpen(true)}
      />

      <SlotExcessAssignDialog
        open={Boolean(assignCtx?.slotId)}
        slotId={assignCtx?.slotId}
        slotLabel={assignCtx?.slotLabel}
        availablePlants={assignCtx?.availablePlants}
        onClose={() => setAssignCtx(null)}
        onDone={handleDone}
      />

      <SlotToSlotTransferDialog
        open={Boolean(transferCtx?.slotId)}
        slotId={transferCtx?.slotId}
        slotLabel={transferCtx?.slotLabel}
        mode={transferCtx?.mode || "out"}
        onClose={() => setTransferCtx(null)}
        onDone={handleDone}
      />

      <OrderCoverTransferDialog
        open={coverPickerOpen || Boolean(coverCtx?.orderMongoId)}
        initialOrderMongoId={coverCtx?.orderMongoId}
        initialPlantId={coverCtx?.plantId}
        initialSubtypeId={coverCtx?.subtypeId}
        onClose={() => {
          setCoverPickerOpen(false)
          setCoverCtx(null)
        }}
        onDone={handleDone}
      />
    </>
  )
}
