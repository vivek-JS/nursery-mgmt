import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveBatchId } from "../utils/pipelineLabels";
import {
  fetchOutwards,
  fetchPrimaryDashboard,
  fetchSecondaryDashboard,
} from "../utils/pipelineApi";

export function usePlantPipeline(selectedBatchId) {
  const [outwards, setOutwards] = useState([]);
  const [primaryDashboard, setPrimaryDashboard] = useState({});
  const [secondaryDashboard, setSecondaryDashboard] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, priDash, secDash] = await Promise.all([
        fetchOutwards(),
        fetchPrimaryDashboard(7),
        fetchSecondaryDashboard(7),
      ]);
      setOutwards(Array.isArray(list) ? list : []);
      setPrimaryDashboard(priDash ?? {});
      setSecondaryDashboard(secDash ?? {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const batchDoc = useMemo(() => {
    if (!selectedBatchId) return null;
    return (
      outwards.find((o) => resolveBatchId(o) === String(selectedBatchId)) ?? null
    );
  }, [outwards, selectedBatchId]);

  const batchOptions = useMemo(
    () =>
      outwards.map((doc) => ({
        id: resolveBatchId(doc),
        doc,
      })),
    [outwards]
  );

  return {
    outwards,
    batchDoc,
    batchOptions,
    primaryDashboard,
    secondaryDashboard,
    loading,
    refresh,
  };
}
