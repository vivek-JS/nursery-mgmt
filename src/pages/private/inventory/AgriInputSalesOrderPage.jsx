import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AGRI_HOME_PATH, AGRI_OPEN_ADD_ORDER_STATE } from "workspace/agriAccess"

/** Legacy path → Orders page with Ram Agri add-order modal. */
export default function AgriInputSalesOrderPage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(AGRI_HOME_PATH, { replace: true, state: AGRI_OPEN_ADD_ORDER_STATE })
  }, [navigate])

  return null
}
