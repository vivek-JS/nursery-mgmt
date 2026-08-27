import { useCallback, useEffect, useState } from "react";
import {
  fetchDispatchBatches,
  fetchLocations,
  fetchSecondaryLocations,
  fetchTrays,
} from "../utils/pipelineApi";

export function usePipelineMasterData() {
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [secondaryLocations, setSecondaryLocations] = useState([]);
  const [trays, setTrays] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [batchList, locs, secondaryLocs, trayList] = await Promise.all([
        fetchDispatchBatches(),
        fetchLocations(),
        fetchSecondaryLocations(),
        fetchTrays(),
      ]);
      setBatches(Array.isArray(batchList) ? batchList : []);
      setLocations(locs);
      setSecondaryLocations(secondaryLocs);
      setTrays(trayList);
    } catch (e) {
      console.error(e);
      setBatches([]);
      setLocations([]);
      setSecondaryLocations([]);
      setTrays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { batches, locations, secondaryLocations, trays, loading, refreshMaster: refresh };
}
