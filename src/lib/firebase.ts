import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
} from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// experimentalAutoDetectLongPolling: contorna bloqueios de streaming (WebChannel) comuns
// em redes corporativas, antivírus e extensões de certificado digital.
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
export const storage = getStorage(app);

/**
 * Cria uma conta de login (Firebase Auth) para outro usuário sem afetar a sessão de quem está
 * chamando. O SDK client-side só mantém uma sessão ativa por instância de Auth — criar a conta
 * direto em `auth` deslogaria o admin. Por isso a criação acontece numa instância secundária do
 * app, descartada logo em seguida. Essa instância usa `inMemoryPersistence` propositalmente: a
 * persistência padrão (IndexedDB) é compartilhada por origem e pode fazer o SDK emitir eventos de
 * auth cruzados entre as duas instâncias no mesmo separador; em memória, a sessão nova nunca toca
 * o storage do navegador e não tem como interferir na sessão do admin. `onCreated` roda com o uid
 * já disponível, usando a instância primária de `db` (ainda autenticada como o admin) para gravar
 * o perfil em `usuarios/{uid}`; se `onCreated` falhar, a conta recém-criada é removida para não
 * deixar login órfão sem perfil.
 */
export async function createUsuarioAccount(
  email: string,
  password: string,
  onCreated: (uid: string) => Promise<void>,
): Promise<void> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    try {
      await onCreated(credential.user.uid);
    } catch (error) {
      await deleteUser(credential.user).catch(() => {});
      throw error;
    }
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
}
