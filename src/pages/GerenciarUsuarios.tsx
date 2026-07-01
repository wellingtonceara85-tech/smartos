import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { AuthError } from "firebase/auth";
import { Check, Copy, RefreshCw } from "lucide-react";
import { createUsuarioAccount, db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { ConfirmModal } from "../components/os/ConfirmModal";
import { DataTable, type Column } from "../components/ui/DataTable";
import { useAuth } from "../contexts/AuthContext";
import { useEmpresa } from "../contexts/EmpresaContext";
import type { Usuario, UsuarioRole } from "../types/usuario";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

function gerarSenhaSegura(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => SENHA_CHARSET[b % SENHA_CHARSET.length]).join("");
}

interface InviteErrors {
  nome?: string;
  email?: string;
  senha?: string;
}

interface CredenciaisCriadas {
  nome: string;
  email: string;
  senha: string;
}

export function GerenciarUsuarios() {
  const { user } = useAuth();
  const { empresaId, role } = useEmpresa();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoRole, setNovoRole] = useState<UsuarioRole>("analista");
  const [inviteErrors, setInviteErrors] = useState<InviteErrors>({});
  const [inviteFormError, setInviteFormError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [credenciaisCriadas, setCredenciaisCriadas] = useState<CredenciaisCriadas | null>(null);
  const [emailCopiado, setEmailCopiado] = useState(false);
  const [senhaCopiada, setSenhaCopiada] = useState(false);

  const [usuarioParaDesativar, setUsuarioParaDesativar] = useState<Usuario | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!empresaId || role !== "admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setActionError("");
    getDocs(query(collection(db, "usuarios"), where("empresaId", "==", empresaId)))
      .then((snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Usuario, "id">),
        }));
        list.sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? ""));
        setUsuarios(list);
      })
      .catch(() => setActionError("Não foi possível carregar os usuários. Tente novamente."))
      .finally(() => setLoading(false));
  }, [empresaId, role]);

  if (role !== "admin") {
    return (
      <AppShell title="Gerenciar Usuários">
        <p className="text-sm text-slate-500">Acesso restrito a administradores.</p>
      </AppShell>
    );
  }

  function resetInviteForm() {
    setShowInviteModal(false);
    setNovoNome("");
    setNovoEmail("");
    setNovaSenha("");
    setNovoRole("analista");
    setInviteErrors({});
    setInviteFormError("");
    setCredenciaisCriadas(null);
    setEmailCopiado(false);
    setSenhaCopiada(false);
  }

  function validateInvite(): InviteErrors {
    const next: InviteErrors = {};
    if (!novoNome.trim()) next.nome = "Preencha o nome do usuário.";
    if (!novoEmail.trim() || !EMAIL_REGEX.test(novoEmail)) {
      next.email = "Informe um e-mail válido.";
    } else if (usuarios.some((u) => u.email.toLowerCase() === novoEmail.trim().toLowerCase())) {
      next.email = "Já existe um usuário com este e-mail.";
    }
    if (!novaSenha || novaSenha.length < 6) {
      next.senha = "A senha deve ter no mínimo 6 caracteres.";
    }
    return next;
  }

  function getInviteAuthErrorMessage(error: AuthError): string {
    if (error.code === "auth/email-already-in-use") {
      return "Este e-mail já possui uma conta no SmartOS.";
    }
    if (error.code === "auth/weak-password") {
      return "Senha muito fraca. Use ao menos 6 caracteres.";
    }
    if (error.code === "auth/network-request-failed") {
      return "Sem conexão. Verifique sua internet.";
    }
    return "Não foi possível criar o usuário. Tente novamente.";
  }

  async function handleInvite() {
    setInviteFormError("");
    const validationErrors = validateInvite();
    setInviteErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    if (!empresaId) return;

    const nome = novoNome.trim();
    const email = novoEmail.trim();
    const role = novoRole;

    setInviting(true);
    try {
      await createUsuarioAccount(email, novaSenha, async (uid) => {
        await setDoc(doc(db, "usuarios", uid), {
          nome,
          email,
          role,
          empresaId,
          ativo: true,
          criadoEm: serverTimestamp(),
        });
        setUsuarios((prev) =>
          [...prev, { id: uid, nome, email, role, empresaId, ativo: true } as Usuario].sort(
            (a, b) => (a.nome ?? "").localeCompare(b.nome ?? ""),
          ),
        );
      });
      setCredenciaisCriadas({ nome, email, senha: novaSenha });
    } catch (error) {
      setInviteFormError(getInviteAuthErrorMessage(error as AuthError));
    } finally {
      setInviting(false);
    }
  }

  async function copiarParaAreaDeTransferencia(texto: string, marcarCopiado: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(texto);
      marcarCopiado(true);
      setTimeout(() => marcarCopiado(false), 2000);
    } catch {
      // Clipboard indisponível (permissão negada, contexto não seguro etc.) — o texto continua
      // visível e selecionável no campo, então o admin ainda consegue copiar manualmente.
    }
  }

  async function handleRoleChange(usuario: Usuario, novoRole: UsuarioRole) {
    if (usuario.id === user?.uid) return;
    setActionError("");
    try {
      await updateDoc(doc(db, "usuarios", usuario.id), { role: novoRole });
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, role: novoRole } : u)),
      );
    } catch {
      setActionError("Não foi possível alterar o perfil. Tente novamente.");
    }
  }

  async function handleAtivar(usuario: Usuario) {
    setActionError("");
    try {
      await updateDoc(doc(db, "usuarios", usuario.id), { ativo: true });
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, ativo: true } : u)),
      );
    } catch {
      setActionError("Não foi possível ativar o usuário. Tente novamente.");
    }
  }

  async function handleDesativar() {
    if (!usuarioParaDesativar) return;
    setActionError("");
    await updateDoc(doc(db, "usuarios", usuarioParaDesativar.id), { ativo: false });
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioParaDesativar.id ? { ...u, ativo: false } : u)),
    );
    setUsuarioParaDesativar(null);
  }

  const colunas: Column<Usuario>[] = [
    {
      header: "Nome",
      render: (u) => <span className="font-medium text-slate-900">{u.nome}</span>,
    },
    {
      header: "E-mail",
      render: (u) => <span className="text-slate-600">{u.email}</span>,
    },
    {
      header: "Perfil",
      render: (u) =>
        u.id === user?.uid ? (
          <Badge label={u.role === "admin" ? "Administrador" : "Analista"} variant="info" />
        ) : (
          <select
            value={u.role}
            onChange={(e) => handleRoleChange(u, e.target.value as UsuarioRole)}
            className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-900 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          >
            <option value="admin">Administrador</option>
            <option value="analista">Analista</option>
          </select>
        ),
    },
    {
      header: "Status",
      render: (u) =>
        u.ativo !== false ? (
          <Badge label="Ativo" variant="success" />
        ) : (
          <Badge label="Inativo" variant="neutral" />
        ),
    },
    {
      header: "Ações",
      render: (u) =>
        u.id === user?.uid ? (
          <span className="text-xs text-slate-400">Você</span>
        ) : u.ativo !== false ? (
          <Button variant="ghost" onClick={() => setUsuarioParaDesativar(u)}>
            Desativar
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => handleAtivar(u)}>
            Ativar
          </Button>
        ),
    },
  ];

  return (
    <AppShell title="Gerenciar Usuários">
      <div className="max-w-4xl space-y-4">
        {actionError && (
          <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">{actionError}</p>
        )}

        <div className="flex justify-end">
          <Button onClick={() => setShowInviteModal(true)}>Criar Usuário</Button>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-slate-200" />
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum usuário cadastrado.</p>
        ) : (
          <DataTable columns={colunas} rows={usuarios} keyExtractor={(u) => u.id} />
        )}
      </div>

      {showInviteModal && (
        <Modal
          title="Criar Usuário"
          onClose={resetInviteForm}
          footer={
            credenciaisCriadas ? (
              <Button onClick={resetInviteForm}>Concluir</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={resetInviteForm} disabled={inviting}>
                  Cancelar
                </Button>
                <Button onClick={handleInvite} loading={inviting}>
                  Criar
                </Button>
              </>
            )
          }
        >
          {credenciaisCriadas ? (
            <div className="space-y-4">
              <p className="rounded-md bg-[#16A34A]/10 px-4 py-3 text-sm text-[#15803D]">
                Usuário <strong>{credenciaisCriadas.nome}</strong> criado com sucesso. Compartilhe as
                credenciais abaixo com ele — a senha não poderá ser visualizada novamente depois de
                fechar esta janela.
              </p>

              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-slate-700">E-mail</span>
                <div className="flex items-center gap-2">
                  <code className="h-9.5 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm leading-9.5 text-slate-900">
                    {credenciaisCriadas.email}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => copiarParaAreaDeTransferencia(credenciaisCriadas.email, setEmailCopiado)}
                    aria-label="Copiar e-mail"
                  >
                    {emailCopiado ? <Check size={16} className="text-[#16A34A]" /> : <Copy size={16} />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-slate-700">Senha</span>
                <div className="flex items-center gap-2">
                  <code className="h-9.5 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm leading-9.5 text-slate-900">
                    {credenciaisCriadas.senha}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => copiarParaAreaDeTransferencia(credenciaisCriadas.senha, setSenhaCopiada)}
                    aria-label="Copiar senha"
                  >
                    {senhaCopiada ? <Check size={16} className="text-[#16A34A]" /> : <Copy size={16} />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                id="convite-nome"
                label="Nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                error={inviteErrors.nome}
                disabled={inviting}
              />
              <Input
                id="convite-email"
                label="E-mail"
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                error={inviteErrors.email}
                disabled={inviting}
                autoComplete="off"
              />
              <div className="flex flex-col gap-1.5">
                <Input
                  id="convite-senha"
                  label="Senha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  error={inviteErrors.senha}
                  disabled={inviting}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setNovaSenha(gerarSenhaSegura())}
                  disabled={inviting}
                  className="flex w-fit items-center gap-1 self-end text-xs font-medium text-[#2563EB] hover:underline disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  Gerar senha segura
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="convite-perfil" className="text-[13px] font-medium text-slate-700">
                  Perfil
                </label>
                <select
                  id="convite-perfil"
                  value={novoRole}
                  onChange={(e) => setNovoRole(e.target.value as UsuarioRole)}
                  disabled={inviting}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                >
                  <option value="admin">Administrador</option>
                  <option value="analista">Analista</option>
                </select>
              </div>
              {inviteFormError && (
                <p className="text-sm text-[#DC2626]">{inviteFormError}</p>
              )}
            </div>
          )}
        </Modal>
      )}

      {usuarioParaDesativar && (
        <ConfirmModal
          title="Desativar Usuário"
          message={`Tem certeza que deseja desativar "${usuarioParaDesativar.nome}"? Ele não conseguirá mais acessar o sistema, mas seus dados serão preservados.`}
          confirmLabel="Desativar"
          onClose={() => setUsuarioParaDesativar(null)}
          onConfirm={handleDesativar}
        />
      )}
    </AppShell>
  );
}
