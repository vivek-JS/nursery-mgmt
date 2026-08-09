import { useCallback, useEffect, useState } from "react";
import {
  emptyGiftDraftLine,
  fetchGiftProductsInStock,
  fetchLinkedGiftDraftsForOrder,
} from "utils/dispatchOrderGifts";

export function useDispatchOrderGifts({ open, orderKeys = [] }) {
  const [giftCatalog, setGiftCatalog] = useState([]);
  const [giftDraftsByOrder, setGiftDraftsByOrder] = useState(() => new Map());
  const [giftsLoading, setGiftsLoading] = useState(false);
  const orderKeysKey = orderKeys.join("|");

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        setGiftsLoading(true);
        const products = await fetchGiftProductsInStock();
        if (mounted) setGiftCatalog(products);
      } catch {
        if (mounted) setGiftCatalog([]);
      } finally {
        if (mounted) setGiftsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setGiftDraftsByOrder(new Map());
      return;
    }

    const keys = orderKeys.filter(Boolean);
    if (!keys.length) {
      setGiftDraftsByOrder(new Map());
      return;
    }

    let mounted = true;
    (async () => {
      setGiftsLoading(true);
      try {
        const entries = await Promise.all(
          keys.map(async (key) => {
            const existing = await fetchLinkedGiftDraftsForOrder(key);
            return [key, existing];
          })
        );
        if (!mounted) return;
        setGiftDraftsByOrder((prev) => {
          const next = new Map();
          for (const [key, existing] of entries) {
            const pendingNew = (prev.get(key) || []).filter(
              (row) => !row.readOnly && !row.linkedAgriOrderId
            );
            next.set(key, [...existing, ...pendingNew]);
          }
          return next;
        });
      } finally {
        if (mounted) setGiftsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, orderKeysKey]);

  const getLinesForOrder = useCallback(
    (orderKey) => giftDraftsByOrder.get(String(orderKey)) || [],
    [giftDraftsByOrder]
  );

  const addGiftLine = useCallback((orderKey) => {
    const key = String(orderKey);
    setGiftDraftsByOrder((prev) => {
      const next = new Map(prev);
      next.set(key, [...(next.get(key) || []), emptyGiftDraftLine()]);
      return next;
    });
  }, []);

  const updateGiftLine = useCallback((orderKey, localId, patch) => {
    const key = String(orderKey);
    setGiftDraftsByOrder((prev) => {
      const next = new Map(prev);
      const rows = (next.get(key) || []).map((row) =>
        row.localId === localId ? { ...row, ...patch } : row
      );
      next.set(key, rows);
      return next;
    });
  }, []);

  const removeGiftLine = useCallback((orderKey, localId) => {
    const key = String(orderKey);
    setGiftDraftsByOrder((prev) => {
      const next = new Map(prev);
      next.set(
        key,
        (next.get(key) || []).filter((row) => row.localId !== localId || row.readOnly)
      );
      return next;
    });
  }, []);

  return {
    giftCatalog,
    giftDraftsByOrder,
    giftsLoading,
    getLinesForOrder,
    addGiftLine,
    updateGiftLine,
    removeGiftLine,
  };
}
