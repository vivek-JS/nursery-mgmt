/**
 * @description Per-route abort: starting a new request for the same key aborts the previous in-flight request.
 */

const controllers = new Map()

function abortKeyForRouter(router) {
  if (!router) return "__default__"
  const version = router.version != null ? String(router.version) : ""
  const base = router.baseURL != null ? String(router.baseURL) : ""
  const core = `${router.method}|${base}|${router.endpoint}|${version}`
  const scope =
    router.__abortScope != null && String(router.__abortScope).trim() !== ""
      ? String(router.__abortScope).trim()
      : ""
  return scope ? `${core}::${scope}` : core
}

export const APIAborter = {
  /** Abort any in-flight request for this key, then return a fresh AbortController. */
  initiate(routerOrKey) {
    const key =
      typeof routerOrKey === "string" ? routerOrKey : abortKeyForRouter(routerOrKey)
    const prev = controllers.get(key)
    if (prev) {
      try {
        prev.abort()
      } catch (_) {
        /* noop */
      }
    }
    const controller = new AbortController()
    controllers.set(key, controller)
    return controller
  },
  abort(routerOrKey) {
    const key =
      typeof routerOrKey === "string" ? routerOrKey : abortKeyForRouter(routerOrKey)
    const c = controllers.get(key)
    if (c) {
      try {
        c.abort()
      } catch (_) {
        /* noop */
      }
    }
  },
}
