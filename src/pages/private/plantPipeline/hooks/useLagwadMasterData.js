import { useCallback, useEffect, useState } from "react";
import {
  fetchDispatchBatches,
  fetchSecondaryLocations,
  fetchTrays,
} from "../utils/pipelineApi";

/** Locations + trays + dispatch batches for direct lagwad wizard (shared by pipeline + analysis). */
export function useLagwadMasterData(enabled = true) {
  const [dispatchBatches, setDispatchBatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [trays, setTrays] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [batchList, locs, trayList] = await Promise.all([
        fetchDispatchBatches(),
        fetchSecondaryLocations(),
        fetchTrays(),
      ]);
      setDispatchBatches(Array.isArray(batchList) ? batchList : []);
      setLocations(locs);
      setTrays(trayList);
    } catch (e) {
      console.error(e);
      setDispatchBatches([]);
      setLocations([]);
      setTrays([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { dispatchBatches, locations, trays, loading, refresh };
}
