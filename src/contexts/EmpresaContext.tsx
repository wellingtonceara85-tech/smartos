import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { EQUIPMENT_TYPES } from "../lib/equipmentTypes";

export type UserRole = "admin" | "analista";

interface EmpresaContextValue {
  empresaId: string | null;
  role: UserRole | null;
  prazoGarantiaDias: number;
  garantiaTexto: string;
  tiposEquipamento: string[];
  logoUrl: string | null;
  loading: boolean;
  reloadConfig: () => Promise<void>;
}

const EmpresaContext = createContext<EmpresaContextValue>({
  empresaId: null,
  role: null,
  prazoGarantiaDias: 90,
  garantiaTexto: "",
  tiposEquipamento: EQUIPMENT_TYPES,
  logoUrl: null,
  loading: true,
  reloadConfig: async () => {},
});

const PRAZO_GARANTIA_DEFAULT = 90;

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [prazoGarantiaDias, setPrazoGarantiaDias] = useState(PRAZO_GARANTIA_DEFAULT);
  const [garantiaTexto, setGarantiaTexto] = useState("");
  const [tiposEquipamento, setTiposEquipamento] = useState<string[]>(EQUIPMENT_TYPES);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ref para reloadConfig não fechar sobre um empresaId stale
  const empresaIdRef = useRef<string | null>(null);
  empresaIdRef.current = empresaId;

  function applyEmpresaSnap(data: Record<string, unknown> | undefined) {
    const prazo = data?.prazoGarantiaDias;
    setPrazoGarantiaDias(typeof prazo === "number" && prazo > 0 ? prazo : PRAZO_GARANTIA_DEFAULT);
    const tipos = data?.tiposEquipamento;
    setTiposEquipamento(Array.isArray(tipos) && tipos.length > 0 ? (tipos as string[]) : EQUIPMENT_TYPES);
    setLogoUrl(typeof data?.logoUrl === "string" ? data.logoUrl : null);
    setGarantiaTexto(typeof data?.garantiaTexto === "string" ? data.garantiaTexto : "");
  }

  const reloadConfig = useCallback(async () => {
    const eid = empresaIdRef.current;
    if (!eid) return;
    const snap = await getDoc(doc(db, "empresas", eid));
    applyEmpresaSnap(snap.data() as Record<string, unknown> | undefined);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setEmpresaId(null);
      setRole(null);
      setPrazoGarantiaDias(PRAZO_GARANTIA_DEFAULT);
      setGarantiaTexto("");
      setTiposEquipamento(EQUIPMENT_TYPES);
      setLogoUrl(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    getDoc(doc(db, "usuarios", user.uid))
      .then(async (snapshot) => {
        if (!active) return;
        const data = snapshot.data();

        if (data?.ativo === false) {
          // Usuário desativado por um administrador: encerra a sessão imediatamente.
          await signOut(auth);
          return;
        }

        const validEmpresaId = typeof data?.empresaId === "string" ? data.empresaId : null;
        setEmpresaId(validEmpresaId);
        setRole(data?.role === "analista" ? "analista" : validEmpresaId ? "admin" : null);

        if (validEmpresaId) {
          const empresaSnap = await getDoc(doc(db, "empresas", validEmpresaId));
          if (active) {
            applyEmpresaSnap(empresaSnap.data() as Record<string, unknown> | undefined);
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return (
    <EmpresaContext.Provider
      value={{ empresaId, role, prazoGarantiaDias, garantiaTexto, tiposEquipamento, logoUrl, loading, reloadConfig }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  return useContext(EmpresaContext);
}
