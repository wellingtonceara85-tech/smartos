import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";

export async function getNextOsNumero(empresaId: string): Promise<number> {
  const counterDoc = doc(db, "contadores", empresaId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(counterDoc);
    const proximo = (snapshot.data()?.ultimoNumero ?? 0) + 1;
    transaction.set(counterDoc, { ultimoNumero: proximo });
    return proximo;
  });
}
