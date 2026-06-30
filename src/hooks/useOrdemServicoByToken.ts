import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { OrdemServico } from "../types/ordemServico";
import type { Empresa } from "../types/empresa";

export function useOrdemServicoByToken(token: string | undefined) {
  const [ordem, setOrdem] = useState<OrdemServico | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let active = true;
    setLoading(true);
    setNotFound(false);

    (async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, "ordens"), where("token", "==", token), limit(1)),
        );
        if (!active) return;

        if (snapshot.empty) {
          setNotFound(true);
          return;
        }

        const docSnapshot = snapshot.docs[0];
        const ordemData = { id: docSnapshot.id, ...(docSnapshot.data() as Omit<OrdemServico, "id">) };
        setOrdem(ordemData);

        const empresaSnap = await getDoc(doc(db, "empresas", ordemData.empresaId));
        if (active && empresaSnap.exists()) {
          setEmpresa({ id: empresaSnap.id, ...(empresaSnap.data() as Omit<Empresa, "id">) });
        }
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  return { ordem, empresa, loading, notFound };
}
