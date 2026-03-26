/**
 * Must use the same build as pickers from `@mui/x-date-pickers` (ESM root).
 * The `node/` CJS LocalizationProvider is a separate module file and creates a
 * different React context than DesktopDatePicker, so the provider is invisible.
 */
export { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
