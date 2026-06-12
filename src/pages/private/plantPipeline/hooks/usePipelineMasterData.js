import { useCallback, useEffect, useState } from "react";
import {
  fetchDispatchBatches,
  fetchLocations,
  fetchTrays,
} from "../utils/pipelineApi";

export function usePipelineMasterData() {
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [trays, setTrays] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [batchList, locs, trayList] = await Promise.all([
        fetchDispatchBatches(),
        fetchLocations(),
        fetchTrays(),
      ]);
      setBatches(Array.isArray(batchList) ? batchList : []);
      setLocations(locs);
      setTrays(trayList);
    } catch (e) {
      console.error(e);
      setBatches([]);
      setLocations([]);
      setTrays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { batches, locations, trays, loading, refreshMaster: refresh };
}
