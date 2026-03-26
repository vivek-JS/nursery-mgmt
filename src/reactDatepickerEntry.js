/**
 * Load react-datepicker from the app entry so Webpack keeps it in the initial bundle.
 * Lazy routes that import the same package then reuse it and avoid ChunkLoadError when
 * a stale async vendor chunk URL 404s after HMR / dev-server restarts.
 */
import "react-datepicker/dist/react-datepicker.css"
import DatePicker from "react-datepicker"

export default DatePicker
