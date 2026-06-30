import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { OrdemServico } from "../types/ordemServico";

export function useOrdemServico(id: string | undefined) {
  const [ordem, setOrdem] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const snapshot = await getDoc(doc(db, "ordens", id));
      if (!snapshot.exists()) {
        setOrdem(null);
      } else {
        setOrdem({ id: snapshot.id, ...(snapshot.data() as Omit<OrdemServico, "id">) });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ordem, loading, error, reload };
}
